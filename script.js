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

const updateBallPosition = (ball) => {
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
  if (isBallInHole(ball)) {
    socket.emit(`${ball.color} wins!`);
    // alert("You win!");
    //resetGame();
  }

  socket.emit("ballMove", ball);
};

const isBallInHole = (ball) => {
  const dx = ball.x - hole.x;
  const dy = ball.y - hole.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < hole.radius - ball.radius;
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

const maxSpeed = 6;

const handleOrientation = (event) => {
  const maxTilt = 30; // Maximum tilt angle to avoid too much speed

  const mazeTiltX = (event.gamma / maxTilt) * maxSpeed; // gamma is the left-to-right tilt
  const mazeTiltY = (event.beta / maxTilt) * maxSpeed; // beta is the front-to-back tilt

  balls.forEach(ball => {
    ball.dx = Math.max(-maxSpeed, Math.min(maxSpeed, mazeTiltX));
    ball.dy = Math.max(-maxSpeed, Math.min(maxSpeed, mazeTiltY));
  });

  canvas.style.transform = `rotateY(${event.gamma}deg) rotateX(${-event.beta}deg)`;

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
  socket.emit("join");
});

socket.on("plotPlayers", (data) => {
  console.log(data);
  balls = data;
  balls.forEach((ball) => {
    drawBall(ball);
  });
});

socket.on("gameStarted", () => {
  startButton.style.display = "none";
});

socket.on("joinDenied", () => {
  console.log("Game has already started");
});

socket.on("grid", (data) => {
  data.forEach((cell, colNum) => {
    cell.map((entry, rowNum) => {
      cells[rowNum][colNum] = new Cell(entry.x, entry.y, entry.walls);
    });
  });
});
// Initial setup
setup();
draw();
