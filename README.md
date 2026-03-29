# SLU Campus Bytes

SLU Campus Bytes is a full-stack starter project for a campus-focused experience. It includes a React + Vite frontend and an Express + Socket.IO backend with basic API routes and a Supabase health check.

## Tech stack
- Frontend: React, Vite, Tailwind CSS
- Backend: Express, Socket.IO, CORS, dotenv, Supabase

## Repository structure
```
.
├─ client/                # React + Vite frontend
│  ├─ src/                # App, styles, assets
│  └─ package.json        # Client scripts and dependencies
├─ server/                # Express + Socket.IO backend
│  ├─ routes/             # API route definitions
│  ├─ index.js            # Server entry point
│  ├─ supabaseClient.js   # Server-side Supabase client
│  └─ .env                # Server environment variables
```

## Prerequisites
- Node.js 20+
- npm (bundled with Node.js)

## Setup
Install dependencies for both frontend and backend:

```bash
cd client
npm install
cd ../server
npm install
```

## Run
Start the backend in one terminal:

```bash
cd server
npm run dev
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

Open the app at:

```text
http://localhost:5173
```

## Environment variables
### `server/.env`
The backend requires the following values:

```env
PORT=5000
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### `client/.env`
The frontend can use these values if you connect to Supabase or the local API:

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## API routes
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/test` | Returns a test success message |
| POST | `/api/test` | Echoes the JSON body back |
| GET | `/api/supabase/health` | Checks Supabase connectivity |

## Socket.IO
- Socket.IO is initialized on the same server as Express.
- Connections are logged when clients connect and disconnect.

## Scripts
### Frontend (`client/package.json`)
- `npm run dev` — start Vite development server
- `npm run build` — build production assets
- `npm run preview` — preview the production build
- `npm run lint` — lint frontend code

### Backend (`server/package.json`)
- `npm run dev` — start server with nodemon
- `npm start` — start server with node


