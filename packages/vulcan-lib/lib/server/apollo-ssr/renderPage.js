/**
 * Render the page server side
 * @see https://github.com/szomolanyi/MeteorApolloStarter/blob/master/imports/startup/server/ssr.js
 * @see https://github.com/apollographql/GitHunt-React/blob/master/src/server.js
 * @see https://www.apollographql.com/docs/react/features/server-side-rendering.html#renderToStringWithData
 */
/*global Vulcan*/
import React from 'react';
import ReactDOM from 'react-dom/server';
import { getDataFromTree } from 'react-apollo';
import { getUserFromReq, computeContextFromUser } from '../apollo-server/context.js';
import { webAppConnectHandlersUse } from '../meteor_patch.js';

import { runCallbacks } from '../../modules/callbacks';
import { createClient } from './apolloClient';
import { cachedPageRender, recordCacheBypass, getCacheHitRate } from './pageCache';
import Head from './components/Head';
import ApolloState from './components/ApolloState';
import AppGenerator from './components/AppGenerator';
import Sentry from '@sentry/node';

const makePageRenderer = async sink => {
  const startTime = new Date();
  const req = sink.request;
  const user = await getUserFromReq(req);
  
  // Inject a tab ID into the page, by injecting a script fragment that puts
  // it into a global variable. In previous versions of Vulcan this would've
  // been handled by InjectData, but InjectData didn't surive the 1.12 version
  // upgrade (it injects into the page template in a way that requires a
  // response object, which the onPageLoad/sink API doesn't offer).
  const tabId = Random.id();
  const tabIdHeader = `<script>var tabId = "${tabId}"</script>`;
  
  if (user) {
    // When logged in, don't use the page cache (logged-in pages have notifications and stuff)
    recordCacheBypass();
    //eslint-disable-next-line no-console
    console.log(`Rendering ${req.url} (logged in request; hit rate=${getCacheHitRate()})`);
    const rendered = await renderRequest({
      req, user, startTime
    });
    sendToSink(sink, {
      ...rendered,
      headers: [...rendered.headers, tabIdHeader],
    });
    Vulcan.captureEvent("ssr", {
      url: req.url.pathname,
      userId: user._id,
      clientId: req.cookies && req.cookies.clientId,
      tabId: tabId,
      timings: rendered.timings,
      cached: false,
    });
  } else {
    const rendered = await cachedPageRender(req, (req) => renderRequest({
      req, user: null, startTime
    }));
    sendToSink(sink, {
      ...rendered,
      headers: [...rendered.headers, tabIdHeader],
    });
    Vulcan.captureEvent("ssr", {
      url: req.url.pathname,
      userId: null,
      clientId: req.cookies && req.cookies.clientId,
      tabId: tabId,
      timings: {
        totalTime: new Date()-startTime,
      },
      cached: true,
    });
  }
};

// Middleware for assigning a client ID, if one is not currently assigned.
// Since Meteor doesn't have an API for setting cookies, this calls setHeader
// on the HTTP response directly; if other middlewares also want to set
// cookies, they won't necessarily play nicely together.
webAppConnectHandlersUse(function addClientId(req, res, next) {
  if (!req.cookies.clientId) {
    const newClientId = Random.id();
    req.cookies.clientId = newClientId;
    res.setHeader("Set-Cookie", `clientId=${newClientId}; Max-Age=315360000`);
  }
  
  next();
}, {order: 100});

const renderRequest = async ({req, user, startTime}) => {
  const requestContext = await computeContextFromUser(user, req.headers);
  // according to the Apollo doc, client needs to be recreated on every request
  // this avoids caching server side
  const client = await createClient(requestContext);

  // Used by callbacks to handle side effects
  // E.g storing the stylesheet generated by styled-components
  const context = {};

  // Allows components to set statuscodes and redirects that will get executed on the server
  let serverRequestStatus = {}

  // TODO: req object does not seem to have been processed by the Express
  // middlewares at this point
  // @see https://github.com/meteor/meteor-feature-requests/issues/174#issuecomment-441047495

  const App = <AppGenerator req={req} apolloClient={client} serverRequestStatus={serverRequestStatus} />;

  // run user registered callbacks that wraps the React app
  const WrappedApp = runCallbacks({
    name: 'router.server.wrapper',
    iterator: App,
    properties: { req, context, apolloClient: client },
  });

  let htmlContent = '';
  // LESSWRONG: Split a call to renderToStringWithData into getDataFromTree
    // followed by ReactDOM.renderToString, then pass a context variable
    // isGetDataFromTree to only the getDataFromTree call. This is to enable
    // a hack in packages/lesswrong/server/material-ui/themeProvider.js.
    //
    // In getDataFromTree, the order in which components are rendered is
    // complicated and depends on what HoCs they have and the order in which
    // results come back from the database; whereas in
    // ReactDOM.renderToString, the render order is simply an inorder
    // traversal of the resulting virtual DOM. When the client rehydrates the
    // SSR, it traverses inorder, like renderToString did.
    //
    // Ordinarily the render order wouldn't matter, except that material-UI
    // JSS stylesheet generation happens on first render, and it generates
    // some class names which contain an iterating counter, which needs to
    // match between client and server.
    //
    // So the hacky solution is: when rendering for getDataFromTree, we pass
    // a context variable isGetDataFromTree, and if that's present and true,
    // we suppress JSS style generation.
  try {
    await getDataFromTree(WrappedApp, {isGetDataFromTree: true});
  } catch(err) {
    console.error(`Error while fetching Apollo Data. date: ${new Date().toString()} url: ${JSON.stringify(req.url)}`); // eslint-disable-line no-console
    console.error(err); // eslint-disable-line no-console
  }
  const afterPrerenderTime = new Date();
  try {
    htmlContent = await ReactDOM.renderToString(WrappedApp);
  } catch (err) {
    console.error(`Error while rendering React tree. date: ${new Date().toString()} url: ${JSON.stringify(req.url)}`); // eslint-disable-line no-console
    console.error(err); // eslint-disable-line no-console
  }

  // TODO: there should be a cleaner way to set this wrapper
  // id must always match the client side start.jsx file
  const ssrBody = `<div id="react-app">${htmlContent}</div>`;

  // add headers using helmet
  const head = ReactDOM.renderToString(<Head />);

  // add Apollo state, the client will then parse the string
  const initialState = client.extract();
  const serializedApolloState = ReactDOM.renderToString(
    <ApolloState initialState={initialState} />
  );
  
  // HACK: The sheets registry is created in a router.server.wrapper callback. The
  // resulting styles are extracted here, rather than in a callback, because the type
  // signature of the callback didn't fit.
  const sheetsRegistry = context.sheetsRegistry;
  const jssSheets = `<style id="jss-server-side">${sheetsRegistry.toString()}</style>`
  
  const finishedTime = new Date();
  const timings = {
    prerenderTime: afterPrerenderTime - startTime,
    renderTime: finishedTime - afterPrerenderTime,
    totalTime: finishedTime - startTime
  };
  
  // eslint-disable-next-line no-console
  console.log(`preRender time: ${timings.prerenderTime}; render time: ${timings.renderTime}`);
  if (timings.totalTime > 3000) {
    Sentry.captureException(new Error("SSR time above 3 seconds"));
  }
  
  return {
    ssrBody,
    headers: [head],
    serializedApolloState, jssSheets,
    status: serverRequestStatus.status,
    redirectUrl: serverRequestStatus.redirectUrl,
    timings,
  };
}

const sendToSink = (sink, {
  ssrBody, headers, serializedApolloState, jssSheets,
  status, redirectUrl
}) => {
  if (status) {
    sink.setStatusCode(status);
  }
  if (redirectUrl) {
    sink.redirect(redirectUrl, status||301);
  }
  
  sink.appendToBody(ssrBody);
  for (let head of headers)
    sink.appendToHead(head);
  sink.appendToBody(serializedApolloState);
  sink.appendToHead(jssSheets);
}

export default makePageRenderer;
