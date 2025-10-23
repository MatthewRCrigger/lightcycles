/**
 * Vite plugin to inject environment configuration as a JavaScript module
 * This allows dynamic URL configuration without hardcoding values
 */

export default function configPlugin(env) {
  return {
    name: 'inject-config',
    resolveId(id) {
      if (id === 'virtual-config') {
        return id;
      }
    },
    load(id) {
      if (id === 'virtual-config') {
        return `
          export const config = {
            canonicalUrl: '${env.VITE_CANONICAL_URL || 'https://example.com/'}',
            siteUrl: '${env.VITE_SITE_URL || 'https://example.com/'}',
            authorUrl: '${env.VITE_AUTHOR_URL || 'https://example.com/'}',
          };

          // Make config available globally
          window.__CONFIG__ = config;
        `;
      }
    },
  };
}
