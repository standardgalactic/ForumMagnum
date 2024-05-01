import { randomId } from '../lib/random';
import { getCookieFromReq, setCookieOnResponse } from './utils/httpUtil';
import { ClientIds } from '../lib/collections/clientIds/collection';
import type { AddMiddlewareType } from './apolloServer';
import express from 'express';
import { responseIsCacheable } from './cacheControlMiddleware';

const isApplicableUrl = (url: string) =>
  url !== "/robots.txt" && url.indexOf("/api/") < 0;

// General contract:
// - Anything that is a securty risk, or causes inconsistencies in our *analytics* is the responsibilty of the server to handle
// - Other inconsistencies should be handled by the CDN (and e.g. we might decide it's worth having inconsistent dates to get a higher cache hit rate)

// TODO:
// - [X] Check if the cookies are forwarded when the refresh request is sent to CloudFront
// - [X] Make sure this doesn't add set-cookie to requests that might be cached
// - [ ] [Pending checking for duplicates] Rewrite ensure section as an INSERT ... ON CONFLICT query (add unique index in separate PR)
// - [X] Deal with timezone
//    - [X] Convert all instances of dates to use a <time> tag, so that the info is at least there for machines if needed
//    - [X] Add the logic for timeOverride described in the PR (this will add a `maybeCached`)
// - [ ] Deal with tabId
//    - [ ] Don't set it for cacheable requests, generate it on the client instead
//    - [ ] Make sure this is reflected correctly in logs
// - [ ] Deal with A/B tests
//    - [ ] Throw an error if A/B tests are used in a cacheFriendly request
// - [ ] Deal with the theme
//    - [ ] Make it part of the cacheKey in the CDN
// - [ ] Resolve inconsistencies between our local caching and external caching
// - [ ] Add a setting to enable the caching thing, so other instances can still set cookies if they want (or ideally infer it from the request)
// - [ ] [Probably don't do] Generate a clientId cookie in the CDN for users that don't have one (one will be created on the first analytics request, so not a huge deal if this is missed)


// timeOverride logic:
// - Keep the concept of it being an override at the level of <App/>
// - But remove the concept at the level of <AppGenerator />, pass it in as ssrMetadata there
// - Add a useEffect in <AppGenerator />
//   - setState(null) after the first render
//   - use memo() to make it only trigger a re-render if `cacheFriendly` or `timezone` changes, or the time changes significantly

const ensureClientId = async ({ existingClientId, referrer, url }: { existingClientId: string; referrer: string | null; url: string; }) => {
if (!(await ClientIds.findOne({clientId: existingClientId}, undefined, {_id: 1}))) {
    await ClientIds.rawInsert({
      clientId: existingClientId,
      firstSeenReferrer: referrer,
      firstSeenLandingPage: url,
      userIds: undefined,
    });
  }
};

/**
 * - Assign a client id if there isn't one currently assigned
 * - Ensure the client id is stored in our DB (it may have been generated by a CDN)
 */
export const addClientIdMiddleware = (addMiddleware: AddMiddlewareType) => {
  addMiddleware(function addClientId(req: express.Request, res: express.Response, next: express.NextFunction) {
    const existingClientId = getCookieFromReq(req, "clientId")
    const referrer = req.headers?.["referer"] ?? null;
    const url = req.url;

    // 1. If there is no client id, and this page won't be cached, create a clientId and add it to the response
    if (!existingClientId && !responseIsCacheable(res)) {
      const newClientId = randomId();
      setCookieOnResponse({
        req, res,
        cookieName: "clientId",
        cookieValue: newClientId,
        maxAge: 315360000
      });

      try {
        if (isApplicableUrl(req.url)) {
          void ClientIds.rawInsert({
            clientId: newClientId,
            firstSeenReferrer: referrer,
            firstSeenLandingPage: url,
            userIds: undefined,
          });
        }
      } catch(e) {
        //eslint-disable-next-line no-console
        console.error(e);
      }

    // 2. If there is a client id, ensure (asynchronously) that it is stored in the DB
    } else if (existingClientId && isApplicableUrl(req.url)) {
      // TODO switch to repo version of this once I have checked for duplicate client ids
      void ensureClientId({ existingClientId, referrer, url });
    }

    next();
  });
}
