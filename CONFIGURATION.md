# Configuration Guide

## Environment Variables

Light Cycles uses environment variables to inject configuration values at build time. This allows the same codebase to be deployed to different domains without modifying source files.

### Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your values:**
   ```env
   VITE_CANONICAL_URL=https://lightcycles.yourdomain.com/
   VITE_SITE_URL=https://lightcycles.yourdomain.com/
   VITE_AUTHOR_URL=https://yourdomain.com/
   ```

### Available Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_CANONICAL_URL` | Canonical URL for SEO (used in HTML head) | `https://example.com/` |
| `VITE_SITE_URL` | Main site URL | `https://example.com/` |
| `VITE_AUTHOR_URL` | Author/creator website URL | `https://example.com/` |

### How It Works

1. **Build Time**: When you run `npm run build`, Vite's custom plugin (`vite-plugin-config.js`) reads the `.env` file
2. **Injection**: The plugin injects these values into the application via a virtual module
3. **Global Access**: The config is available globally as `window.__CONFIG__`

### Example Usage

```javascript
// Access configuration in your code
const canonicalUrl = window.__CONFIG__.canonicalUrl;
const siteUrl = window.__CONFIG__.siteUrl;
const authorUrl = window.__CONFIG__.authorUrl;
```

### Development

During development (`npm run dev`), the `.env` file is automatically loaded by Vite.

### Deployment

**Important:** The `.env` file is NOT committed to version control (see `.gitignore`).

When deploying:
1. Copy `.env.example` to `.env` on the deployment server
2. Update the values to match your deployment domain
3. Run `npm run build` to create the optimized bundle with injected values
4. Deploy the `dist/` folder

### GitHub / Open Source

The `.env.example` file is committed to the repository as documentation of available configuration options. Each fork or deployment maintains its own `.env` file with their specific values.

## Game Configuration

Game mechanics can be configured in `js/config.js`:

- Board dimensions (`BOARD.DEFAULT_WIDTH`, `BOARD.DEFAULT_HEIGHT`)
- Rendering settings (`RENDERING.*`)
- Colors (`COLORS.*`)
- Difficulty levels (`DIFFICULTY.*`)
- AI behavior
- Audio settings
- Debug options

Most configuration changes don't require rebuilding the application, but some (like board dimensions) may require clearing browser cache.

## Debug Mode

Enable debug features by setting in `js/config.js`:

```javascript
DEBUG: {
  SHOW_COLLISION_GRID: true,  // Visualize collision detection
  SHOW_FPS: true,              // Show frame rate
  SHOW_PERFORMANCE_STATS: true, // Show memory usage
  LOG_GAME_EVENTS: true,        // Console logging
},
```

These can be toggled at runtime without rebuilding.
