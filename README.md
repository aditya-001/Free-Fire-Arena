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
- MongoDB models with seeded demo users and tournaments

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

3. Create backend env file:

```bash
cp server/.env.example server/.env
```

4. Create frontend env file:

```bash
cp client/.env.example client/.env
```

5. Update secrets or URLs inside those files if needed.

If local MongoDB is not installed, the backend now falls back to an in-memory MongoDB instance in development mode so the project can still start.

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

## Seeded Demo Accounts

- Admin: `admin@freefire.gg` / `admin123`
- Player: `raistar@freefire.gg` / `player123`

## Notes

- The backend seeds sample users, notifications and tournaments on first run when the database is empty.
- Profile image uploads are stored in `server/uploads`.
- State and City leaderboard filters use the logged-in user's saved location.
