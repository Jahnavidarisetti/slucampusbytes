require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const createPostsRouter = require('./routes/posts');
const createOrganizationsRouter = require('./routes/organizations');
const { setupSocketHandlers } = require('./sockets/postHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*", // later restrict to frontend URL
    methods: ["GET", "POST"]
  }
});

// Socket connection
setupSocketHandlers(io);

// Basic route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Import routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);
app.use('/api/posts', createPostsRouter(io));
app.use('/api/organizations', createOrganizationsRouter());

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});