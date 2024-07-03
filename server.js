const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

let balls = [
  { x: 20, y: 20, radius: 10, color: "blue", dx: 0, dy: 0, isWinner: false },
  { x: 580, y: 20, radius: 10, color: "red", dx: 0, dy: 0, isWinner: false },
  { x: 20, y: 580, radius: 10, color: "yellow", dx: 0, dy: 0, isWinner: false },
  { x: 300, y: 20, radius: 10, color: "green", dx: 0, dy: 0, isWinner: false },
];

io.on('connection', (socket) => {
  console.log('New client connected');

  // Send initial game state
  socket.emit('init', { balls });

  // Handle ball updates
  socket.on('updateBall', (updatedBall) => {
    const ballIndex = balls.findIndex(ball => ball.color === updatedBall.color);
    if (ballIndex !== -1) {
      balls[ballIndex] = updatedBall;
      io.emit('updateBall', updatedBall); // Broadcast updated ball state to all clients
    }
  });

  // Handle game reset
  socket.on('resetGame', () => {
    balls = [
      { x: 20, y: 20, radius: 10, color: "blue", dx: 0, dy: 0, isWinner: false },
      { x: 580, y: 20, radius: 10, color: "red", dx: 0, dy: 0, isWinner: false },
      { x: 20, y: 580, radius: 10, color: "yellow", dx: 0, dy: 0, isWinner: false },
      { x: 300, y: 20, radius: 10, color: "green", dx: 0, dy: 0, isWinner: false },
    ];
    io.emit('resetGame', balls); // Broadcast reset game state to all clients
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
