const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const users = [];

app.use(express.static(__dirname));

const PORT = 3000;

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  socket.on("join", (data) => {
    const { x, y, color } = data;

    users.push({ x, y, color, id: socket.id });
    console.log(users);
    io.emit("plotPlayers", users);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
