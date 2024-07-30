import React, { useCallback } from "react";
import { Components, registerComponent } from "../../lib/vulcan-lib";
import { useCurrentUser } from "../common/withUser";
import { useTracking } from "../../lib/analyticsEvents";
import { useCookiesWithConsent } from "../hooks/useCookiesWithConsent";
import moment from "moment";
import DeferRender from "../common/DeferRender";
import { Link } from "@/lib/reactRouterWrapper";
import { HIDE_EA_FORUM_SURVEY_BANNER_COOKIE } from "@/lib/cookies/cookies";

const styles = (theme: ThemeType) => ({
  root: {
    position: "sticky",
    top: 0,
    zIndex: 10, // The typeform popup has z-index 10001
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: "25px",
    padding: 12,
    background: theme.palette.buttons.alwaysPrimary,
    fontFamily: theme.palette.fonts.sansSerifStack,
    fontSize: 15,
    lineHeight: '21px',
    fontWeight: 450,
    color: theme.palette.text.alwaysWhite,
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
      gap: "12px",
      paddingRight: 60,
    },
  },
  button: {
    background: theme.palette.text.alwaysWhite,
    color: theme.palette.text.alwaysBlack,
    borderRadius: theme.borderRadius.default,
    fontSize: 15,
    fontWeight: 500,
    padding: "8px 12px",
    cursor: "pointer",
    "&:hover": {
      opacity: 0.9,
    },
  },
  close: {
    position: "absolute",
    right: 20,
    cursor: "pointer",
    "&:hover": {
      opacity: 0.75,
    },
  },
});

/**
 * This banner is now disabled but the code is left here in case we want to
 * do something similar again in the future. If so, there are a couple of bugs
 * to fix:
 *   1) We had some users complaining that the banner didn't get hidden properly
 *      or that it would open again when revisiting the page. The most important
 *      thing is that the cookie must be marked as "necessary" to ensure it works
 *      for users who don't accept cookies. We still had some users who reported
 *      it wasn't working properly though - maybe we should just disable the
 *      banner entirely or users who don't accept cookies?
 *   2) The banner currently obscures the autocomplete window that popups up
 *      when typing in the search box. We probably just need to add some kind
 *      of top margin or offset.
 *   3) We also removed the old cookie, so a new cookie name needs to be added
 *      below. We previously used:
 *      export const HIDE_EA_FORUM_SURVEY_BANNER_COOKIE = registerCookie({
 *        name: "hide_ea_forum_survey_banner",
 *        type: "necessary",
 *        description: "Don't show the EA Forum survey banner",
 *      });
 */
const EASurveyBanner = ({classes}: {classes: ClassesType}) => {
  const [cookies, setCookie] = useCookiesWithConsent([HIDE_EA_FORUM_SURVEY_BANNER_COOKIE]);
  const {captureEvent} = useTracking();
  const currentUser = useCurrentUser();

  const hideBanner = useCallback(() => {
    setCookie(HIDE_EA_FORUM_SURVEY_BANNER_COOKIE, "true", {
      expires: moment().add(3, "months").toDate(),
    });
  }, [HIDE_EA_FORUM_SURVEY_BANNER_COOKIE, setCookie]);

  const onDismissBanner = useCallback(() => {
    hideBanner();
    captureEvent("ea_forum_survey_banner_dismissed");
  }, [hideBanner, captureEvent]);

  const onSubmitSurvey = useCallback(() => {
    hideBanner();
    captureEvent("ea_forum_survey_closed");
  }, [hideBanner, captureEvent]);

  if (cookies[HIDE_EA_FORUM_SURVEY_BANNER_COOKIE] === "true") {
    return null;
  }

  const {ForumIcon} = Components;
  return (
    <DeferRender ssr={!!currentUser}>
      <div className={classes.root}>
        Take the 2024 EA Forum Survey to help inform our strategy and priorities
        <Link
          to="https://forms.cea.community/test?utm_source=ea_forum&utm_medium=banner"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onSubmitSurvey}
          className={classes.button}
        >
          Take the survey
        </Link>
        <ForumIcon
          icon="Close"
          onClick={onDismissBanner}
          className={classes.close}
        />
      </div>
    </DeferRender>
  );
}

const EASurveyBannerComponent = registerComponent(
  "EASurveyBanner",
  EASurveyBanner,
  {styles},
);

declare global {
  interface ComponentTypes {
    EASurveyBanner: typeof EASurveyBannerComponent
  }
}
