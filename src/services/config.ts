
const appConfig = {
  redisUrl: getEnv('REDIS_URL'),
  isRedisCluster: process.env.REDIS_CLUSTER === 'true',
  domainWhitelist: getList('DOMAIN_WHITELIST'),
  serverPort: getEnv('PORT'),
  baseUrl: getEnv('BASE_URL'), 
  CLIENT_ID: getEnv('CLIENT_ID'),
  CLIENT_SECRET: getEnv('CLIENT_SECRET'),
  TENANT_ID: getEnv('TENANT_ID'),
  APP_NAME: getEnv('APP_NAME')
}
export {appConfig};

function getEnv (key:string) {
  const value = process.env[key]
  if (!value) {
    throw new Error(`missing required environment variable ${key}`)
  }

  return value
}

function getList (key:string) {
  const value = process.env[key]
  return value
    ? value.split(',').map(x => x.trim())
    : []
}
