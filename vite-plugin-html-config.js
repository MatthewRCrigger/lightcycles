/**
 * Vite plugin to inject environment variables directly into HTML at build time
 * This is better for SEO because search engines see the final HTML without needing JavaScript
 */

export default function htmlConfigPlugin(env) {
  return {
    name: 'inject-html-config',
    apply: 'build', // Only apply during build
    transformIndexHtml(html) {
      // Replace placeholder URLs in HTML with actual values from environment
      let modifiedHtml = html;

      // Replace canonical URL
      if (env.VITE_CANONICAL_URL) {
        modifiedHtml = modifiedHtml.replace(
          /href="\/"(?=\s*id="canonical-link")/,
          `href="${env.VITE_CANONICAL_URL}"`
        );
      }

      return modifiedHtml;
    },
  };
}
