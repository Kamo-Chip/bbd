// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

let players = {};

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);
    
    // Add new player to the game
    players[socket.id] = { x: 20, y: 20, dx: 0, dy: 0, color: getRandomColor(), isWinner: false };
    io.emit('updatePlayers', players);
    
    // Handle player movement
    socket.on('movePlayer', (data) => {
        if (players[socket.id]) {
            players[socket.id].dx = data.dx;
            players[socket.id].dy = data.dy;
            io.emit('updatePlayers', players);
        }
    });
    
    // Handle player disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

const getRandomColor = () => {
    const colors = ["blue", "red", "yellow", "green"];
    return colors[Math.floor(Math.random() * colors.length)];
};

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
