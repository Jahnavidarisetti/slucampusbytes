function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

function emitNewPost(io, post) {
  io.emit('new_post', post);
}

module.exports = {
  setupSocketHandlers,
  emitNewPost
};
