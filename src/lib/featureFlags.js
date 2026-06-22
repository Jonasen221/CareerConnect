// Centralised feature-flag helpers. Reads Vite env vars at build time.
//
// Convention: flags default to ENABLED unless explicitly set to the string
// "false" (case-insensitive) in the environment. This keeps the dev/MVP
// experience friction-free while still letting us hide a feature in a
// specific env without code changes.
//
// Add new flags here as a single source of truth — don't read
// `import.meta.env` directly from page/component code.

const readBool = (envValue, defaultTrue = true) => {
  if (envValue === undefined || envValue === null || envValue === '') {
    return defaultTrue;
  }
  const v = String(envValue).trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
  return defaultTrue;
};

export const FEATURE_PROJECTS = readBool(import.meta.env?.VITE_FEATURE_PROJECTS, true);
