/**
 * Vite plugin to inject environment variables directly into HTML at build time.
 * Doing this in HTML rather than at runtime means crawlers see the final
 * values without having to execute JavaScript.
 */

/** Used when VITE_CANONICAL_URL is unset, and as the SEO placeholder's stand-in. */
const FALLBACK_URL = 'https://example.com/';

/**
 * Escapes a value for use inside a double-quoted HTML attribute.
 *
 * Env values are substituted directly into markup, so a value containing `"`
 * would close the attribute early and let the rest be parsed as markup —
 * turning a stray quote in .env into injected HTML in the shipped page.
 * `&` goes first so the other replacements are not double-escaped.
 *
 * @param {string} value
 * @returns {string} the value, safe to place between double quotes
 */
function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function htmlConfigPlugin(env) {
  return {
    name: 'inject-html-config',
    apply: 'build', // Only applies during build; dev serves index.html as-is.

    // This MUST run before Vite's own `vite:build-html` plugin.
    //
    // index.html ships `<link rel="canonical" href="/">` as a placeholder.
    // build-html treats every href/src in the document as an asset reference
    // to resolve and fingerprint, so it tries to read "/" — the project root —
    // and the build dies with `EISDIR: illegal operation on a directory`.
    // Rewriting the placeholder to an absolute URL first means build-html sees
    // an external URL and leaves it alone.
    //
    // `enforce: 'pre'` plus the object form (`order: 'pre'`) is what actually
    // guarantees that ordering. The bare-function form of transformIndexHtml
    // runs in the normal plugin phase, which is already too late — that was
    // the original bug.
    enforce: 'pre',

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Falling back to an absolute URL matters: leaving "/" in place when
        // the env var is unset would resurrect the EISDIR crash, turning a
        // missing .env into a broken build.
        const canonicalUrl = escapeHtmlAttribute(
          env.VITE_CANONICAL_URL || FALLBACK_URL
        );

        // Match the canonical link by its id and rewrite only its href,
        // whatever order the attributes appear in. The previous version
        // required href to sit immediately before id, so reformatting the
        // tag would have silently stopped the substitution — and a silent
        // miss here is a failed build, not a cosmetic bug.
        return html.replace(
          /<link\b[^>]*\bid="canonical-link"[^>]*>/i,
          (tag) => tag.replace(/\bhref="[^"]*"/i, `href="${canonicalUrl}"`)
        );
      },
    },
  };
}
