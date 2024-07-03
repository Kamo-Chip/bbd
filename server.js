const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let hasGameStarted = false;

let users = [];
let tilts = []; // Store tilts from each client

const initialBalls = [
  { x: 10, y: 10, radius: 5, color: "blue", dx: 0, dy: 0 },
  { x: 290, y: 10, radius: 5, color: "red", dx: 0, dy: 0 },
  { x: 10, y: 290, radius: 5, color: "yellow", dx: 0, dy: 0 },
  { x: 150, y: 10, radius: 5, color: "green", dx: 0, dy: 0 },
];
let balls = JSON.parse(JSON.stringify(initialBalls));

app.use(express.static(__dirname));

const PORT = 3000;

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
      case "top":
        return [x, y - 1];
      case "right":
        return [x + 1, y];
      case "bottom":
        return [x, y + 1];
      case "left":
        return [x - 1, y];
    }
  };

  const removeWalls = (current, next, dir) => {
    current.walls[dir] = false;
    const opposite = {
      top: "bottom",
      right: "left",
      bottom: "top",
      left: "right",
    };
    next.walls[opposite[dir]] = false;
  };

  const startCell = cells[x][y];
  startCell.visited = true;
  stack.push(startCell);

  while (stack.length) {
    const current = stack[stack.length - 1];
    const [cx, cy] = [current.x, current.y];
    const unvisitedNeighbors = directions
      .map((dir) => {
        const [nx, ny] = getNewCoords(cx, cy, dir);
        return nx >= 0 &&
          ny >= 0 &&
          nx < cols &&
          ny < rows &&
          !cells[nx][ny].visited
          ? { dir, cell: cells[nx][ny] }
          : null;
      })
      .filter(Boolean);

    if (unvisitedNeighbors.length) {
      const { dir, cell } =
        unvisitedNeighbors[
          Math.floor(Math.random() * unvisitedNeighbors.length)
        ];
      removeWalls(current, cell, dir);
      cell.visited = true;
      stack.push(cell);
    } else {
      stack.pop();
    }
  }
}

function resetGame() {
  balls = JSON.parse(JSON.stringify(initialBalls));
  tilts = [];
  setup();
  io.emit("grid", cells);
  io.emit("plotPlayers", balls);
}

// Initialize the maze
setup();

function detectBallCollisions() {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const ball1 = balls[i];
      const ball2 = balls[j];
      const dx = ball2.x - ball1.x;
      const dy = ball2.y - ball1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDist = ball1.radius + ball2.radius;

      if (distance < minDist) {
        // Collision detected, adjust velocities
        const angle = Math.atan2(dy, dx);
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        // Simple elastic collision response
        const vx1 = ball1.dx;
        const vy1 = ball1.dy;
        const vx2 = ball2.dx;
        const vy2 = ball2.dy;

        ball1.dx = vx2;
        ball1.dy = vy2;
        ball2.dx = vx1;
        ball2.dy = vy1;

        // Adjust positions to prevent overlap
        const overlap = 0.5 * (minDist - distance);
        ball1.x -= overlap * cos;
        ball1.y -= overlap * sin;
        ball2.x += overlap * cos;
        ball2.y += overlap * sin;
      }
    }
  }
}

function updateBallPositions() {
  if (tilts.length === 0) return;

  const totalTilt = { x: 0, y: 0 };
  tilts.forEach(tilt => {
    totalTilt.x += tilt.x;
    totalTilt.y += tilt.y;
  });

  const avgTilt = {
    x: totalTilt.x / tilts.length,
    y: totalTilt.y / tilts.length,
  };

  const speedFactor = 5;
  balls.forEach((ball) => {
    ball.dx = avgTilt.x * speedFactor;
    ball.dy = avgTilt.y * speedFactor;

    let nextX = ball.x + ball.dx;
    let nextY = ball.y + ball.dy;

    // Prevent ball from moving out of canvas
    if (nextX < ball.radius) nextX = ball.radius;
    if (nextX > 300 - ball.radius) nextX = 300 - ball.radius;
    if (nextY < ball.radius) nextY = ball.radius;
    if (nextY > 300 - ball.radius) nextY = 300 - ball.radius;

    // Check for collision with walls
    const col = Math.floor(nextX / cellSize);
    const row = Math.floor(nextY / cellSize);

    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const cell = cells[col][row];

      if (cell) {
        // Collision with top wall
        if (
          ball.dy < 0 &&
          cell.walls.top &&
          nextY - ball.radius < row * cellSize
        ) {
          nextY = row * cellSize + ball.radius;
          ball.dy = -ball.dy;
        }

        // Collision with bottom wall
        if (
          ball.dy > 0 &&
          cell.walls.bottom &&
          nextY + ball.radius > (row + 1) * cellSize
        ) {
          nextY = (row + 1) * cellSize - ball.radius;
          ball.dy = -ball.dy;
        }

        // Collision with left wall
        if (
          ball.dx < 0 &&
          cell.walls.left &&
          nextX - ball.radius < col * cellSize
        ) {
          nextX = col * cellSize + ball.radius;
          ball.dx = ball.dx;
        }

        // Collision with right wall
        if (
          ball.dx > 0 &&
          cell.walls.right &&
          nextX + ball.radius > (col + 1) * cellSize
        ) {
          nextX = (col + 1) * cellSize - ball.radius;
          ball.dx = ball.dx;
        }
      }
    }

    ball.x = nextX;
    ball.y = nextY;
  });

  // Detect collisions between balls
  detectBallCollisions();

  io.emit("plotPlayers", balls);
}

io.on("connection", (socket) => {
  console.log("User connected: ", socket.id);

  io.emit("grid", cells);

  socket.on("startGame", () => {
    hasGameStarted = true;
    io.emit("gameStarted");
  });

  socket.on("join", () => {
    users.push({ ...balls[users.length], id: socket.id });
    console.log(users);
    io.emit("plotPlayers", users);
  });

  socket.on("tilt", (data) => {
    tilts = tilts.map((tilt) => (tilt.id === socket.id ? data : tilt));
    if (!tilts.some((tilt) => tilt.id === socket.id)) {
      tilts.push({ ...data, id: socket.id });
    }
    updateBallPositions(); // Update positions on tilt change
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    users = users.filter((user) => user.id !== socket.id);
    tilts = tilts.filter((tilt) => tilt.id !== socket.id);
    io.emit("plotPlayers", users);
  });

  socket.on("resetGame", () => {
    resetGame();
    io.emit("gameReset");
  });
});

// Update ball positions at 60 frames per second
setInterval(updateBallPositions, 1000 / 60);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
