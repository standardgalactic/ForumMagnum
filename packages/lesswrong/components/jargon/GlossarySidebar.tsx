import React, { useRef } from 'react';
import { Components, registerComponent } from '@/lib/vulcan-lib/components';
import { useCurrentUser } from '../common/withUser';
import { userCanViewJargonTerms } from '@/lib/betas';
import { useGlobalKeydown } from '../common/withGlobalKeydown';
import classNames from 'classnames';
import { sidenotesHiddenBreakpoint } from '../posts/PostsPage/PostsPage';
import { useJargonCounts } from '@/components/hooks/useJargonCounts';
import { jargonTermsToTextReplacements } from './JargonTooltip';
import { useTracking } from '@/lib/analyticsEvents';
import { useGlossaryPinnedState } from '../hooks/useUpdateGlossaryPinnedState';

const styles = (theme: ThemeType) => ({
  glossaryAnchor: {
    // HACK: If there is a footnote on the first line, because the footnote
    // anchor is in superscripted text, its position, for purposes of sidenote
    // ordering, will be above the top of the post body; but we want the
    // glossary side-item to be above the footnote side-item in this case.
    // So put the anchor for the glossary sidebar higher than the supercript
    // would be, and cancel it out with marginTop on glossaryContainer.
    position: "relative",
    top: -30,
  },
  jargonTerm: {
    paddingTop: 2,
    ...theme.typography.body2,
    ...theme.typography.postStyle,
    fontSize: "1.1rem",
    color: theme.palette.grey[800],
    cursor: 'pointer',
    textTransform: 'capitalize',
  },
  glossaryContainer: {
    [theme.breakpoints.down('sm')]: {
      display: 'none',
    },
    padding: 12,
    borderRadius: 3,
    maxHeight: 170,
    width: 'fit-content',
    overflow: 'hidden',

    "&:hover": {
      maxHeight: 'unset',
      // Show the pin icon when hovering over the glossary container
      "& $pinIcon, & $pinnedPinIcon": {
        opacity: .8,
      },
    },

    // Hide the overflow fade when hovering over the glossary container
    // This only works if the overflow fade is a sibling to the glossary container, and comes after it
    "&:hover + $overflowFade": {
      opacity: 0,
    },
  },
  glossaryContainerClickTarget: {
    cursor: 'pointer',
  },
  outerContainer: {
    height: 0,
  },
  innerContainer: {
    height: 'var(--sidebar-column-remaining-height)',
  },
  displayedHeightGlossaryContainer: {
    [sidenotesHiddenBreakpoint(theme)]: {
      display: "none",
    },
    paddingTop: 30,
    paddingBottom: 20,
    // Hide other side items behind the glossary sidebar when it's pinned and we're scrolling down
    backgroundColor: theme.palette.background.pageActiveAreaBackground,
    zIndex: 1,
  },
  pinnedGlossaryContainer: {
    position: 'sticky',
    top: 100,
    '& $pinIcon': {
      opacity: .5
    },
    '& $pinnedPinIcon': {
      opacity: .85,
    },
  },
  titleRow: {
    display: 'flex',
  },
  titleRowTooltipPopper: {
    marginBottom: 12,
  },
  title: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    ...theme.typography.body2,
    ...theme.typography.postStyle,
  },
  pinIcon: {
    fontSize: 18,
    marginLeft: 6,
    marginTop: -1,
    cursor: 'pointer',
    color: theme.palette.grey[600],
    // icon should be semi-transparent by default, escalatingly visible when hovering over the glossary container or over itself, directly
    opacity: .4,
    '&:hover': {
      opacity: .7,
    }
  },
  pinnedPinIcon: {
    display: 'block',
    color: theme.palette.grey[900],
    opacity: .85,
    '&:hover': {
      opacity: 1,
    }
  },
  termTooltip: {
    marginRight: 5,
  },
  overflowFade: {
    position: "absolute",
    top: 160,
    height: 40,
    width: "100%",
    background: `linear-gradient(0deg,${theme.palette.background.pageActiveAreaBackground},transparent)`,
    opacity: 1,
    pointerEvents: 'none',
  },
  unapproved: {
    color: theme.palette.grey[400],
  },
  showAllTermsButton: {
    marginTop: 10,
    cursor: 'pointer',
    fontSize: '1rem',
    ...theme.typography.commentStyle,
    color: theme.palette.grey[400],
  },
  showAllTermsTooltipPopper: {
    maxWidth: 200,
  },
})

const GlossarySidebar = ({post, showAllTerms, setShowAllTerms, classes}: {
  post: PostsWithNavigationAndRevision | PostsWithNavigation,
  showAllTerms: boolean,
  setShowAllTerms: (e: React.MouseEvent, showAllTerms: boolean, source: string) => void,
  classes: ClassesType<typeof styles>,
}) => {
  const { SideItem, JargonTooltip, LWTooltip, ForumIcon } = Components;

  const { captureEvent } = useTracking();
  const { postGlossariesPinned, togglePin } = useGlossaryPinnedState();

  const currentUser = useCurrentUser();
  const glossaryContainerRef = useRef<HTMLDivElement>(null);

  useGlobalKeydown((e) => {
    const J_KeyCode = 74;
    if (e.altKey && e.shiftKey && e.keyCode === J_KeyCode) {
      e.preventDefault();
      void togglePin('hotkey');
    }
  });

  const { sortedTerms } = useJargonCounts(post, post.glossary);

  const approvedTerms = sortedTerms.filter(term => term.approved);
  const unapprovedTerms = sortedTerms.filter(term => !term.approved && !term.deleted);
  const deletedTerms = sortedTerms.filter(term => term.deleted);

  if (!post) {
    return null;
  }

  if (!userCanViewJargonTerms(currentUser)) {
    return null;
  }

  const tooltip = <div>{postGlossariesPinned ? 'Unpin to only highlight the first instance of each term.' : 'Pin to highlight every instance of a term.'}
    <div><em>(Opt/Alt + Shift + J)</em></div></div>;

  const titleRow = (
    <LWTooltip
      title={tooltip}
      inlineBlock={false}
      placement='top-end'
      popperClassName={classes.titleRowTooltipPopper}
    >
      <div className={classes.titleRow}>
        <h3 className={classes.title}>
          <strong>Glossary</strong>
          <ForumIcon icon="Dictionary" className={classNames(classes.pinIcon, postGlossariesPinned && classes.pinnedPinIcon)} />
        </h3>
      </div>
    </LWTooltip>
  )
  

  const replacedSubstrings = jargonTermsToTextReplacements(sortedTerms);

  const approvedGlossaryItems = approvedTerms.map((jargonTerm) => {
    return (<div key={jargonTerm._id + jargonTerm.term}>
      <JargonTooltip
        term={jargonTerm.term}
        definitionHTML={jargonTerm.contents?.html ?? ''}
        altTerms={jargonTerm.altTerms}
        humansAndOrAIEdited={jargonTerm.humansAndOrAIEdited}
        approved={jargonTerm.approved}
        deleted={jargonTerm.deleted}
        placement="left-start"
        tooltipTitleClassName={classes.termTooltip}
        replacedSubstrings={replacedSubstrings}
        // The terms in the glossary should always have tooltips
        isFirstOccurrence
      >
        <div className={classNames(classes.jargonTerm, !jargonTerm.approved && classes.unapproved)}>{jargonTerm.term}</div>
      </JargonTooltip>
    </div>);
  });

  const otherGlossaryItems = showAllTerms ? [...unapprovedTerms, ...deletedTerms].map((jargonTerm) => {
    return (<div key={jargonTerm._id + jargonTerm.term}>
      <JargonTooltip
        term={jargonTerm.term}
        definitionHTML={jargonTerm.contents?.html ?? ''}
        altTerms={jargonTerm.altTerms}
        humansAndOrAIEdited={jargonTerm.humansAndOrAIEdited}
        approved={jargonTerm.approved}
        deleted={jargonTerm.deleted}
        placement="left-start"
        tooltipTitleClassName={classes.termTooltip}
        // The terms in the glossary should always have tooltips
        isFirstOccurrence
        replacedSubstrings={replacedSubstrings}
      >
        <div className={classNames(classes.jargonTerm, !jargonTerm.approved && classes.unapproved)}>{jargonTerm.term}</div>
      </JargonTooltip>
    </div>);
  }) : null;

  const showAllTermsTooltip = <div><div>{`Click to ${showAllTerms ? 'hide' : 'show'} hidden AI slop the author doesn't necessarily endorse.`}</div><div><em>(Opt/Alt + Shift + G)</em></div></div>;
  const showAllTermsButton = <LWTooltip
    title={showAllTermsTooltip}
    inlineBlock={false}
    placement='right-end'
    popperClassName={classes.showAllTermsTooltipPopper}
  >
    <div className={classes.showAllTermsButton} onClick={(e) => setShowAllTerms(e, !showAllTerms, 'showAllTermsButton')}>
      {showAllTerms ? 'Hide Unapproved' : 'Show Unapproved'}
    </div>
  </LWTooltip>;

  return <div className={classes.glossaryAnchor}><SideItem options={{ format: 'block', offsetTop: -10, measuredElement: glossaryContainerRef }}>
    <div className={classNames(postGlossariesPinned && classes.outerContainer)}>
      <div className={classNames(postGlossariesPinned && classes.innerContainer)}>
        <div className={classNames(classes.displayedHeightGlossaryContainer, postGlossariesPinned && classes.pinnedGlossaryContainer)} ref={glossaryContainerRef}>
          <div className={classNames(classes.glossaryContainer, currentUser && classes.glossaryContainerClickTarget)} onClick={() => togglePin('clickGlossaryContainer')}>
            {titleRow}
            {approvedGlossaryItems}
            {otherGlossaryItems}
            {showAllTermsButton}
          </div>
          <div className={classes.overflowFade} />
        </div>
      </div>
    </div>
  </SideItem></div>
}

const GlossarySidebarComponent = registerComponent('GlossarySidebar', GlossarySidebar, {styles});

declare global {
  interface ComponentTypes {
    GlossarySidebar: typeof GlossarySidebarComponent
  }
}
