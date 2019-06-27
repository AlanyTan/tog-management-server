const express = require('express')
const cookieParser = require('cookie-parser')
const EventEmitter = require('events')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
const BearerStrategy = require('passport-http-bearer').Strategy
const redis = require('redis')
const { promisify } = require('util')

const config = require('../services/config')

const redisClient = redis.createClient(config.redisUrl)
redisClient.on('error', err => console.log('error') || console.error(err))

passport.use(new GoogleStrategy({
  clientID: config.oauthClientId,
  clientSecret: config.oauthClientSecret,
  callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, verify) => {
  const key = `tog:user:${accessToken}`
  const email = profile._json.email
  return promisify(redisClient.set).bind(redisClient)(key, email)
    .then(() => promisify(redisClient.expire).bind(redisClient)(key, 60 * 60 * 24) /* 24 hours */)
    .then(() => verify(null, { accessToken, email }))
}))

passport.use(new BearerStrategy((token, done) => {
  return promisify(redisClient.get).bind(redisClient)(`tog:user:${token}`)
    .then(email => email ? done(null, { email }) : done(null, null))
    .catch(err => done(err))
}))

const broker = new EventEmitter()

const authenticate = passport.authenticate('google', { session: false, failureRedirect: '/auth/login' })
const scope = [
  'https://www.googleapis.com/auth/plus.login',
  'https://www.googleapis.com/auth/userinfo.email'
]

module.exports = express.Router()
  .get('/login',
    ({ query: { rd, cli_token: token } }, res, next) => {
      const maxAge = 1000 * 60 * 5
      res.cookie('cli_token', token, { maxAge })
      res.cookie('redirect_url', rd, { maxAge }) /* 5 minutes */
      return next()
    },
    passport.authenticate('google', { session: false, scope }))

  .get('/google/callback', authenticate, cookieParser(),
    ({ cookies, user }, res) => {
      broker.emit(cookies['cli_token'], user.accessToken)
      return res.redirect(cookies['redirect_url'])
    })

  .get('/cli-return', (req, res, next) => {
    res.status(200).send(`
    <html>
      <head>
        <title>Login successful</title>
      </head>
      <body>
        <h1>Login successful</h1>
        <p>You may now return to the command line.</p>
      </body>
    </html>
  `)
  })

  .get('/cli-notify/:token', ({ params: { token } }, res, next) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    res.write('retry: 10000\n\n')

    const listener = authToken => res.write(`data: ${JSON.stringify({ authToken })}\n\n`)

    res.on('close', () => broker.removeListener(token, listener))

    broker.addListener(token, listener)
  })
