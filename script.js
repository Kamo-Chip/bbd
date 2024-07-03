const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const joinButton = document.getElementById("joinButton");

const socket = io();

// Define the balls with unique initial positions and colors
let balls = [];

const hole = {
  x: 300 - 10,
  y: 300 - 10,
  radius: 7,
  color: "black",
};

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
  for (let x = 0; x < cols; x++) {
    cells[x] = [];
    for (let y = 0; y < rows; y++) {
      cells[x][y] = new Cell(x, y);
    }
  }
}

const drawBall = (ball) => {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
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

const resetGame = () => {
  const initCoords = [
    { x: 10, y: 10 },
    { x: 290, y: 10 },
    { x: 10, y: 290 },
    { x: 150, y: 10 },
  ];

  balls.forEach((ball, idx) => {
    ball.x = initCoords[idx].x;
    ball.y = initCoords[idx].y;
    ball.dx = 0;
    ball.dy = 0;
  });
  setup();
};

const plotGrid = () => {
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      cells[x][y].show();
    }
  }
};

const fps = 60;
const draw = () => {
  ctx.clearRect(0, 0, 300, 300);
  plotGrid();
  drawHole();

  balls.forEach((ball) => drawBall(ball));

  setTimeout(() => {
    requestAnimationFrame(draw);
  }, 1000 / fps);
};

const speedFactor = 2;
const handleOrientation = (event) => {
  const maxTilt = 30; // Maximum tilt angle to avoid too much speed

  const mazeTiltX = (event.gamma / maxTilt) * speedFactor; // gamma is the left-to-right tilt
  const mazeTiltY = (event.beta / maxTilt) * speedFactor; // beta is the front-to-back tilt

  socket.emit("tilt", { xTilt: mazeTiltX, yTilt: mazeTiltY });

  canvas.style.transform = `rotateY(${
    event.gamma
  }deg) rotateX(${-event.beta}deg)`;

  const alphaSpan = document.querySelector("#alpha");
  const betaSpan = document.querySelector("#beta");
  const gammaSpan = document.querySelector("#gamma");

  alphaSpan.textContent = event.alpha.toFixed(2);
  betaSpan.textContent = event.beta.toFixed(2);
  gammaSpan.textContent = event.gamma.toFixed(2);
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
  socket.emit("startGame");
});

joinButton.addEventListener("click", () => {
  getDeviceOrientation();
  joinButton.style.display = "none";
  socket.emit("join");
});

socket.on("plotPlayers", (data) => {
  balls = data;
  data.forEach((ball) => drawBall(ball));
});

socket.on("gameStarted", () => {
  startButton.style.display = "none";
});

socket.on("grid", (data) => {
  data.forEach((cell, colNum) => {
    cell.map((entry, rowNum) => {
      cells[colNum][rowNum] = new Cell(entry.x, entry.y, entry.walls);
    });
  });
});
// Initial setup
setup();
draw();
