const app = require('express')();
const express = require('express');
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 8080;
app.use(express.static(__dirname));
app.get('/', function(req, res) {
   res.sendfile('index.html');
});

// Players array
let users = [];

io.on('connection', (socket) => {
    console.log('user connected ', socket.id);
    socket.on('disconnect', function () {
      console.log('user disconnected ', socket.id);
    });

    socket.on('join', (msg) => {
        console.log(msg);
        io.emit('joined', {message: msg, socket: socket.id})
      });
  })

  
server.listen(port, function() {
  console.log(`Listening on port ${port}`);
});