# Real-Time Multiplayer Bingo Web App

A multiplayer Bingo web application that supports up to 10 players per room using a 7×7 grid. Players can create rooms, join existing rooms with a unique room code, play Bingo in real-time, and see a live leaderboard.

## Features

- 7×7 Bingo card for each player
- User registration with username
- Room creation and joining via unique 6-character room codes
- Real-time gameplay with WebSockets
- Live leaderboard with scoring system
- Responsive design for desktop and mobile
- Reconnection handling

## Tech Stack

### Backend
- Node.js
- Express
- Socket.IO (WebSockets)
- In-memory storage (no database required)

### Frontend
- React (with hooks and functional components)
- Socket.IO client
- CSS for responsive design

## Installation and Setup

1. Clone the repository
   ```
   git clone <repository-url>
   cd bingo
   ```

2. Install dependencies for both server and client
   ```
   npm run install-all
   ```

3. Start the development server
   ```
   npm run dev
   ```

   This will start the backend server on port 5000 and the React frontend on port 3000.

## How to Play

1. Enter a username
2. Create a new room or join an existing one with a room code
3. Once all players have joined, the room creator (host) can start the game
4. Players take turns drawing numbers from 1-49
5. When it's your turn, click the "Draw Number" button
6. Mark the numbers on your Bingo card as they are drawn
7. Call "Bingo" when you have a complete row, column, diagonal, or full house
8. Points are awarded based on who claims Bingo first

## Scoring System

- First correct Bingo: 100 points
- Second correct Bingo: 75 points
- Third correct Bingo: 50 points
- All subsequent correct Bingos: 25 points

## Deployment

You can deploy this application to Render:

1. Create a new Web Service on Render
2. Link your repository
3. Use the following settings:
   - Build Command: `npm install && npm run render-postbuild`
   - Start Command: `npm start`

## License

MIT