const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const joinButton = document.getElementById("joinButton");

const socket = io();

const ball = {
  x: 20,
  y: 20,
  radius: 5,
  color: "blue",
  dx: 0,
  dy: 0,
};

const hole = {
  x: 300 - 10,
  y: 300 - 10,
  radius: 7,
  color: "black",
};

const xCoord = 10;
const yCoord = 290;
let colors = ["red", "blue", "green", "purple"];
let colorIndex = Math.floor(Math.random() * 4);

const cellSize = 20;
const cols = Math.floor(300 / cellSize);
const rows = Math.floor(300 / cellSize);
let cells = [];
const pen = canvas.getContext("2d");

class Cell {
  constructor(x, y, walls) {
    this.x = x;
    this.y = y;
    this.walls = walls;
  }

  show() {
    if (this.walls) {
      const x = this.x * cellSize;
      const y = this.y * cellSize;
      pen.beginPath();
      if (this.walls.top) pen.moveTo(x, y), pen.lineTo(x + cellSize, y);
      if (this.walls.right)
        pen.moveTo(x + cellSize, y), pen.lineTo(x + cellSize, y + cellSize);
      if (this.walls.bottom)
        pen.moveTo(x + cellSize, y + cellSize), pen.lineTo(x, y + cellSize);
      if (this.walls.left) pen.moveTo(x, y + cellSize), pen.lineTo(x, y);
      pen.strokeStyle = "green";
      pen.lineWidth = 2;
      pen.lineCap = "round";
      pen.stroke();
    }
  }
}

function setup() {
  initBoard();
  for (let x = 0; x < cols; x++) {
    cells[x] = [];
    for (let y = 0; y < rows; y++) {
      cells[x][y] = new Cell(x, y);
    }
  }
}

const drawBall = () => {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = colors[colorIndex];
  ctx.fill();
  ctx.closePath();
};

const drawBallSpecific = (x, y, color) => {
  ctx.beginPath();
  ctx.arc(x, y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.closePath();
};

const drawHole = () => {
  ctx.beginPath();
  ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
  ctx.fillStyle = hole.color;
  ctx.fill();
  ctx.closePath();
};

const updateBallPosition = () => {
  let nextX = ball.x + ball.dx;
  let nextY = ball.y + ball.dy;

  // Prevent ball from moving out of canvas
  if (nextX < ball.radius) nextX = ball.radius;
  if (nextX > canvas.width - ball.radius) nextX = canvas.width - ball.radius;
  if (nextY < ball.radius) nextY = ball.radius;
  if (nextY > canvas.height - ball.radius) nextY = canvas.height - ball.radius;

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
        ball.dy = 0;
      }

      // Collision with bottom wall
      if (
        ball.dy > 0 &&
        cell.walls.bottom &&
        nextY + ball.radius > (row + 1) * cellSize
      ) {
        nextY = (row + 1) * cellSize - ball.radius;
        ball.dy = 0;
      }

      // Collision with left wall
      if (
        ball.dx < 0 &&
        cell.walls.left &&
        nextX - ball.radius < col * cellSize
      ) {
        nextX = col * cellSize + ball.radius;
        ball.dx = 0;
      }

      // Collision with right wall
      if (
        ball.dx > 0 &&
        cell.walls.right &&
        nextX + ball.radius > (col + 1) * cellSize
      ) {
        nextX = (col + 1) * cellSize - ball.radius;
        ball.dx = 0;
      }
    }
  }

  ball.x = nextX;
  ball.y = nextY;

  // Check if ball is in the hole
  if (isBallInHole()) {
    alert("You win!");
    resetGame();
  }

  // // Emit ball position to the server
  socket.emit("ballMove", { x: ball.x, y: ball.y });
};

const isBallInHole = () => {
  const dx = ball.x - hole.x;
  const dy = ball.y - hole.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < hole.radius - ball.radius;
};

const resetGame = () => {
  ball.x = 20;
  ball.y = 20;
  ball.dx = 0;
  ball.dy = 0;
  setup();
};

const initBoard = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const plotGrid = () => {
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      cells[x][y].show();
    }
  }
  drawHole();
};

const draw = () => {
  updateBallPosition();
  requestAnimationFrame(draw);
};

const handleOrientation = (event) => {
  const maxTilt = 45; // Maximum tilt angle to avoid too much speed
  ball.dx = (event.gamma / maxTilt) * 5; // gamma is the left-to-right tilt
  ball.dy = (event.beta / maxTilt) * 5; // beta is the front-to-back tilt

  const alphaSpan = document.querySelector("#alpha");
  const betaSpan = document.querySelector("#beta");
  const gammaSpan = document.querySelector("#gamma");

  alphaSpan.textContent = event.alpha.toFixed(2);
  betaSpan.textContent = event.beta.toFixed(2);
  gammaSpan.textContent = event.gamma.toFixed(2);

  canvas.style.transform = `
  rotateY(${event.gamma / 2}deg) rotateX(${-event.beta / 2}deg)
`;
};

const getDeviceOrientation = () => {
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    // Handle iOS 13+ devices.
    DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
        } else {
          console.error("Request to access the orientation was rejected");
        }
      })
      .catch(console.error);
  } else {
    // Handle regular non iOS 13+ devices.
    window.addEventListener("deviceorientation", handleOrientation);
  }
};

startButton.addEventListener("click", () => {
  getDeviceOrientation();
  plotGrid();
  socket.emit("startGame");
});

joinButton.addEventListener("click", () => {
  getDeviceOrientation();
  draw();
  socket.emit("join", {
    id: "",
    color: colors[colorIndex],
  });
});

socket.on("plotPlayers", (data) => {
  console.log(data);
  data.map((b) => {
    ball.x = b.x;
    ball.y = b.y;
    ball.color = b.color;
    drawBallSpecific(b.x, b.y, b.color);
  });
});

socket.on("grid", (data) => {
  // console.log(data);
  data.forEach((cell, colNum) => {
    console.log(`\n\nColumn: ${colNum}`, cell);
    cell.map((entry, rowNum) => {
      console.log(`Entry: ${rowNum}`, entry);
      cells[rowNum][colNum] = new Cell(entry.x, entry.y, entry.walls);
    });
  });

  console.log(cells);
  // cells = data.map((col) =>
  //   col.map((cell) => new Cell(cell.x, cell.y, cell.walls))
  // );
  // console.log(cells);
  // resetGame();
});
// Initial setup
setup();
requestAnimationFrame(draw);
