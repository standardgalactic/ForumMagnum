import React, { useCallback, useEffect, useRef, useState } from "react";
import { Components, registerComponent } from "@/lib/vulcan-lib";
import { Link } from "@/lib/reactRouterWrapper";
import { postGetPageUrl } from "@/lib/collections/posts/helpers";
import { commentGetPageUrl } from "@/lib/collections/comments/helpers";
import { InteractionWrapper, useClickableCell } from "../common/useClickableCell";
import { useCurrentForumEvent } from "../hooks/useCurrentForumEvent";
import { useCurrentUser } from "../common/withUser";
import { formatStat } from "../users/EAUserTooltipContent";
import { HEADER_HEIGHT, MOBILE_HEADER_HEIGHT } from "../common/Header";
import {
  GIVING_SEASON_DESKTOP_WIDTH,
  GIVING_SEASON_MD_WIDTH,
  GIVING_SEASON_MOBILE_WIDTH,
  getDonateLink,
  shouldShowLeaderboard,
  useGivingSeasonEvents,
} from "./useGivingSeasonEvents";
import classNames from "classnames";
import type { Moment } from "moment";
import type { ForumIconName } from "../common/ForumIcon";

const DONATION_ELECTION_HREF = "/posts/2WbDAAtGdyAEfcw6S/donation-election-fund-announcement-matching-rewards-and-faq";

const DOT_SIZE = 12;

const styles = (theme: ThemeType) => ({
  root: {
    width: "100vw",
    maxWidth: "100vw",
    overflow: "hidden",
    position: "relative",
    color: theme.palette.text.alwaysWhite,
    fontFamily: theme.palette.fonts.sansSerifStack,
    fontSize: 14,
    fontWeight: 500,
    marginTop: -HEADER_HEIGHT,
    paddingTop: HEADER_HEIGHT,
    [theme.breakpoints.down("xs")]: {
      marginTop: -MOBILE_HEADER_HEIGHT,
      paddingTop: MOBILE_HEADER_HEIGHT,
    },
  },
  backgrounds: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
    background: theme.palette.text.alwaysWhite,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    transition: "opacity 0.5s ease",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundBlendMode: "darken",
  },
  backgroundActive: {
    opacity: 1,
  },
  darkText: {
    color: theme.palette.givingSeason.primary,
    "& $line, & $timelineDot": {
      background: theme.palette.givingSeason.primary,
    },
  },
  banner: {
    fontFamily: theme.palette.fonts.sansSerifStack,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: "150%",
    letterSpacing: "0.98px",
    textAlign: "center",
    margin: "-4px 0 16px 0",
    [theme.breakpoints.up(GIVING_SEASON_MOBILE_WIDTH)]: {
      display: "none",
    },
  },
  content: {
    transition: "color 0.5s ease",
    maxWidth: GIVING_SEASON_DESKTOP_WIDTH - 10,
    margin: "0 auto",
  },
  line: {
    width: "100%",
    height: 1,
    opacity: 0.6,
    background: theme.palette.text.alwaysWhite,
    transition: "background 0.5s ease",
  },
  timeline: {
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    paddingTop: 14,
    marginTop: -12,
    overflow: "scroll hidden",
    scrollbarWidth: "none",
    "-ms-overflow-style": "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
    [theme.breakpoints.down(GIVING_SEASON_DESKTOP_WIDTH)]: {
      paddingLeft: 24,
      paddingRight: 24,
    },
  },
  timelineEvent: {
    cursor: "pointer",
    position: "relative",
    margin: "12px 0",
    fontWeight: 400,
    whiteSpace: "nowrap",
    userSelect: "none",
    opacity: 0.6,
    transition: "opacity 0.5s ease",
    "&:hover": {
      opacity: 1,
    },
    // Use `after` to overlay the same text but with the higher font weight as
    // if it's selected, even if it's not. This means that the size of each
    // title won't change when they switch between active/inactive.
    "&:after": {
      display: "block",
      content: "attr(data-title)",
      fontWeight: 600,
      height: 1,
      color: "transparent",
      overflow: "hidden",
      visibility: "hidden",
    },
    "&:first-child": {
      scrollMarginLeft: "1000px",
    },
    "&:last-child": {
      scrollMarginRight: "1000px",
    },
  },
  timelineEventSelected: {
    fontWeight: 600,
    opacity: 1,
  },
  timelineDot: {
    position: "absolute",
    top: -20.5,
    left: `calc(50% - ${DOT_SIZE / 2}px)`,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: "50%",
    background: theme.palette.text.alwaysWhite,
    transition: "background 0.5s ease",
  },
  mainContainer: {
    display: "flex",
    flexDirection: "row",
    gap: "8px",
    alignItems: "center",
    [theme.breakpoints.down(GIVING_SEASON_DESKTOP_WIDTH)]: {
      padding: "0 24px",
    },
    [theme.breakpoints.down(GIVING_SEASON_MOBILE_WIDTH)]: {
      flexDirection: "column",
    },
  },
  detailsContainer: {
    width: "100%",
    whiteSpace: "nowrap",
    overflow: "scroll hidden",
    scrollSnapType: "x mandatory",
    scrollbarWidth: "none",
    "-ms-overflow-style": "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
  eventDetails: {
    display: "inline-flex",
    verticalAlign: "middle",
    width: "100%",
    scrollSnapAlign: "start",
    paddingTop: 24,
    paddingBottom: 40,
    [theme.breakpoints.down(GIVING_SEASON_MOBILE_WIDTH)]: {
      paddingTop: 8,
      paddingBottom: 8,
    },
    [theme.breakpoints.up(GIVING_SEASON_DESKTOP_WIDTH)]: {
      "& > *": {
        flexBasis: "50%",
      },
    },
  },
  eventDate: {
    maxWidth: 470,
    marginBottom: 8,
  },
  eventName: {
    maxWidth: 640,
    fontSize: 40,
    fontWeight: 700,
    marginBottom: 12,
    whiteSpace: "wrap",
    [theme.breakpoints.down(GIVING_SEASON_MOBILE_WIDTH)]: {
      fontSize: 32,
    },
  },
  eventDescription: {
    maxWidth: 470,
    lineHeight: "140%",
    whiteSpace: "wrap",
    marginBottom: 16,
    "& a": {
      textDecoration: "underline",
      "&:hover": {
        textDecoration: "underline",
      },
    },
  },
  fund: {
    width: 260,
    minWidth: 260,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    background: theme.palette.givingSeason.electionFundBackground,
    borderRadius: theme.borderRadius.default,
    [theme.breakpoints.down(GIVING_SEASON_MOBILE_WIDTH)]: {
      width: "100%",
      minWidth: "100%",
      maxWidth: "100%",
      padding: 8,
      marginTop: 0,
    },
  },
  fundDetailsContainer: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 4,
    [theme.breakpoints.down(GIVING_SEASON_MOBILE_WIDTH)]: {
      flexDirection: "row",
      gap: "8px",
      alignItems: "center",
      marginBottom: 8,
    },
  },
  fundMobileTitle: {
    flexGrow: 1,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: "140%",
    [theme.breakpoints.up(GIVING_SEASON_MOBILE_WIDTH)]: {
      display: "none",
    },
  },
  fundInfo: {
    marginBottom: 12,
    lineHeight: "140%",
    whiteSpace: "wrap",
    "& a": {
      textDecoration: "underline",
      "&:hover": {
        textDecoration: "underline",
      },
    },
    [theme.breakpoints.down(GIVING_SEASON_MOBILE_WIDTH)]: {
      display: "none",
    },
  },
  fundRaised: {
    fontSize: 16,
    fontWeight: 500,
    lineHeight: "140%",
    [theme.breakpoints.down(GIVING_SEASON_MOBILE_WIDTH)]: {
      fontWeight: 700,
      textAlign: "right",
    },
  },
  fundBarContainer: {
    width: "100%",
    height: 12,
    marginBottom: 20,
    background: theme.palette.givingSeason.electionFundBackground,
    borderRadius: theme.borderRadius.small,
    overflow: "hidden",
    [theme.breakpoints.down(GIVING_SEASON_MOBILE_WIDTH)]: {
      marginBottom: 12,
    },
  },
  fundBarContainerLarge: {
    height: 17
  },
  fundBar: {
    height: "100%",
    background: theme.palette.text.alwaysWhite,
    transition: "width 0.5s ease",
  },
  fundAmount: {
    fontWeight: 700,
  },
  fundButtonContainer: {
    display: "flex",
    gap: "12px",
    width: "100%",
    textAlign: "center",
  },
  hideAboveMobile: {
    [theme.breakpoints.up(GIVING_SEASON_MOBILE_WIDTH)]: {
      display: "none !important",
    },
  },
  hideAboveMd: {
    [theme.breakpoints.up(GIVING_SEASON_MD_WIDTH)]: {
      display: "none !important",
    },
  },
  hideBelowMd: {
    [theme.breakpoints.down(GIVING_SEASON_MD_WIDTH)]: {
      display: "none !important",
    },
  },
  button: {
    flexGrow: 1,
    fontSize: 14,
    fontWeight: 600,
    transition: "background 0.3s ease",
    textAlign: "center",
  },
  buttonLarge: {
    padding: "12px 24px",
    [theme.breakpoints.down(GIVING_SEASON_MOBILE_WIDTH)]: {
      padding: "8px 12px",
    },
  },
  buttonWhite: {
    color: theme.palette.givingSeason.primary,
    background: theme.palette.text.alwaysWhite,
    transition: "opacity 0.3s ease",
    "&:hover": {
      background: theme.palette.text.alwaysWhite,
      opacity: 0.85,
    },
  },
  buttonTranslucent: {
    color: theme.palette.text.alwaysWhite,
    background: theme.palette.givingSeason.electionFundBackground,
    "&:hover": {
      background: theme.palette.givingSeason.electionFundBackgroundHeavy,
    },
  },
  fundVoteButton: {
    width: "100%",
    fontSize: 14,
    fontWeight: 600,
    color: theme.palette.text.alwaysWhite,
    background: theme.palette.givingSeason.electionFundBackground,
    transition: "background 0.3s ease",
    "&:hover": {
      background: theme.palette.givingSeason.electionFundBackgroundHeavy,
    },
  },
  recentComments: {
    display: "flex",
    flexDirection: "column",
    minWidth: 530,
    margin: "8px 0 8px 8px",
    [theme.breakpoints.down(GIVING_SEASON_DESKTOP_WIDTH)]: {
      display: "none",
    },
  },
  feedItem: {
    display: "flex",
    gap: "8px",
    fontSize: 14,
    lineHeight: "140%",
    padding: 8,
    borderRadius: theme.borderRadius.default,
    cursor: "pointer",
    "&:hover": {
      background: theme.palette.givingSeason.electionFundBackground,
    },
  },
  feedIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    padding: 4,
    width: 24,
    minWidth: 24,
    maxWidth: 24,
    height: 24,
    minHeight: 24,
    maxHeight: 24,
    "& svg": {
      width: 12,
    },
  },
  feedPostIcon: {
    color: theme.palette.text.alwaysWhite,
    background: theme.palette.primary.main,
  },
  feedCommentIcon: {
    color: theme.palette.text.alwaysWhite,
    background: theme.palette.grey[600],
  },
  feedDetailsWrapper: {
    minWidth: 0,
    width: "100%",
  },
  feedUser: {
    fontWeight: 600,
  },
  feedAction: {
    opacity: 0.7,
  },
  feedDate: {
    opacity: 0.7,
    whiteSpace: "nowrap",
    float: "right",
    marginRight: 12,
  },
  feedInfo: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  feedPost: {
    textDecoration: "underline",
    fontWeight: 600,
  },
  feedPreview: {
    color: theme.palette.text.alwaysWhite,
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  feedInteraction: {
    display: "inline",
  },
  electionInfoContainer: {
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    padding: "0px 48px 0px 0px",
    borderRadius: theme.borderRadius.default,
    width: 600,
    maxWidth: "100%",
    margin: "0 auto 0 0",
    flexBasis: "35%",
    [theme.breakpoints.down(GIVING_SEASON_MOBILE_WIDTH)]: {
      padding: 0,
      flex: 1
    },
  },
  electionInfoRaised: {
    display: "flex",
    gap: "8px",
    alignItems: "baseline",
    marginTop: 8,
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 12,
  },
  electionInfoAmount: {
    fontWeight: 700,
  },
  matchNotice: {
    fontSize: 13,
    fontWeight: 'normal',
    transform: "translateY(-1px)"
  },
  electionInfoButtonContainer: {
    marginBottom: 4,
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    width: "100%",
    [theme.breakpoints.down(GIVING_SEASON_MOBILE_WIDTH)]: {
      marginBottom: 16
    },
  },
});

const scrollIntoViewHorizontally = (
  container: HTMLElement,
  child: HTMLElement,
) => {
  const child_offsetRight = child.offsetLeft + child.offsetWidth;
  const container_scrollRight = container.scrollLeft + container.offsetWidth;

  if (container.scrollLeft > child.offsetLeft) {
    container.scrollLeft = child.offsetLeft;
  } else if (container_scrollRight < child_offsetRight) {
    container.scrollLeft += child_offsetRight - container_scrollRight;
  }
};

const formatDate = (start: Moment, end: Moment) => {
  const endFormat = start.month() === end.month() ? "D" : "MMM D";
  return `${start.format("MMM D")} - ${end.format(endFormat)}`;
}

const FeedItem = ({
  href,
  icon,
  iconClassName,
  action,
  user,
  post,
  date,
  preview,
  classes,
}: {
  href: string,
  icon: ForumIconName,
  iconClassName: string,
  action: string,
  user: UsersMinimumInfo | null,
  post: PostsMinimumInfo | null,
  date: Date,
  preview: string,
  classes: ClassesType<typeof styles>,
}) => {
  const {onClick} = useClickableCell({href, ignoreLinks: true});
  const {ForumIcon, UsersName, PostsTooltip, FormatDate} = Components;
  return (
    <div onClick={onClick} className={classes.feedItem}>
      <div className={classNames(classes.feedIcon, iconClassName)}>
        <ForumIcon icon={icon} />
      </div>
      <div className={classes.feedDetailsWrapper}>
        <div>
          <FormatDate
            date={date}
            tooltip={false}
            includeAgo
            className={classes.feedDate}
          />
          <div className={classes.feedInfo}>
            <InteractionWrapper className={classes.feedInteraction}>
              <UsersName
                user={user}
                tooltipPlacement="bottom-start"
                className={classes.feedUser}
              />
            </InteractionWrapper>{" "}
            <span className={classes.feedAction}>{action}</span>{" "}
            <InteractionWrapper className={classes.feedInteraction}>
              <PostsTooltip postId={post?._id} placement="bottom-start">
                <Link
                  to={post ? postGetPageUrl(post) : "#"}
                  className={classes.feedPost}
                >
                  {post?.title}
                </Link>
              </PostsTooltip>
            </InteractionWrapper>
          </div>
        </div>
        <div className={classes.feedPreview}>
          {preview}
        </div>
      </div>
    </div>
  );
}

const SECOND_MATCH_START = 9509;

const GivingSeason2024Banner = ({classes}: {
  classes: ClassesType<typeof styles>,
}) => {
  const {
    events,
    currentEvent,
    selectedEvent,
    setSelectedEvent,
    amountRaised,
    amountTarget,
    leaderboard: leaderboardData
  } = useGivingSeasonEvents();
  const {currentForumEvent} = useCurrentForumEvent();
  const currentUser = useCurrentUser();
  const [timelineRef, setTimelineRef] = useState<HTMLDivElement | null>(null);
  const [detailsRef, setDetailsRef] = useState<HTMLDivElement | null>(null);
  const [lastTimelineClick, setLastTimelineClick] = useState<number>();
  const didInitialScroll = useRef(false);

  // Note: SECOND_MATCH_START is approximate, we will match based on the amount when we deploy
  const amountRaisedPlusMatched =
    amountRaised + Math.min(amountRaised, 5000) + Math.min(Math.max(amountRaised - SECOND_MATCH_START, 0), 5000);
  const matchRemaining = Math.max(5000 - (amountRaised - SECOND_MATCH_START), 0)
  const fundPercent = Math.round((amountRaisedPlusMatched / amountTarget) * 100);

  const isDonationElection = currentEvent?.name === "Donation Election";
  const showLeaderboard = shouldShowLeaderboard({ currentEvent, voteCounts: leaderboardData });
  const showRecentComments =
    !showLeaderboard &&
    !!currentForumEvent?.tagId &&
    (currentEvent?.name === "Marginal Funding Week" || isDonationElection);

  useEffect(() => {
    if (!detailsRef) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = parseInt(entry.target.getAttribute("data-event-id") ?? "");
          if (Number.isSafeInteger(id) && events[id]) {
            setSelectedEvent(events[id]);
          }
        }
      }
    }, {threshold: 0.5});
    for (const child of Array.from(detailsRef.children)) {
      observer.observe(child);
    }
    return () => observer.disconnect();
  }, [timelineRef, detailsRef, events, setSelectedEvent]);

  useEffect(() => {
    if (currentEvent && detailsRef && !didInitialScroll.current) {
      didInitialScroll.current = true;
      setTimeout(() => {
        setLastTimelineClick(Date.now());
        const index = events.findIndex(({name}) => name === currentEvent.name);
        const elem = detailsRef?.querySelector(`[data-event-id="${index}"]`);
        if (detailsRef && elem) {
          scrollIntoViewHorizontally(detailsRef, elem as HTMLElement);
        }
      }, 0);
    }
  }, [events, currentEvent, detailsRef]);

  useEffect(() => {
    // Disable for a short period after clicking an event to prevent spurious
    // scrolling on mobile
    if (lastTimelineClick && Date.now() - lastTimelineClick < 150) {
      return;
    }
    const id = events.findIndex((event) => event === selectedEvent);
    timelineRef?.querySelector(`[data-event-id="${id}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [timelineRef, selectedEvent, lastTimelineClick, events]);

  const onClickTimeline = useCallback((index: number) => {
    setLastTimelineClick(Date.now());
    detailsRef?.querySelector(`[data-event-id="${index}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }, [detailsRef]);

  const {EAButton, MixedTypeFeed, DonationElectionLeaderboard} = Components;
  return (
    <div className={classNames(classes.root, selectedEvent.darkText && classes.darkText)}>
      <div className={classes.backgrounds}>
        {events.map(({ name, background }) => (
          <div
            key={name}
            style={{ backgroundImage: `url(${background})` }}
            className={classNames(classes.background, name === selectedEvent.name && classes.backgroundActive)}
          />
        ))}
      </div>
      <div className={classes.banner}>
        <Link to="/posts/srZEX2r9upbwfnRKw/giving-season-2024-announcement">GIVING SEASON 2024</Link>
      </div>
      <div className={classes.line} />
      <div className={classes.content}>
        <div className={classes.timeline} ref={setTimelineRef}>
          {events.map((event, i) => (
            <div
              key={event.name}
              data-event-id={i}
              data-title={event.name}
              onClick={onClickTimeline.bind(null, i)}
              className={classNames(classes.timelineEvent, selectedEvent === event && classes.timelineEventSelected)}
            >
              {event.name}
              {event === currentEvent && <div className={classes.timelineDot} />}
            </div>
          ))}
        </div>
        <div className={classes.mainContainer}>
          <div className={classes.detailsContainer} ref={setDetailsRef}>
            {events.map(({ name, description, start, end }, i) => (
              <div className={classes.eventDetails} data-event-id={i} key={name}>
                {name === currentEvent?.name && isDonationElection ? (
                  <div className={classes.electionInfoContainer}>
                    <div className={classes.eventDate}>{formatDate(selectedEvent.start, selectedEvent.end)}</div>
                    <div className={classes.eventName}>{name}</div>
                    <div className={classes.eventDescription}>
                      {description}
                    </div>
                    <div className={classNames(classes.eventDescription, classes.hideAboveMd)}>
                      <b>${formatStat(Math.round(amountRaisedPlusMatched))} raised.</b> CEA will match the next <b>${formatStat(Math.round(matchRemaining))}</b>.
                    </div>
                    <div className={classNames(classes.electionInfoRaised, classes.hideBelowMd)}>
                      <span className={classes.electionInfoAmount}>
                        ${formatStat(Math.round(amountRaisedPlusMatched))}
                      </span>{" "}
                      raised
                      <div className={classes.matchNotice}>
                        CEA will match the next <b>${formatStat(Math.round(matchRemaining))}</b> donated
                      </div>
                    </div>
                    <div
                      className={classNames(
                        classes.fundBarContainer,
                        classes.fundBarContainerLarge,
                        classes.hideBelowMd
                      )}
                    >
                      <div style={{ width: `${fundPercent}%` }} className={classes.fundBar} />
                    </div>
                    {showLeaderboard && leaderboardData && (
                      <DonationElectionLeaderboard
                        voteCounts={leaderboardData}
                        className={classes.hideAboveMd}
                        hideHeader
                      />
                    )}
                    <div className={classes.electionInfoButtonContainer}>
                      <EAButton
                        href={getDonateLink(currentUser)}
                        className={classNames(classes.button, classes.buttonLarge, classes.buttonWhite)}
                      >
                        Donate&nbsp;<span className={classes.hideBelowMd}>to the fund</span>
                      </EAButton>
                      <EAButton
                        href={"/voting-portal"}
                        className={classNames(classes.button, classes.buttonLarge, classes.buttonTranslucent)}
                      >
                        Vote in the election
                      </EAButton>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className={classes.eventDate}>{formatDate(start, end)}</div>
                    <div className={classes.eventName}>{name}</div>
                    <div className={classes.eventDescription}>{description}</div>
                  </div>
                )}
                {name === currentEvent?.name && showRecentComments && (
                  <MixedTypeFeed
                    className={classes.recentComments}
                    firstPageSize={isDonationElection ? 5 : 3}
                    hideLoading
                    disableLoadMore
                    resolverName="GivingSeasonTagFeed"
                    resolverArgs={{ tagId: "String!" }}
                    resolverArgsValues={{ tagId: currentForumEvent?.tagId }}
                    sortKeyType="Date"
                    renderers={{
                      newPost: {
                        fragmentName: "PostsList",
                        render: (post: PostsList) => (
                          <FeedItem
                            href={postGetPageUrl(post)}
                            icon="DocumentFilled"
                            iconClassName={classes.feedPostIcon}
                            action="posted"
                            user={post.user}
                            post={post}
                            date={post.postedAt}
                            preview={post.contents?.plaintextDescription ?? ""}
                            classes={classes}
                          />
                        ),
                      },
                      newComment: {
                        fragmentName: "CommentsListWithParentMetadata",
                        render: (comment: CommentsListWithParentMetadata) => (
                          <FeedItem
                            href={commentGetPageUrl(comment)}
                            icon="CommentFilled"
                            iconClassName={classes.feedCommentIcon}
                            action="on"
                            user={comment.user}
                            post={comment.post}
                            date={comment.postedAt}
                            preview={comment.contents?.plaintextMainText ?? ""}
                            classes={classes}
                          />
                        ),
                      },
                    }}
                  />
                )}
                {name === currentEvent?.name && showLeaderboard && leaderboardData && (
                  <DonationElectionLeaderboard voteCounts={leaderboardData} className={classes.hideBelowMd} />
                )}
              </div>
            ))}
          </div>
          {!isDonationElection && (
            <div className={classes.fund}>
              <div className={classes.fundDetailsContainer}>
                <div className={classes.fundMobileTitle}>Donation Election Fund</div>
                <div className={classes.fundInfo}>
                  Donate to the fund to boost the value of the{" "}
                  <Link to={DONATION_ELECTION_HREF}>Donation Election</Link>.
                </div>
                <div className={classes.fundRaised}>
                  <span className={classes.fundAmount}>${formatStat(Math.round(amountRaisedPlusMatched))}</span> raised
                </div>
              </div>
              <div className={classes.fundBarContainer}>
                <div style={{ width: `${fundPercent}%` }} className={classes.fundBar} />
              </div>
              <div className={classes.fundButtonContainer}>
                <EAButton
                  href={DONATION_ELECTION_HREF}
                  className={classNames(classes.button, classes.buttonTranslucent, classes.hideAboveMobile)}
                >
                  Learn more
                </EAButton>
                <EAButton href={getDonateLink(currentUser)} className={classNames(classes.button, classes.buttonWhite)}>
                  Donate
                </EAButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const GivingSeason2024BannerComponent = registerComponent(
  "GivingSeason2024Banner",
  GivingSeason2024Banner,
  {styles},
);

declare global {
  interface ComponentTypes {
    GivingSeason2024Banner: typeof GivingSeason2024BannerComponent
  }
}
