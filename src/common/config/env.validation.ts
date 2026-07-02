type Env = Record<string, string | undefined>;

const required = ['DATABASE_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH', 'SESSION_SECRET'];

export function validateEnv(env: Env) {
  for (const key of required) {
    if (!env[key]) {
      throw new Error(key + ' is required');
    }
  }

  return {
    ...env,
    NODE_ENV: env.NODE_ENV || 'development',
    PORT: Number(env.PORT || 4000),
    SESSION_TTL_SECONDS: Number(env.SESSION_TTL_SECONDS || 60 * 60 * 8),
    CORS_ORIGIN: env.CORS_ORIGIN || 'http://localhost:3000',
  };
}
