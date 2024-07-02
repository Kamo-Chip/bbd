const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const userName = localStorage.getItem('userName');
const selectedColor = localStorage.getItem('selectedColor');

const ball = {
  x: 20,
  y: 20,
  radius: 10,
  dx: 0,
  dy: 0,
};

const hole = {
  x: canvas.width - 20,
  y: canvas.height - 20,
  radius: 15,
  color: "black",
};

if (userName && selectedColor) {
  // Display user info
  document.getElementById('userName').innerHTML = `Username: <strong>${userName}</strong>`;
  document.getElementById('userColor').innerHTML = `Color: <strong>${selectedColor}</strong>`;

  // Optionally, use the color in the game
    ball.color = selectedColor;
  
  // Clear localStorage
  localStorage.removeItem('userName');
  localStorage.removeItem('selectedColor');
}

const cellSize = 40;
const cols = Math.floor(canvas.width / cellSize);
const rows = Math.floor(canvas.height / cellSize);
const cells = [];
const pen = canvas.getContext('2d');

class Cell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.visited = false;
    this.walls = { top: true, right: true, bottom: true, left: true };
  }

  show() {
    const x = this.x * cellSize;
    const y = this.y * cellSize;
    pen.beginPath();
    if (this.walls.top) pen.moveTo(x, y), pen.lineTo(x + cellSize, y);
    if (this.walls.right) pen.moveTo(x + cellSize, y), pen.lineTo(x + cellSize, y + cellSize);
    if (this.walls.bottom) pen.moveTo(x + cellSize, y + cellSize), pen.lineTo(x, y + cellSize);
    if (this.walls.left) pen.moveTo(x, y + cellSize), pen.lineTo(x, y);
    pen.strokeStyle = 'green';
    pen.lineWidth = 5;
    pen.lineCap = 'round';
    pen.stroke();
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
  const directions = ['top', 'right', 'bottom', 'left'];
  const getNewCoords = (x, y, dir) => {
    switch (dir) {
      case 'top': return [x, y - 1];
      case 'right': return [x + 1, y];
      case 'bottom': return [x, y + 1];
      case 'left': return [x - 1, y];
    }
  };

  const removeWalls = (current, next, dir) => {
    current.walls[dir] = false;
    const opposite = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };
    next.walls[opposite[dir]] = false;
  };

  const startCell = cells[x][y];
  startCell.visited = true;
  stack.push(startCell);

  while (stack.length) {
    const current = stack[stack.length - 1];
    const [cx, cy] = [current.x, current.y];
    const unvisitedNeighbors = directions
      .map(dir => {
        const [nx, ny] = getNewCoords(cx, cy, dir);
        return (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !cells[nx][ny].visited) ? { dir, cell: cells[nx][ny] } : null;
      })
      .filter(Boolean);

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

const drawBall = () => {
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
      if (ball.dy < 0 && cell.walls.top && nextY - ball.radius < row * cellSize) {
        nextY = row * cellSize + ball.radius;
        ball.dy = 0;
      }

      // Collision with bottom wall
      if (ball.dy > 0 && cell.walls.bottom && nextY + ball.radius > (row + 1) * cellSize) {
        nextY = (row + 1) * cellSize - ball.radius;
        ball.dy = 0;
      }

      // Collision with left wall
      if (ball.dx < 0 && cell.walls.left && nextX - ball.radius < col * cellSize) {
        nextX = col * cellSize + ball.radius;
        ball.dx = 0;
      }

      // Collision with right wall
      if (ball.dx > 0 && cell.walls.right && nextX + ball.radius > (col + 1) * cellSize) {
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

const draw = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      cells[x][y].show();
    }
  }
  drawHole();
  drawBall();
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

const onClick = () => {
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
  onClick();
  resetGame();
  draw();
});

// Initial setup
setup();
draw();