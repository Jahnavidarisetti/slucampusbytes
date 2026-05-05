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
│  ├─ Dockerfile          # Client development container
│  └─ package.json        # Client scripts and dependencies
├─ server/                # Express + Socket.IO backend
│  ├─ routes/             # API route definitions
│  ├─ Dockerfile          # Server development container
│  ├─ index.js            # Server entry point
│  ├─ supabaseClient.js   # Server-side Supabase client
│  └─ .env                # Server environment variables
├─ docker-compose.yml     # Local Docker development setup
```

## Prerequisites
- Node.js 20+ and npm for the non-Docker local workflow
- Docker Desktop or Docker Engine with Docker Compose for the Docker workflow

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

## Run with Docker
Docker Compose starts both development servers without installing Node dependencies on your host machine. Supabase remains external and is configured with environment variables.

Create local environment files:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Fill in the Supabase and Gemini values in those files. Compose overrides the client API URL for Docker so the browser calls the published backend port:

```env
# docker-compose.yml
VITE_API_BASE_URL=http://localhost:5001
```

```env
# server/.env
PORT=5000
CLIENT_URL=http://localhost:5173
```

Build and start the client and server:

```bash
docker compose up --build
```

Open the frontend at:

```text
http://localhost:5173
```

Check the backend directly at:

```text
http://localhost:5001
```

Useful Docker commands:

```bash
docker compose up
docker compose down
docker compose logs -f server
docker compose logs -f client
```

The Compose setup bind-mounts `client/` and `server/` into their containers, so source changes continue to reload through Vite and nodemon. Container-only `node_modules` volumes keep dependencies out of your host checkout. Socket.IO runs on the same backend origin as the API, and the server allowlists `http://localhost:5173` for browser requests from the Vite container.

Docker publishes the backend on host port `5001` by default to avoid common macOS conflicts on port `5000`. The server still runs on port `5000` inside the container. To use a different host port, set `SERVER_HOST_PORT` when starting Compose:

```bash
SERVER_HOST_PORT=5050 docker compose up --build
```

## Push and run with Docker Hub
This project does not have a root `Dockerfile`. It has separate Dockerfiles for the frontend and backend:

```text
client/Dockerfile
server/Dockerfile
```

Because of this, build the client and server Docker images separately from the root project folder:

```bash
docker build -t <dockerhub-username>/<client-image-name>:latest ./client
docker build -t <dockerhub-username>/<server-image-name>:latest ./server
```

Push both images to Docker Hub:

```bash
docker push <dockerhub-username>/<client-image-name>:latest
docker push <dockerhub-username>/<server-image-name>:latest
```

Another person can pull both images:

```bash
docker pull <dockerhub-username>/<client-image-name>:latest
docker pull <dockerhub-username>/<server-image-name>:latest
```

Run the server first:

```bash
docker run -p 5001:5000 --env-file server/.env <dockerhub-username>/<server-image-name>:latest
```

Then run the client in another terminal:

```bash
docker run -p 5173:5173 --env-file client/.env -e VITE_API_BASE_URL=http://localhost:5001 <dockerhub-username>/<client-image-name>:latest
```

After both containers are running, open the web app at:

```text
http://localhost:5173
```

The person running the images needs the required `.env` files or equivalent environment values for both the client and server. Do not push `.env` files, API keys, database passwords, or other secrets to Docker Hub or GitHub. Share environment values separately and securely.

Replace `<dockerhub-username>`, `<client-image-name>`, and `<server-image-name>` with the Docker Hub account and image names you want to use.

## Frontend routes
- `/` — Home layout shell (campus feed scaffold)
- `/login` — SLU login (email or username)
- `/register` — SLU registration (3-step flow)

## Environment variables
### `server/.env`
The backend requires the following values:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_DEFAULT_USER_PASSWORD=<strong-random-password>
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.5-flash
```

You can start from `server/.env.example` and copy it to `server/.env`.

The default backend port in this repo is `5000`, so the frontend API base URL defaults to `http://localhost:5000`.

### `client/.env`
The frontend can use these values if you connect to Supabase or the local API:

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_BASE_URL=http://localhost:5000
```

You can start from `client/.env.example` and copy it to `client/.env`.

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
