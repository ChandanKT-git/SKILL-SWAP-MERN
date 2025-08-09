# SkillSwap

A peer-to-peer skill exchange platform built with the MERN stack.

## Project Structure

- `frontend/` - React application with Vite
- `backend/` - Express.js API server
- `docs/` - Project documentation

## Getting Started

### Prerequisites

- Node.js 18+ LTS
- MongoDB 6+
- npm or yarn

### Installation

1. Clone the repository
2. Install backend dependencies: `cd backend && npm install`
3. Install frontend dependencies: `cd frontend && npm install`
4. Set up environment variables (see .env.example files)
5. Start MongoDB service
6. Run development servers:
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm run dev`

## Development

- Backend runs on http://localhost:5000
- Frontend runs on http://localhost:3000
- MongoDB connection on mongodb://localhost:27017/skillswap

## Tech Stack

- **Frontend**: React 18+, Vite 4+, Tailwind CSS 3+
- **Backend**: Node.js 18+, Express 4+, MongoDB 6+, Mongoose 7+
- **Authentication**: JWT, bcryptjs
- **Real-time**: Socket.io 4+
- **File Storage**: Cloudinary
- **Testing**: Jest 29+, React Testing Library 13+