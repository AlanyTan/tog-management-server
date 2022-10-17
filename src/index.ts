import 'dotenv/config';
import  express  from 'express';
import cookieParser from 'cookie-parser';
import  pino from 'pino';
import  pinoHttp  from 'express-pino-logger';

import  auth  from './routes/auth_aad';
import  flags  from './routes/flags';
import sessions from './routes/sessions';
import { appConfig } from './services/config';
import simpleui from './routes/simpleui.js';

const log = pino()

express()
    .use(pinoHttp(log))
    .use('/auth', auth)
    .use('/',simpleui)
    .use('/flags', flags)
    .use('/sessions', sessions)
    .use(cookieParser())
    .listen(appConfig.serverPort, () =>
      log.child({ category: 'application', action: 'started' }).info('server started'))
