# Light Cycles

A modern recreation of the classic TRON (1982) arcade game Light Cycles, built with vanilla JavaScript and Vite.

## Features

- Play against AI opponents with sophisticated pathfinding algorithms
- Five difficulty levels with dynamic enemy count and behavior
- Enhanced AI based on Google AI Challenge 2010 winning algorithms
- High-performance collision detection system
- Canvas-based rendering with smooth animations and light trails
- Immersive audio system with synthesized sound effects
- Responsive design with mobile touch controls
- Modern ES6 module architecture

## Tech Stack

- **Vanilla JavaScript (ES6+)** - No frameworks, pure JS
- **Vite** - Fast build tool and development server
- **Canvas API** - Hardware-accelerated 2D rendering
- **Web Audio API** - Dynamic audio management

## Quick Start

### Prerequisites

- Node.js 22.0.0 or higher
- npm (comes with Node.js)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd lightcycles
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The game will open automatically at `http://localhost:3000`

### Production Build

Build for production:
```bash
npm run build
```

The optimized output will be in the `dist/` folder, ready for deployment.

## Project Structure

```
lightcycles/
├── js/                         # Source JavaScript modules
│   ├── main.js                 # Application entry point
│   ├── game-controller.js      # Game loop and input handling
│   ├── board.js                # Game board and team management
│   ├── light-cycle.js          # Light cycle entity logic
│   ├── enhanced-ai.js          # Advanced AI pathfinding
│   ├── ai-integration.js       # AI system integration
│   ├── collision-grid.js       # Spatial hash collision detection
│   ├── canvas-renderer.js      # Canvas rendering system
│   ├── sound-generator.js      # Web Audio API synthesized sounds
│   ├── config.js               # Game configuration
│   ├── coordinate.js           # Grid coordinate utilities
│   ├── difficulty-description.js # Difficulty settings UI
│   └── performance-monitor.js  # FPS and performance tracking
├── css/
│   └── styles.css              # Game styling
├── media/                      # Audio files and assets
├── dist/                       # Production build output (generated)
├── index.html                  # Main HTML file
├── vite.config.js             # Vite configuration
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Game Controls

### Keyboard
- **Arrow Keys** or **WASD** - Control your light cycle
- **Spacebar** - Pause/Resume game

### Mobile
- **Touch Controls** - On-screen directional buttons
- **Pause Button** - Top-right corner of control pad

## Difficulty Levels

Choose from five AI difficulty levels:

- **Very Easy** - Slow AI with basic strategy (1 opponent)
- **Easy** - Moderate AI with improved tactics (1 opponent)
- **Medium** - Balanced gameplay with smart AI (1 opponent)
- **Hard** - Fast AI with advanced strategies (2 opponents)
- **Very Hard** - Expert AI with maximum challenge (3 opponents)

Higher difficulties introduce multiple AI opponents and more aggressive pathfinding.

## AI System

The enhanced AI uses sophisticated algorithms including:

- **Voronoi-based territory control** - AI claims and defends space
- **Flood fill analysis** - Evaluates available space in real-time
- **Minimax with alpha-beta pruning** - Strategic decision making
- **Adaptive behavior** - Difficulty-based strategy adjustments
- **Multi-agent coordination** - Team-based AI on harder difficulties

Based on winning strategies from the Google AI Challenge 2010.

## Audio System

Dynamic synthesized sound design using the Web Audio API:

- **Game Start** - Countdown beeps during initialization
- **Engine Sounds** - Accelerating motor sounds for player and AI cycles
- **Collision Effects** - Multi-layer explosion sounds on impact
- **Victory Sound** - Triumphant melodic fanfare for player wins
- **Defeat Sound** - Somber descending melody for player losses

All sounds are generated in real-time using JavaScript oscillators, eliminating the need for external audio files.

## Performance Optimizations

- **Spatial Hash Grid** - O(1) collision detection
- **RequestAnimationFrame** - Smooth 60 FPS rendering
- **Offscreen Canvas Rendering** - Background caching
- **Code Splitting** - Separate chunks for core, AI, and UI
- **Asset Optimization** - Minified and compressed output

## Browser Compatibility

Modern browsers with ES6 module support:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build optimized production bundle
npm run preview  # Preview production build locally
```

## Deployment

The game is configured for static hosting. The `dist/` folder contains everything needed:

1. Build the project: `npm run build`
2. Upload only the `dist/` folder to your web server
3. Point your domain/subdomain to the `dist/` folder

Compatible with:
- Static hosting (Netlify, Vercel, GitHub Pages)
- CDN deployment
- Traditional web servers (Apache, Nginx)

## Configuration

### Site Configuration

Environment variables can be used to inject deployment-specific URLs at build time:

```bash
# Copy and configure for your deployment
cp .env.example .env
```

See [CONFIGURATION.md](CONFIGURATION.md) for detailed setup instructions.

### Game Settings

Game mechanics can be adjusted in `js/config.js`:

- Board dimensions
- Player speeds
- AI difficulty parameters
- Collision detection settings
- Audio timing
- Debug options

## License

**Code:** MIT License (see [LICENSE](LICENSE) file)

This project is a fan-created recreation of the Light Cycles minigame for educational purposes. The MIT license covers the source code only, not the game concept or TRON brand.

- TRON is owned by Walt Disney Company
- Original arcade game by Bally Midway (1982)
- See LICENSE file for full disclaimer

## Credits

- Original TRON arcade game by Bally Midway (1982)
- AI algorithms inspired by Google AI Challenge 2010
- Slapped together by Matthew Crigger and Claude Code
- Play tested by Matthew Crigger, his daughter, and friends.

---

**Play online:** https://lightcycles.matthewrcrigger.com/
