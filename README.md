# Chess

A full-stack chess platform with local multiplayer, online multiplayer, Stockfish AI, and PGN analysis.

**Live:** [aminedarani.github.io/Chess](https://aminedarani.github.io/Chess/)

## Game Modes

| Mode | Description |
|------|-------------|
| **Local** | Two players on the same device (pass-and-play) |
| **Online** | Real-time multiplayer via WebSocket — share a link to play |
| **Vs Stockfish** | Play against the Stockfish 18 engine |
| **Review PGN** | Paste a PGN to analyze with Stockfish — evaluation bar, move classification, best moves (Works with lichess and Chess.com games)|

All modes support configurable time controls (1\|0, 3\|2, 5\|0, 10\|0, 15\|10, or no limit).

## Tech Stack

### Frontend

- React 19, TypeScript, Vite
- [react-chessboard](https://www.npmjs.com/package/react-chessboard) for the board UI
- [chess.js](https://www.npmjs.com/package/chess.js) for move validation and game logic
- [Stockfish 18](https://www.npmjs.com/package/stockfish) (WASM, Web Worker) for AI and analysis
- Socket.IO client for real-time online play
- React Router for SPA routing

### Backend

- Node.js, Express, TypeScript
- Socket.IO for WebSocket communication
- Server-authoritative clock tracking for online games
- In-memory game and chat storage

## Project Structure

```
Chess/
├── chess-board/                # React frontend
│   ├── src/
│   │   ├── api/                # REST API client
│   │   ├── components/         # UI components (board, clocks, chat, modals, etc.)
│   │   ├── game/               # Game controllers (local, vs Stockfish)
│   │   ├── hooks/              # React hooks (clocks, socket, move history, etc.)
│   │   ├── pages/              # Route pages (Home, VsPlayer, VsStockfish, Online, Review)
│   │   ├── services/engine/    # Stockfish UCI interface
│   │   └── utils/chess/        # Chess utilities (notation, classification, PGN parsing)
│   └── public/stockfish/       # Stockfish WASM files
├── server/                     # Node.js backend
│   └── src/
│       ├── index.ts            # Express + Socket.IO server
│       ├── games.ts            # Game state, moves, clocks, rematch logic
│       └── chat.ts             # In-game chat storage
└── .github/workflows/          # GitHub Actions (Pages deployment)
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Local Development

1. **Install dependencies:**

```bash
cd chess-board && npm install
cd ../server && npm install
```

2. **Start the backend:**

```bash
cd server
npm run dev
```

The server runs on `http://localhost:3001`.

3. **Start the frontend:**

```bash
cd chess-board
npm run dev
```

The frontend runs on `http://localhost:5173` with API requests proxied to the backend.

### Production Build

```bash
cd chess-board
npm run build
```

The built files are output to `chess-board/dist/`.

## Deployment

- **Frontend** is deployed to GitHub Pages via GitHub Actions (auto-deploys on push to `main`)
- **Backend** is deployed to [Render](https://render.com) — the frontend connects to it via the `VITE_API_URL` environment variable

## Features

- Drag-and-drop piece movement with legal move highlighting
- Pawn promotion modal
- Move history with step-back/step-forward navigation
- Server-authoritative clocks for online play (persists across page refresh)
- In-game chat for online matches
- Game result detection (checkmate, stalemate, draw, resignation, timeout)
- Rematch system with chat notifications
- Post-game review with Stockfish analysis, evaluation bar/graph, and move classification (blunder, mistake, inaccuracy, good, best, etc.)
- PGN import and analysis
