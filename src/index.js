import 'dotenv/config';
import  express  from 'express';
import cookieParser from 'cookie-parser';
//import  passport  from 'passport';
import  pino  from 'pino';
import  pinoHttp  from 'express-pino-logger';

import  auth  from './routes/auth_aad.js';
import  flags  from './routes/flags.js';
import simpleui from './routes/simpleui.js';

const log = pino()

// express()
//   .use(pinoHttp(log))
//   .use(passport.initialize())
//   .use('/auth', auth)
//   .use('/flags', flags)
//   .listen(3000, () =>
//     log.child({ category: 'application', action: 'started' }).info('server started'))

express()
    .use(pinoHttp(log))
    .use('/auth', auth)
    .use('/',simpleui)
    .use('/flags', flags)
    .use(cookieParser())
    .listen(3000, () =>
      log.child({ category: 'application', action: 'started' }).info('server started'))
