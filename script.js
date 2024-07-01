const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 15,
  color: "blue",
  dx: 0,
  dy: 0,
};

const hole = {
  x: canvas.width - 50,
  y: canvas.height - 50,
  radius: 20,
  color: "black",
};

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();
}

function drawHole() {
  ctx.beginPath();
  ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
  ctx.fillStyle = hole.color;
  ctx.fill();
  ctx.closePath();
}

function updateBallPosition() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Prevent ball from moving out of canvas
  if (ball.x < ball.radius) ball.x = ball.radius;
  if (ball.x > canvas.width - ball.radius) ball.x = canvas.width - ball.radius;
  if (ball.y < ball.radius) ball.y = ball.radius;
  if (ball.y > canvas.height - ball.radius)
    ball.y = canvas.height - ball.radius;
}

function checkWinCondition() {
  const dx = ball.x - hole.x;
  const dy = ball.y - hole.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < ball.radius + hole.radius) {
    alert("You win!");
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = 0;
    ball.dy = 0;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBall();
  drawHole();
  updateBallPosition();
  checkWinCondition();
  requestAnimationFrame(draw);
}

function handleOrientation(event) {
  const maxTilt = 45; // Maximum tilt angle to avoid too much speed
  ball.dx = (event.gamma / maxTilt) * 5; // gamma is the left-to-right tilt
  ball.dy = (event.beta / maxTilt) * 5; // beta is the front-to-back tilt
}

function onClick() {
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
}

startButton.addEventListener("click", () => {
  onClick();
  draw();
});
