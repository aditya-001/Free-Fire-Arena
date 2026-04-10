# Free Fire Tournament Platform

A full-stack Free Fire tournament platform built with React, Express, MongoDB, Socket.IO and JWT authentication. The UI uses the provided Free Fire artwork as a full-screen blurred background with dark mode enabled by default and a light theme toggle in the navbar.

## Features

- JWT-based register/login with bcrypt password hashing
- Responsive React frontend with functional components and hooks
- Full-screen blurred Free Fire background image across the app
- Tournament listing, join flow and admin-only tournament creation
- Leaderboard filters for All India, State and City
- Profile dashboard with image upload, bio, UID, skills and achievements
- Follow/unfollow, player search, notifications and match history
- Private real-time chat with Socket.IO
- MongoDB models with production-ready auth and tournament workflows

## Tech Stack

- Frontend: React + Vite + Axios + Framer Motion
- Backend: Node.js + Express + Socket.IO
- Database: MongoDB + Mongoose
- Auth: JWT + bcryptjs

## Project Structure

```text
client/
server/
  config/
  controllers/
  middleware/
  models/
  routes/
  socket/
  utils/
```

## Setup

1. Install MongoDB locally and make sure it is running on `mongodb://127.0.0.1:27017`.
2. From the project root, install all workspace dependencies:

```bash
npm install
```

1. Create backend env file:

```bash
cp server/.env.example server/.env
```

1. Create frontend env file:

```bash
cp client/.env.example client/.env
```

1. Update secrets or URLs inside those files if needed.

## Run The App

Run frontend and backend together:

```bash
npm run dev
```

Run only backend:

```bash
npm run dev:server
```

Run only frontend:

```bash
npm run dev:client
```

Build frontend for production:

```bash
npm run build
```

Start backend in production mode:

```bash
npm start
```

## Default URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- Uploaded images: `http://localhost:5000/uploads/...`

## Initial Admin Setup

1. Open `http://localhost:5173/auth/admin-register`.
2. Use the value from `ADMIN_SECRET_KEY` in `server/.env`.
3. Create your first admin account credentials.

## Notes

- The backend does not auto-create demo users, tournaments, or match data.
- Profile image uploads are stored in `server/uploads`.
- State and City leaderboard filters use the logged-in user's saved location.
