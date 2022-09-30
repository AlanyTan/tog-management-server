
const appConfig = {
  redisUrl: getEnv('REDIS_URL'),
  isRedisCluster: process.env.REDIS_CLUSTER === 'true',
  domainWhitelist: getList('DOMAIN_WHITELIST'),
  SERVER_PORT: getEnv('PORT'),
  BASE_URL: getEnv('BASE_URL'), 
  CLIENT_ID: getEnv('CLIENT_ID'),
  CLIENT_SECRET: getEnv('CLIENT_SECRET'),
  TENANT_ID: getEnv('TENANT_ID'),
}
export {appConfig};

function getEnv (key) {
  const value = process.env[key]
  if (!value) {
    throw new Error(`missing required environment variable ${key}`)
  }

  return value
}

function getList (key) {
  const value = process.env[key]
  return value
    ? value.split(',').map(x => x.trim())
    : []
}
