import { topicRoutes } from 'cl-common';
import { captureException, Handlers, init as initSentry } from 'cl-sentry';
import config from 'config';
import cookieSession from 'cookie-session';
import express from 'express';
import helmet from 'helmet';
import next from 'next';
import { routeIds, routePrefixes } from '../shared/constants';
import { cacheWarmup } from './lib/catalog-cache';
import logger from './lib/logger';
import { authMiddleware } from './middlewares/auth';
import serverRoutes from './routes';

global['fetch'] = require('node-fetch');

const serverPort = config.get('server.port');
const env = process.env.NODE_ENV || 'development';

if (config.get('sentry.enabled')) {
  initSentry(config.get('sentry'));
}

const app = express();
const nextApp = next({ dev: env === 'development' });
const nextHandler = nextApp.getRequestHandler();

app.set('trust proxy', true);
app.set('port', serverPort);
app.use(Handlers.requestHandler());
app.use(
  cookieSession({
    ...config.get('server.cookie'),
    keys: config.get('server.keys').split(',')
  })
);

app.use(helmet());
app.use(express.urlencoded({ extended: false }));
app.use(authMiddleware);

// error handlers
app.use(Handlers.errorHandler());

// redirection
serverRoutes(app);

// nextjs
Object.keys(topicRoutes).forEach(subjectId => {
  if (topicRoutes[subjectId]) {
    app.get(topicRoutes[subjectId], (req, res) =>
      nextApp.render(req, res, routeIds.topic, {
        id: subjectId
      })
    );
  }
});

app.get(routeIds.slearn, (req, res) => {
  const ver = Math.random();

  if (ver < 0.33) {
    logger.info('squeeze page, version [%s]', 'membership');
    nextApp.render(req, res, routeIds.memebership);
  } else if (ver < 0.66) {
    logger.info('squeeze page, version [%s]', '2020');
    nextApp.render(req, res, '/2020');
  } else {
    logger.info('squeeze page, version [%s]', 'slearn');
    nextApp.render(req, res, routeIds.slearn);
  }
});

app.get(routePrefixes.ref + ':ref', (req, res) => nextHandler(req, res));
app.get('*', (req, res) => nextHandler(req, res));

app.listen(serverPort, onServer);

async function onServer(err: Error) {
  if (err) {
    logger.error(err, 'fail to start server');
    captureException(err);
    return;
  }

  try {
    await nextApp.prepare();
    await cacheWarmup();
  } catch (dbErr) {
    logger.error(dbErr, 'fail to connect to db');
    captureException(dbErr);
    return;
  }

  logger.info('🚀 started at http://localhost:%d in %s mode', serverPort, env);
}
