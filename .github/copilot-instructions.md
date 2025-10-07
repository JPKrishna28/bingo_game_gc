<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Bingo Web App - Development Guide

This project is a real-time multiplayer Bingo web application that supports up to 10 players per room using a 7×7 grid.

## Project Structure

- `/server` - Node.js + Express + Socket.IO backend
- `/client` - React frontend
- Main package.json at the root for running both frontend and backend

## Key Features

- 7×7 Bingo card per player
- User registration (username only)
- Room creation/joining with unique 6-character codes
- Real-time gameplay with WebSockets
- Live leaderboard with scoring system
- Reconnect handling for players

## Development Workflow

1. Make changes to frontend in `/client/src`
2. Make changes to backend in `/server`
3. Run both with `npm run dev` for testing
4. Deploy with `npm run build` for production

## Socket.IO Events

### Client → Server
- create_room
- join_room
- start_game
- bingo_claim

### Server → Client
- room_update
- game_started
- number_drawn
- claim_result
- leaderboard_update
- error

## Game Logic

The game follows standard Bingo rules with these modifications:
- 7×7 grid (numbers 1-49)
- Score system: 100, 75, 50, or 25 points per valid claim
- Server validates all claims against the drawn numbers