const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;
let hasGameStarted = false;
let users = [];

// Define the balls with unique initial positions and colors
const balls = [
  { x: 10, y: 10, radius: 5, color: "blue", dx: 0, dy: 0 },
  { x: 290, y: 10, radius: 5, color: "red", dx: 0, dy: 0 },
  { x: 10, y: 290, radius: 5, color: "yellow", dx: 0, dy: 0 },
  { x: 150, y: 10, radius: 5, color: "green", dx: 0, dy: 0 },
];

const cellSize = 20;
const cols = Math.floor(300 / cellSize);
const rows = Math.floor(300 / cellSize);
let cells = [];

class Cell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.visited = false;
    this.walls = { top: true, right: true, bottom: true, left: true };
  }
}

function setup() {
  for (let x = 0; x < cols; x++) {
    cells[x] = [];
    for (let y = 0; y < rows; y++) {
      cells[x][y] = new Cell(x, y);
    }
  }
  genMaze(0, 0);
}

function genMaze(x, y) {
  const stack = [];
  const directions = ["top", "right", "bottom", "left"];
  const getNewCoords = (x, y, dir) => {
    switch (dir) {
      case "top": return [x, y - 1];
      case "right": return [x + 1, y];
      case "bottom": return [x, y + 1];
      case "left": return [x - 1, y];
    }
  };

  const removeWalls = (current, next, dir) => {
    current.walls[dir] = false;
    const opposite = { top: "bottom", right: "left", bottom: "top", left: "right" };
    next.walls[opposite[dir]] = false;
  };

  const startCell = cells[x][y];
  startCell.visited = true;
  stack.push(startCell);

  while (stack.length) {
    const current = stack[stack.length - 1];
    const [cx, cy] = [current.x, current.y];
    const unvisitedNeighbors = directions.map((dir) => {
      const [nx, ny] = getNewCoords(cx, cy, dir);
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !cells[nx][ny].visited
        ? { dir, cell: cells[nx][ny] }
        : null;
    }).filter(Boolean);

    if (unvisitedNeighbors.length) {
      const { dir, cell } = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
      removeWalls(current, cell, dir);
      cell.visited = true;
      stack.push(cell);
    } else {
      stack.pop();
    }
  }
}

setup();

app.use(express.static(__dirname));

io.on("connection", (socket) => {
  console.log("User connected: ", socket.id);
  socket.emit("grid", cells); // Send maze data to the client

  socket.on("startGame", () => {
    hasGameStarted = true;
    io.emit("gameStarted");
  });

  socket.on("join", () => {
    if (hasGameStarted) {
      socket.emit("joinDenied");
      return;
    }
    users.push({ ...balls[users.length], id: socket.id });
    io.emit("plotPlayers", users);
  });

  socket.on("ballMove", (data) => {
    users = users.map(user => (user.id === data.id ? data : user));
    io.emit("plotPlayers", users);
  });

  socket.on("win", (data) => {
    io.emit("message", `${data.color} wins!`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    users = users.filter(user => user.id !== socket.id);
    io.emit("plotPlayers", users);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
