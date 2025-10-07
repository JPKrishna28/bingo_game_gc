# Bingo Game Server

This is the backend server for the Bingo Game application.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

## Environment Variables

Create a `.env` file with the following variables:

```
PORT=5000
```

## Deployment

This server can be deployed to platforms like Heroku, Render, or Railway.

### Deploying to Heroku

1. Create a Heroku account if you don't have one
2. Install the Heroku CLI
3. Login to Heroku:
   ```
   heroku login
   ```
4. Create a new Heroku app:
   ```
   heroku create your-app-name
   ```
5. Push to Heroku:
   ```
   git push heroku main
   ```

### Connecting with Frontend

When deploying the frontend separately, make sure to update the `REACT_APP_API_URL` environment variable in your frontend's `.env.production` to point to this backend's URL.

Example:
```
REACT_APP_API_URL=https://your-backend-url.herokuapp.com
```