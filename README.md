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

## Frontend routes
- `/` — Home layout shell (campus feed scaffold)
- `/login` — SLU login (email or username)
- `/register` — SLU registration (3-step flow)

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

**Enable Supabase**
1. Create a Supabase project.
2. In Supabase Studio, copy the Project URL and keys.
3. Populate `client/.env` and `server/.env` with the values above.
4. Install the Supabase CLI:
   - macOS (Homebrew): `brew install supabase/tap/supabase`
   - Windows (Scoop): `scoop install supabase`
   - Windows (Chocolatey): `choco install supabase-cli`
5. Initialize Supabase in the repo (first time only):
   - `supabase init`
6. Create migrations from the terminal (Supabase CLI):
   - `supabase migration new add_profile_fields`
7. Paste the SQL into the generated files in `supabase/migrations/`.
8. Apply migrations in Supabase Studio -> SQL Editor.
9. Optional: In Authentication -> Settings, enforce email confirmation if required.

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
- `npm run test` — run frontend tests 

### Backend (`server/package.json`)
- `npm run dev` — start server with nodemon
- `npm start` — start server with node
- `npm run test` — run backend tests

## Running tests
Frontend tests (Vitest):

```bash
cd client
npm run test
```

Backend tests (Node):

```bash
cd server
npm run test
```

