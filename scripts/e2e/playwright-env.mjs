const SENSITIVE_ENV_NAMES = /^(?:SUPABASE_SERVICE_ROLE_KEY|E2E_)/;

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {Record<string, string>}
 */
export function buildWebServerEnv(env = process.env) {
  /** @type {Record<string, string>} */
  const result = {};
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined || SENSITIVE_ENV_NAMES.test(name)) continue;
    result[name] = value;
  }
  return result;
}
