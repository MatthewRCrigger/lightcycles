import { defineConfig, loadEnv } from 'vite';
import configPlugin from './vite-plugin-config.js';
import htmlConfigPlugin from './vite-plugin-html-config.js';

export default defineConfig(({ command, mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Register custom plugins for configuration injection
    plugins: [
      configPlugin(env),
      htmlConfigPlugin(env),
    ],

    // Base public path - adjust if deploying to a subdirectory
    base: '/',

    // Server configuration
    server: {
      port: 3000,
      open: true, // Auto-open browser on server start
    },

    // Build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // Generate sourcemaps for debugging production builds
      sourcemap: false,
      // Optimize chunk size
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate game logic into its own chunk for better caching
            'game-core': [
              './js/board.js',
              './js/light-cycle.js',
              './js/collision-grid.js',
            ],
            'game-ai': [
              './js/enhanced-ai.js',
              './js/ai-integration.js',
            ],
            'game-ui': [
              './js/game-controller.js',
              './js/canvas-renderer.js',
            ],
          },
        },
      },
    },

    // Asset handling
    assetsInclude: ['**/*.png', '**/*.jpg', '**/*.svg'],

    // Optimizations
    optimizeDeps: {
      include: [],
    },
  };
});
