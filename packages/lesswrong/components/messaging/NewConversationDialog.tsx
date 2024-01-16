import React, { useState } from "react";
import { Components, registerComponent } from "../../lib/vulcan-lib";
import { AnalyticsContext } from "../../lib/analyticsEvents";
import { Configure, Hits, InstantSearch, SearchBox } from "react-instantsearch-dom";
import { getElasticIndexNameWithSorting, getSearchClient } from "../../lib/search/searchUtil";
import InfoIcon from "@material-ui/icons/Info";
import { useCurrentUser } from "../common/withUser";

const styles = (theme: ThemeType): JssStyles => ({
  paper: {
    width: 600,
  },
  root: {
    maxWidth: 600,
    width: 'min(600px, 100%)',
    maxHeight: 600,
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  titleRow: {
    fontFamily: theme.palette.fonts.sansSerifStack,
    color: theme.palette.grey[1000],
    fontSize: 20,
    fontWeight: 700,
    padding: '20px 20px 14px 20px',
    display: "flex",
    justifyContent: "space-between",
  },
  resultsColumn: {
    display: "flex",
    flex: "1",
    flexDirection: "column",
    minHeight: 0,
  },
  searchIcon: {
    marginLeft: 12,
    color: theme.palette.grey[600],
    fontSize: 16
  },
  searchBoxRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: 15,
    gap: "16px",
    padding: "0px 20px",
    [theme.breakpoints.down("xs")]: {
      marginBottom: 12,
    },
  },
  modWarning: {
    padding: '0px 20px 12px 20px',
    color: theme.palette.grey[600],
    fontSize: 14,
  },
  searchInputArea: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    maxWidth: 625,
    backgroundColor: theme.palette.grey[120],
    borderRadius: theme.borderRadius.default,
    "& .ais-SearchBox": {
      display: "inline-block",
      position: "relative",
      width: "100%",
      marginLeft: 8,
      height: 40,
      whiteSpace: "nowrap",
      boxSizing: "border-box",
    },
    "& .ais-SearchBox-form": {
      height: "100%",
    },
    "& .ais-SearchBox-submit": {
      display: "none",
    },
    // This is a class generated by React InstantSearch, which we don't have direct control over so
    // are doing a somewhat hacky thing to style it.
    "& .ais-SearchBox-input": {
      height: "100%",
      width: "100%",
      paddingRight: 0,
      verticalAlign: "bottom",
      borderStyle: "none",
      boxShadow: "none",
      backgroundColor: "transparent",
      fontSize: "inherit",
      "-webkit-appearance": "none",
      cursor: "text",
      ...theme.typography.body2,
    },
  },
  searchHelp: {
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  infoIcon: {
    fontSize: 20,
    fill: theme.palette.grey[800],
  },
  usersList: {
    overflowY: "auto",
    // Not the actual height, but makes it fill the space when there are no results
    height: 1000,
  },
  hit: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  closeIcon: {
    color: theme.palette.grey[600],
    width: 20,
    height: 20,
    cursor: "pointer",
  }
});

const NewConversationDialog = ({
  isModInbox = false,
  classes,
  onClose,
}: {
  isModInbox?: boolean;
  classes: ClassesType;
  onClose: () => void;
}) => {
  const { LWDialog, ErrorBoundary, ExpandedUsersConversationSearchHit, ForumIcon, LWTooltip, Typography } = Components;
  const currentUser = useCurrentUser();
  const [query, setQuery] = useState<string>("");

  if (!currentUser) return null;

  return (
    <AnalyticsContext pageSectionContext="newConversationDialog">
      <LWDialog
        open={true}
        onClose={onClose}
        dialogClasses={{
          paper: classes.paper,
        }}
      >
        <div className={classes.root}>
          <div className={classes.titleRow}>
            <div>New conversation</div>
            <ForumIcon icon="Close" className={classes.closeIcon} onClick={onClose} />
          </div>
          <InstantSearch
            indexName={getElasticIndexNameWithSorting("Users", "relevance")}
            searchClient={getSearchClient()}
            searchState={{ query }}
            onSearchStateChange={(x) => setQuery(x.query)}
          >
            <div className={classes.resultsColumn}>
              <div className={classes.searchBoxRow}>
                <div className={classes.searchInputArea}>
                  <ForumIcon icon="Search" className={classes.searchIcon} />
                  <SearchBox
                    defaultRefinement={query}
                    // Ignored because SearchBox is incorrectly annotated as not taking null for its reset prop,
                    // when null is the only option that actually suppresses the extra X button.
                    // @ts-ignore
                    reset={null}
                    focusShortcuts={[]}
                    autoFocus={true}
                    translations={{ placeholder: "Search for user..." }}
                  />
                </div>
              </div>
              {isModInbox && (
                <Typography variant="body2" className={classes.modWarning}>
                  Moderators will be included in this conversation
                </Typography>
              )}
              <ErrorBoundary>
                <div className={classes.usersList}>
                  {/* Speed seems to be roughly proportional to hitsPerPage here */}
                  <Configure hitsPerPage={50} />
                  <Hits
                    hitComponent={(props) => (
                      <ExpandedUsersConversationSearchHit
                        {...props}
                        currentUser={currentUser}
                        onClose={onClose}
                        isModInbox={isModInbox}
                        className={classes.hit}
                      />
                    )}
                  />
                </div>
              </ErrorBoundary>
            </div>
          </InstantSearch>
        </div>
      </LWDialog>
    </AnalyticsContext>
  );
};

const NewConversationDialogComponent = registerComponent("NewConversationDialog", NewConversationDialog, { styles });

declare global {
  interface ComponentTypes {
    NewConversationDialog: typeof NewConversationDialogComponent;
  }
}
