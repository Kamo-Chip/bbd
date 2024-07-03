
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const startButton = document.getElementById("startButton");
    const isHard = false;

    const socket = io(); // Initialize socket connection

    // Define the balls with unique initial positions and colors
    const balls = [
      { id: '1', x: 20, y: 20, radius: 10, color: "blue", dx: 0, dy: 0, isWinner: false },
      { id: '2', x: canvas.width - 20, y: 20, radius: 10, color: "red", dx: 0, dy: 0, isWinner: false },
      { id: '3', x: 20, y: canvas.width - 20, radius: 10, color: "yellow", dx: 0, dy: 0, isWinner: false },
      { id: '4', x: canvas.width / 2, y: 20, radius: 10, color: "green", dx: 0, dy: 0, isWinner: false },
    ];

    const hole = {
      x: canvas.width - 20,
      y: canvas.height - 20,
      radius: 16,
      color: "black",
    };

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
        pen.strokeStyle = 'black';
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
      if (isBallInHole(ball)) {
        if (!ball.isWinner) {
          ball.isWinner = true;
          alert(`${ball.color} wins!`);
          resetGame();
        }
      }
    };

    const isBallInHole = (ball) => {
      const dx = ball.x - hole.x;
      const dy = ball.y - hole.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance < hole.radius - ball.radius;
    };

    const resetGame = () => {
      // Define the predefined positions of the balls
      const initialPositions = [
        { x: 20, y: 20 },
        { x: 580, y: 20 },
        { x: 20, y: 580 },
        { x: 300, y: 20 }
      ];

      // Reset each ball's position, velocity, and win status
      balls.forEach((ball, index) => {
        ball.x = initialPositions[index].x;
        ball.y = initialPositions[index].y;
        ball.dx = 0;
        ball.dy = 0;
        ball.isWinner = false;
      });

      setup();
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          cells[x][y].show();
        }
      }
      drawHole();
      balls.forEach(ball => drawBall(ball));
      balls.forEach(ball => updateBallPosition(ball));
      detectBallCollisions();
      requestAnimationFrame(draw);
    };

    const maxSpeed = 6;

    const handleOrientation = (event) => {
      const maxTilt = 30; // Maximum tilt angle to avoid too much speed

      const mazeTiltX = (event.gamma / maxTilt) * maxSpeed; // gamma is the left-to-right tilt
      const mazeTiltY = (event.beta / maxTilt) * maxSpeed; // beta is the front-to-back tilt

      // Emit ball movement to the server
      socket.emit('updateBall', { id: balls[0].id, dx: Math.max(-maxSpeed, Math.min(maxSpeed, mazeTiltX)), dy: Math.max(-maxSpeed, Math.min(maxSpeed, mazeTiltY)) });

      canvas.style.transform = `rotateY(${event.gamma}deg) rotateX(${-event.beta}deg)`;

      const alphaSpan = document.querySelector("#alpha");
      const betaSpan = document.querySelector("#beta");
      const gammaSpan = document.querySelector("#gamma");

      alphaSpan.textContent = event.alpha.toFixed(2);
      betaSpan.textContent = event.beta.toFixed(2);
      gammaSpan.textContent = event.gamma.toFixed(2);
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

    // Handle updates from the server
    socket.on('updateBall', (data) => {
      const ball = balls.find(b => b.id === data.id);
      if (ball) {
        ball.dx = data.dx;
        ball.dy = data.dy;
      }
    });

    socket.on('syncState', (gameState) => {
      balls.forEach(ball => {
        const state = gameState.balls.find(b => b.id === ball.id);
        if (state) {
          Object.assign(ball, state);
        }
      });
    });

    // Initial setup
    setup();
    draw();

