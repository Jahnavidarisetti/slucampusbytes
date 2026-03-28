# SLU Campus Bytes

SLU Campus Bytes is a full-stack starter for a campus-focused experience, with a React + Vite client and an Express + Socket.IO server. The current UI is a polished layout shell, and the API includes test routes to validate the backend wiring.

**Tech Stack**
- Client: React, Vite, Tailwind CSS
- Server: Express, Socket.IO, CORS, .env

**Repository Structure**
```
.
├─ client/                # React + Vite frontend
│  ├─ src/                # App, styles, assets
│  └─ package.json        # Client scripts and deps
├─ server/                # Express + Socket.IO backend
│  ├─ routes/             # API routes
│  ├─ index.js            # Server entry
│  └─ .env                # Server environment variables
└─ .github/workflows/ci.yml
```

**Prerequisites**
- Node.js 20+ (CI uses Node 24)
- npm (bundled with Node)

**Quick Start**
1. Install dependencies in each app:
```
cd client
npm install
cd ../server
npm install
```
2. Start the backend:
```
cd server
npm run dev
```
3. Start the frontend:
```
cd client
npm run dev
```
4. Open the app in your browser:
```
http://localhost:5173
```

**Environment Variables**
- `client/.env`
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
- `server/.env`
```
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**API**
| Method | Endpoint    | Description           | Example Response |
| --- | --- | --- | --- |
| GET | `/api/test` | Test route | `{ "message": "GET route working!" }` |
| POST | `/api/test` | Echo JSON body | `{ "message": "POST route working!", "receivedData": { ... } }` |

**Socket.IO**
- The Socket.IO server is attached to the same Express server.
- Connections are logged on connect/disconnect.

**Scripts**

Client (`client/package.json`)

`npm run dev` Start Vite dev server  
`npm run build` Build for production  
`npm run preview` Preview production build  
`npm run lint` Lint client code

Server (`server/package.json`)

`npm run dev` Start server with nodemon  
`npm start` Start server with node
