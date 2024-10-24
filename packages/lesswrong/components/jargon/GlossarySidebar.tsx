import React, { useRef, useState } from 'react';
import { Components, registerComponent } from '@/lib/vulcan-lib/components';
import { jargonTermsToTextReplacements } from './JargonTooltip';
import { useCurrentUser } from '../common/withUser';
import { userCanViewJargonTerms } from '@/lib/betas';
import { ContentReplacementMode } from '../common/ContentItemBody';
import { useGlobalKeydown } from '../common/withGlobalKeydown';
import classNames from 'classnames';

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
    cursor: 'pointer'
  },
  glossaryContainer: {
    [theme.breakpoints.down('sm')]: {
      display: 'none',
    },
    padding: 12,
    borderRadius: 3,
    cursor: 'pointer',

    "&:hover": {
      background: theme.palette.background.glossaryBackground,
      // Show the pin icon when hovering over the glossary container
      "& $pinIcon": {
        display: 'block',
      }
    },
  },
  outerContainer: {
    height: 0,
  },
  innerContainer: {
    height: 'var(--sidebar-column-remaining-height)',
  },
  displayedHeightGlossaryContainer: {
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
      color: theme.palette.grey[800],
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
    ...theme.typography.body2,
    ...theme.typography.postStyle,
  },
  pinIcon: {
    width: 10,
    paddingBottom: 4,
    marginRight: 6,
    color: theme.palette.grey[600],
    // Hide the pin icon by default, show it when hovering over the glossary container
    display: 'none',
  },
  termTooltip: {
    marginRight: 5,
  },
  toggleCollapseContainer: {
    paddingTop: 4,
    paddingLeft: 12,
  },
  toggleCollapseButton: {
    ...theme.typography.body2,
    ...theme.typography.commentStyle,
    color: theme.palette.lwTertiary.main,
  }
})

const GlossarySidebar = ({post, postGlossariesPinned, togglePin, classes}: {
  post: PostsDetails|PostsListWithVotes,
  postGlossariesPinned: boolean,
  togglePin: () => void,
  classes: ClassesType<typeof styles>,
}) => {
  const { SideItem, JargonTooltip, LWTooltip, ForumIcon } = Components;

  const [collapsed, setCollapsed] = useState('glossary' in post && post.glossary.length > 10);

  const currentUser = useCurrentUser();
  const glossaryContainerRef = useRef<HTMLDivElement>(null);

  const jargonReplacementMode: ContentReplacementMode = postGlossariesPinned ? 'all' : 'first';

  useGlobalKeydown((e) => {
    const J_KeyCode = 74;
    if (e.altKey && e.shiftKey && e.keyCode === J_KeyCode) {
      togglePin();
    }
  });

  if (!post || !('glossary' in post) || !post.glossary?.length) {
    return null;
  }

  if (!userCanViewJargonTerms(currentUser)) {
    return null;
  }

  const displayGlossary = collapsed ? post.glossary.slice(0, 10) : post.glossary;

  const tooltip = <div><p>Pin to highlight every term. (Opt/Alt + Shift + J)</p></div>;
  const titleRow = (
    <LWTooltip
      title={tooltip}
      inlineBlock={false}
      placement='top-end'
      popperClassName={classes.titleRowTooltipPopper}
    >
      <div className={classes.titleRow}>
        <h3 className={classes.title}>Glossary</h3>
        <ForumIcon icon='Pin' className={classes.pinIcon} />
      </div>
    </LWTooltip>
  );

  const glossaryItems = displayGlossary.map((jargonTerm: JargonTermsPost) => {
    const replacedSubstrings = jargonTermsToTextReplacements(post.glossary, jargonReplacementMode);
    return (<div key={jargonTerm.term}>
      <JargonTooltip
        term={jargonTerm.term}
        definitionHTML={jargonTerm.contents?.html ?? ''}
        altTerms={jargonTerm.altTerms}
        humansAndOrAIEdited={jargonTerm.humansAndOrAIEdited}
        replacedSubstrings={replacedSubstrings}
        placement="left-start"
        tooltipTitleClassName={classes.termTooltip}
        // The terms in the glossary should always have tooltips
        isFirstOccurrence
      >
        <div className={classes.jargonTerm}>{jargonTerm.term}</div>
      </JargonTooltip>
    </div>);
  });

  return <div className={classes.glossaryAnchor}><SideItem options={{ format: 'block', offsetTop: 0, measuredElement: glossaryContainerRef }}>
    <div className={classNames(postGlossariesPinned && classes.outerContainer)}>
      <div className={classNames(postGlossariesPinned && classes.innerContainer)}>
        <div className={classNames(classes.displayedHeightGlossaryContainer, postGlossariesPinned && classes.pinnedGlossaryContainer)} ref={glossaryContainerRef}>
          <div className={classes.glossaryContainer} onClick={() => togglePin()}>
            {titleRow}
            {glossaryItems}
          </div>
          <div className={classes.toggleCollapseContainer}>
            <a className={classes.toggleCollapseButton} onClick={() => setCollapsed(!collapsed)}>{collapsed ? 'Show More' : 'Show Less'}</a>
          </div>
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
