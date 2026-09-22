/**
 * Vite plugin to inject environment configuration as a JavaScript module.
 * This allows dynamic URL configuration without hardcoding values.
 */

/** Used for any config URL the environment does not supply. */
const FALLBACK_URL = 'https://example.com/';

/** The virtual module specifier `js/main.js` imports. */
const VIRTUAL_ID = 'virtual-config';

/**
 * Serialises a value as a JavaScript literal.
 *
 * This must go through JSON.stringify rather than being interpolated into a
 * quoted string. Env values are substituted into generated source, so a value
 * containing a quote, backslash or newline would either break the module or
 * close the string literal early and let the rest execute as code — an
 * apostrophe in a hostname is enough to break the build, and a crafted value
 * runs arbitrary JavaScript in the shipped bundle.
 *
 * @param {string} value
 * @returns {string} a safely quoted JS string literal
 */
function toJsString(value) {
  return JSON.stringify(String(value));
}

export default function configPlugin(env) {
  return {
    name: 'inject-config',

    resolveId(id) {
      if (id === VIRTUAL_ID) {
        return id;
      }
    },

    load(id) {
      if (id !== VIRTUAL_ID) return;

      const config = {
        canonicalUrl: env.VITE_CANONICAL_URL || FALLBACK_URL,
        siteUrl: env.VITE_SITE_URL || FALLBACK_URL,
        authorUrl: env.VITE_AUTHOR_URL || FALLBACK_URL,
      };

      const entries = Object.entries(config)
        .map(([key, value]) => `  ${key}: ${toJsString(value)},`)
        .join('\n');

      return `export const config = {
${entries}
};

// Make config available globally
window.__CONFIG__ = config;
`;
    },
  };
}
