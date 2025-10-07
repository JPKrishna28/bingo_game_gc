# Running the Bingo Web App

This document provides instructions for running the Bingo web application locally or deploying it to Render.

## Local Development

### Prerequisites
- Node.js v14+ installed
- NPM v6+ installed

### Setup and Running

1. Install all dependencies for server and client:
   ```
   npm run install-all
   ```

2. Start both server and client in development mode:
   ```
   npm run dev
   ```
   This will run:
   - The backend server on port 5000
   - The frontend React app on port 3000

3. Open your browser and navigate to http://localhost:3000

## Production Deployment on Render

1. Create a new Web Service on Render

2. Connect your GitHub repository

3. Configure the following settings:
   - Build Command: `npm install && npm run render-postbuild`
   - Start Command: `npm start`
   - Environment Variables:
     - NODE_ENV: production
     - PORT: 5000 (or Render will provide a default)

4. Click "Create Web Service"

## Playing the Game

1. First user creates a room and becomes the host
2. Share the 6-character room code with other players
3. When all players have joined, the host can start the game
4. Numbers are drawn every 5 seconds
5. Mark numbers on your Bingo card as they're called
6. Claim Bingo when you have a complete row, column, diagonal or full house
7. Points are awarded for correct claims: 100, 75, 50 and 25 points

## Troubleshooting

- If reconnection doesn't work properly, try clearing your browser cache
- Check browser console for any error messages
- Ensure you have stable internet connection for WebSocket communication