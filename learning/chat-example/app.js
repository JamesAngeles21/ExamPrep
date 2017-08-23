var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http, {
	pingInterval: 10000,
  	pingTimeout: 5000

});


app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
	console.log("user connected!");
	io.emit('user connect', 'user joined the room');

	socket.on('disconnect', function() {
		console.log("user disconnected");
		io.emit('user disconnect', 'left the room!');
	});

	socket.on('chat message', function(msg) {
		io.emit('chat message', msg);
	});

});



http.listen(3000, function() {
	console.log("listening on *:3000");
});

