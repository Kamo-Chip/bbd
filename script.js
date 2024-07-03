const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const joinButton = document.getElementById("joinButton");

const socket = io();

let balls = [];
let cells = [];
const cellSize = 20;
const cols = Math.floor(300 / cellSize);
const rows = Math.floor(300 / cellSize);
const hole = { x: 300 - 10, y: 300 - 10, radius: 7, color: "black" };
const maxSpeed = 6;

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
      ctx.beginPath();
      if (this.walls.top) ctx.moveTo(x, y), ctx.lineTo(x + cellSize, y);
      if (this.walls.right) ctx.moveTo(x + cellSize, y), ctx.lineTo(x + cellSize, y + cellSize);
      if (this.walls.bottom) ctx.moveTo(x + cellSize, y + cellSize), ctx.lineTo(x, y + cellSize);
      if (this.walls.left) ctx.moveTo(x, y + cellSize), ctx.lineTo(x, y);
      ctx.strokeStyle = "green";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
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

const updateBallPosition = (ball) => {
  let nextX = ball.x + ball.dx;
  let nextY = ball.y + ball.dy;

  if (nextX < ball.radius) nextX = ball.radius;
  if (nextX > 300 - ball.radius) nextX = 300 - ball.radius;
  if (nextY < ball.radius) nextY = ball.radius;
  if (nextY > 300 - ball.radius) nextY = 300 - ball.radius;

  const col = Math.floor(nextX / cellSize);
  const row = Math.floor(nextY / cellSize);

  if (col >= 0 && col < cols && row >= 0 && row < rows) {
    const cell = cells[col][row];

    if (cell) {
      if (ball.dy < 0 && cell.walls.top && nextY - ball.radius < row * cellSize) {
        nextY = row * cellSize + ball.radius;
        ball.dy = 0;
      }
      if (ball.dy > 0 && cell.walls.bottom && nextY + ball.radius > (row + 1) * cellSize) {
        nextY = (row + 1) * cellSize - ball.radius;
        ball.dy = 0;
      }
      if (ball.dx < 0 && cell.walls.left && nextX - ball.radius < col * cellSize) {
        nextX = col * cellSize + ball.radius;
        ball.dx = 0;
      }
      if (ball.dx > 0 && cell.walls.right && nextX + ball.radius > (col + 1) * cellSize) {
        nextX = (col + 1) * cellSize - ball.radius;
        ball.dx = 0;
      }
    }
  }

  ball.x = nextX;
  ball.y = nextY;

  if (isBallInHole(ball)) {
    socket.emit("win", { color: ball.color });
  }

  socket.emit("ballMove", ball);
};

const isBallInHole = (ball) => {
  const dx = ball.x - hole.x;
  const dy = ball.y - hole.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < hole.radius - ball.radius;
};

const plotGrid = () => {
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      cells[x][y].show();
    }
  }
};

const detectBallCollisions = () => {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const ball1 = balls[i];
      const ball2 = balls[j];
      const dx = ball2.x - ball1.x;
      const dy = ball2.y - ball1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDist = ball1.radius + ball2.radius;

      if (distance < minDist) {
        const angle = Math.atan2(dy, dx);
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        const vx1 = ball1.dx;
        const vy1 = ball1.dy;
        const vx2 = ball2.dx;
        const vy2 = ball2.dy;

        ball1.dx = vx2;
        ball1.dy = vy2;
        ball2.dx = vx1;
        ball2.dy = vy1;

        const overlap = 0.5 * (minDist - distance);
        ball1.x -= overlap * cos;
        ball1.y -= overlap * sin;
        ball2.x += overlap * cos;
        ball2.y += overlap * sin;
      }
    }
  }
};

const draw = () => {
  ctx.clearRect(0, 0, 300, 300);
  plotGrid();
  drawHole();
  balls.forEach((ball) => drawBall(ball));
  balls.forEach((ball) => updateBallPosition(ball));
  detectBallCollisions();
  requestAnimationFrame(draw);
};

const handleOrientation = (event) => {
  const maxTilt = 30;
  const mazeTiltX = (event.gamma / maxTilt) * maxSpeed;
  const mazeTiltY = (event.beta / maxTilt) * maxSpeed;

  balls.forEach(ball => {
    ball.dx = Math.max(-maxSpeed, Math.min(maxSpeed, mazeTiltX));
    ball.dy = Math.max(-maxSpeed, Math.min(maxSpeed, mazeTiltY));
  });

  canvas.style.transform = `rotateY(${event.gamma}deg) rotateX(${-event.beta}deg)`;

  document.querySelector("#alpha").textContent = event.alpha.toFixed(2);
  document.querySelector("#beta").textContent = event.beta.toFixed(2);
  document.querySelector("#gamma").textContent = event.gamma.toFixed(2);
};

const getDeviceOrientation = () => {
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
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
    window.addEventListener("deviceorientation", handleOrientation);
  }
};

startButton.addEventListener("click", () => {
  socket.emit("startGame");
});

joinButton.addEventListener("click", () => {
  getDeviceOrientation();
  socket.emit("join");
});

socket.on("plotPlayers", (data) => {
  balls = data;
});

socket.on("gameStarted", () => {
  startButton.style.display = "none";
});

socket.on("joinDenied", () => {
  console.log("Game has already started");
});

socket.on("grid", (data) => {
  cells = data.map((column, colNum) => {
    return column.map((cell, rowNum) => new Cell(cell.x, cell.y, cell.walls));
  });
  draw(); // Start drawing only after receiving the grid data
});

setup();
