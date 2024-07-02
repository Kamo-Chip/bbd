
const socket = io("http://localhost:8080")
let players = []; // All players in the game
let currentPlayer; // Player object for individual players

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
const xCoord = Math.random()*canvas.width;
const yCoord = Math.random()*canvas.height;
let colors = ['red','blue','green'];
let colorIndex = Math.floor(Math.random()*(3));
let hasGameStarted = false;

function drawBall(xCoord, yCoord, ballColor) {
  ctx.beginPath();
  ctx.arc(xCoord, yCoord, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ballColor;
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
  if (ball.y > canvas.height - ball.radius) ball.y = canvas.height - ball.radius;
}
function initBoard(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function draw() {
    drawBall(xCoord, yCoord, colors[colorIndex]);
    updateBallPosition();
 // requestAnimationFrame(draw);
}

function handleOrientation(event) {
  const maxTilt = 45; // Maximum tilt angle to avoid too much speed
  ball.dx = (event.gamma / maxTilt) * 5; // gamma is the left-to-right tilt
  ball.dy = (event.beta / maxTilt) * 5; // beta is the front-to-back tilt
}

function onClick() {
  if (!DeviceOrientationEvent.requestPermission) {
    alert("No orientation event");
    return;
  }
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
  draw()
  socket.emit("join", {ballX: xCoord, ballY: yCoord, ballColor:colors[colorIndex], gameStarted: true});
});


//initialize board
initBoard();

//listen to server events
socket.on('joined', (msg) => {
  console.log(msg);
  let ul = document.getElementById("socket1");
  let item = document.createElement("li");
  item.textContent = msg['socket'];
  console.log(hasGameStarted)
  drawBall(msg['message']['ballX'], msg['message']['ballY'], msg['message']['ballColor'])
  ul.appendChild(item)

});