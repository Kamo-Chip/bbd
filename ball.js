class Ball {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.dx = 0;
    this.dy = 0;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }

  updatePosition(canvas, cellSize, cells) {
    let nextX = this.x + this.dx;
    let nextY = this.y + this.dy;

    // Prevent ball from moving out of canvas
    if (nextX < this.radius) nextX = this.radius;
    if (nextX > canvas.width - this.radius) nextX = canvas.width - this.radius;
    if (nextY < this.radius) nextY = this.radius;
    if (nextY > canvas.height - this.radius)
      nextY = canvas.height - this.radius;

    // Check for collision with walls
    const col = Math.floor(nextX / cellSize);
    const row = Math.floor(nextY / cellSize);

    if (
      col >= 0 &&
      col < Math.floor(canvas.width / cellSize) &&
      row >= 0 &&
      row < Math.floor(canvas.height / cellSize)
    ) {
      const cell = cells[col][row];

      if (cell) {
        // Collision with top wall
        if (
          this.dy < 0 &&
          cell.walls.top &&
          nextY - this.radius < row * cellSize
        ) {
          nextY = row * cellSize + this.radius;
          this.dy = 0;
        }

        // Collision with bottom wall
        if (
          this.dy > 0 &&
          cell.walls.bottom &&
          nextY + this.radius > (row + 1) * cellSize
        ) {
          nextY = (row + 1) * cellSize - this.radius;
          this.dy = 0;
        }

        // Collision with left wall
        if (
          this.dx < 0 &&
          cell.walls.left &&
          nextX - this.radius < col * cellSize
        ) {
          nextX = col * cellSize + this.radius;
          this.dx = 0;
        }

        // Collision with right wall
        if (
          this.dx > 0 &&
          cell.walls.right &&
          nextX + this.radius > (col + 1) * cellSize
        ) {
          nextX = (col + 1) * cellSize - this.radius;
          this.dx = 0;
        }
      }
    }

    this.x = nextX;
    this.y = nextY;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.dx = 0;
    this.dy = 0;
  }
}
