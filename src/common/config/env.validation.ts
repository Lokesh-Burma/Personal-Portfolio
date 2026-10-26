type Env = Record<string, string | undefined>;

const required = ['ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH', 'SESSION_SECRET'];

export function validateEnv(env: Env) {
  for (const key of required) {
    if (!env[key]) {
      throw new Error(key + ' is required');
    }
  }

  const storage=env.BLOG_STORAGE || 'postgres';
  if(!['postgres','dynamodb'].includes(storage))throw new Error('BLOG_STORAGE must be postgres or dynamodb');
  if(storage==='postgres' && !env.DATABASE_URL)throw new Error('DATABASE_URL is required');
  if(storage==='dynamodb' && !env.BLOG_TABLE_NAME)throw new Error('BLOG_TABLE_NAME is required');
  if(storage==='dynamodb' && env.AWS_REGION && env.AWS_REGION!=='ap-southeast-2')throw new Error('Selected AWS Region must be Sydney');
  return {
    ...env,
    BLOG_STORAGE: storage,
    NODE_ENV: env.NODE_ENV || 'development',
    PORT: Number(env.PORT || 4000),
    SESSION_TTL_SECONDS: Number(env.SESSION_TTL_SECONDS || 60 * 60 * 8),
    CORS_ORIGIN: env.CORS_ORIGIN || 'http://localhost:3000',
  };
}
