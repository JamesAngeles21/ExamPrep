var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);




var questions = ["Which of these is not a type of cloud?", "What is the currency of China?", "What is the abbrieviation of the UK's national security intelligence agency?", "On a film set, what is the long pole with a microphone on the end of it called?", "What is the worst-case time complexity for searching an element in a binary search tree?"];
var choices = [["Cumulus", "Stratus", "Omnibus", "Cirribus"], ["Yen", "Peso", "Dinar", "Renminbi"], ["NCA", "CSIS", "SAS", "MI5"], ["Boom", "Compressor", "Woofer", "Gaffer"], ["O(n)", "O(1)", "O(log n)", "O(n log n)"]];
var answers = ["Omnibus", "Renminbi", "MI5", "Boom", "O(log n)"];
var rooms = [];
var roomSwitch = ["#slide-1", "#slide-2", "#slide-3", "#slide-4", "#slide-5", "#slide-6", "#end"];


Array.prototype.binarySearch = binarySearch;
Array.prototype.linearSearch = linearSearch;
Array.prototype.swap = swap;

app.use(express.static(__dirname + '/public')); //send public folder

app.get('/mobile', function(req, res) {
    res.sendFile((__dirname + '/public/mobile-controller.html')); //send mobile index from server
});

app.set('port', process.env.PORT || 3000);

http.listen(app.get('port'), function() {
	console.log("listening on *:3000");
});


io.on('connection', function(socket) {
    var set;
    socket.on('new room', function(data) {
        console.log("user connected!");
        rooms.push(new room(socket,data.room));
        for(i = 0; i < rooms.length; i++) {
            console.log("room " + i + ": " + rooms[i].roomId);
        }
        
    });
    
    socket.on("player-connect", function(players) {
        
        var gameRoom = findRoom(socket.id);
        console.log("GameRoom: " + gameRoom.roomSocket.id);
        gameRoom.numOfPlayers = players;                    //instantiate the max number of players
        for(i = 0; i < players; i++) {
            gameRoom.pointSystem[i] = 0;                    //instantiate point system using players
        }
    });
    
    
    socket.on('mobile connect', function(data) {
        var desktopRoom, gameRoom, isSolo;
        try {
            for(i = 0; i < rooms.length; i++) {
                if(rooms[i].roomId == data.toUpperCase()) {
                    desktopRoom = i;
                }
            }
            if(desktopRoom == undefined) {      //if the room code inputted is wrong
                throw SyntaxError;
            }
            gameRoom = rooms[desktopRoom];
            isSolo = gameRoom.numOfPlayers == 1;
            if(gameRoom.numOfPlayers == gameRoom.mobileSockets.length) {   //if the room is already full
                throw ReferenceError;
            }
            
            socket.emit("right roomcode",{maxNum: gameRoom.numOfPlayers, playerNum: ++gameRoom.playerIdNum});
            rooms[desktopRoom].mobileSockets.push(socket);
            
            if(gameRoom.mobileSockets.length == gameRoom.numOfPlayers) {
                socket.emit('start game', {roomids: roomSwitch, solo: isSolo});                                    //emit to mobile who clicked it
                socket.to(gameRoom.roomSocket.id).emit('start game', {roomids: roomSwitch, solo: isSolo});         //emit to host desktop 
                for(i = 0; i< gameRoom.mobileSockets.length; i++) {
                    socket.to(gameRoom.mobileSockets[i].id).emit('start game',{roomids: roomSwitch, solo: isSolo});//emit to rest of mobile sockets
                }
            }
        }
        catch(err)  {
            if(err.name === 'SyntaxError') {
                socket.emit("wrong roomcode", "Invalid room code! Try again");  
            }
            
            if(err.name === 'ReferenceError') {
                socket.emit("wrong roomcode", "Room is already full!");
            }
        }

    });
    
    
    
    socket.on("lets play", function() {
        console.log(socket.handshake.headers.referer);
        var currentUrl = socket.handshake.headers.referer;
        var gameRoom = (currentUrl.charAt(currentUrl.length-1) == '/') ? findRoom(socket.id) : findRoomByMobile(socket.id);
        console.log(gameRoom.roomId);
        
        set = new QuestionSet(gameRoom.randomized[0][gameRoom.setCounter], gameRoom.randomized[1][gameRoom.setCounter]);
        socket.emit('continue',{currentSet: set, playerPoints: 0, maxPlayers: gameRoom.numOfPlayers});   //send first set of questions/choices
        
    });
    
    socket.on("answer", function(userChoice) {
        var gameRoom = findRoomByMobile(socket.id);
        var answer = gameRoom.randomized[2][gameRoom.answerCounter];
        var points = 0;
        var isCorrect = false;
        if(answer == userChoice) {
            points += 100;
            isCorrect = true;
        }
        gameRoom.answerSubmit++;
        var solo = (gameRoom.numOfPlayers == 1);
        socket.emit('score-response', {userResponse: isCorrect, score:points, isSolo: solo});
        

    });
    
    socket.on("individual-score", function(playerPoints) {
            var gameRoom = findRoomByMobile(socket.id);
            var pointsGiven = playerPoints.wasCorrect ? 100 : 0; 
            gameRoom.pointSystem[playerPoints.playerId-1] += pointsGiven;
            socket.to(gameRoom.roomSocket.id).emit('desktop-update', {score: gameRoom.pointSystem, firstAnswer: gameRoom.isDesktopUpdated, playerId: playerPoints.playerId});
        
            gameRoom.isDesktopUpdated = false; 
            
            if(gameRoom.answerSubmit == gameRoom.numOfPlayers) {            //once everyone has answered the question
                gameRoom.answerCounter++;                                   //serve corresponding answer and set questions
                ++gameRoom.setCounter;
                var nextSet = new QuestionSet(gameRoom.randomized[0][gameRoom.setCounter], gameRoom.randomized[1][gameRoom.setCounter]); 
                socket.emit('continue', {currentSet:nextSet, playerPoints:gameRoom.pointSystem, maxPlayers: gameRoom.numOfPlayers});
                socket.to(gameRoom.roomSocket.id).emit('continue', {currentSet:nextSet, playerPoints:gameRoom.pointSystem,  
                                                                    maxPlayers: gameRoom.numOfPlayers});
                for(i = 0; i < gameRoom.mobileSockets.length; i++) {
                    socket.to(gameRoom.mobileSockets[i].id).emit('continue',{currentSet:nextSet, playerPoints: gameRoom.pointSystem,  
                                                                             maxPlayers: gameRoom.numOfPlayers}); 
                }
                gameRoom.answerSubmit = 0;
                gameRoom.isDesktopUpdated = true;
            }
        });
    
    
    
    socket.on('disconnect', function() {
        //remove room from array when desktop disconnects
        var currentUrl = socket.handshake.headers.referer;
        if(currentUrl.charAt(currentUrl.length-1) == '/') {
            console.log("desktop disconnected!");
            
            var roomIndex = rooms.binarySearch(socket.id, true);
            var gameRoom = rooms[roomIndex];
            if(roomIndex != -1) {
                rooms.splice(rooms.binarySearch(socket.id, true),1);
                for(i = 0; i < rooms.length; i++) {
                    console.log(rooms[i].roomId);
                }
                for(i = 0; i < gameRoom.mobileSockets.length; i++) {
                socket.to(gameRoom.mobileSockets[i].id).emit("game end", {slides: roomSwitch, message: "Desktop has disconnected! Please refresh to start a new game"});
                }
            }
        }
        
        else {
            console.log("mobile disconnected!");
            var gameRoom = findRoomByMobile(socket.id);
            if(gameRoom != -1) {
                for(i = 0;i < gameRoom.mobileSockets.length; i++) {
                     socket.to(gameRoom.mobileSockets[i].id).emit("game end", {slides: roomSwitch, message: "A player has disconnected! Please refresh to start a new game"});
                }

                socket.to(gameRoom.roomSocket.id).emit("game end", {slides: roomSwitch, message: "A player has disconnected! Please refresh to start a new game"});
            }
        }
    });
    
    
    
});




function room(roomSocket, roomId) {
    this.roomSocket = roomSocket;
    this.roomId = roomId;
    this.mobileSockets = [];
    this.playerIdNum = 0;           //assigns a playerId when mobile gets connected to room
    this.pointSystem = [];          //keeps track of the points of each player
    this.numOfPlayers = 0;          //max number of players allowed
    this.answerCounter = 0;         //advances answer index in array
    this.setCounter = 0;            //advances set index in array
    this.answerSubmit = 0;          //keeps track of number of people who submitted answer to current question
    this.isDesktopUpdated = true;   //makes sure roomTransitionIndex is only increased when necessary
    this.randomized = randomize(questions, choices, answers);


}

function QuestionSet(question, choices) {
    this.question = question;
    this.choices = choices;
    this.roomTransition = roomSwitch;
}
//binary search for room index
function binarySearch(searchElement, isDesktop) {
    var minIndex = 0;
    var maxIndex = this.length - 1;
    var currentIndex = 0;
    var currentElement;
    while(minIndex <= maxIndex) {
        
        currentIndex = (minIndex + maxIndex) / 2 | 0;   //find midpoint of array
        
        if(isDesktop) {         //if finding by desktop id
            currentElement = this[currentIndex].roomSocket.id;
        }
        else if (!isDesktop) {  //if finding by mobile id  
            currentElement = this[currentIndex].id;
        }
        console.log("Current index: " + currentIndex);
        console.log("search element: " + searchElement);
        console.log("current element: " + currentElement);
        console.log(searchElement == currentElement);
        
        if(currentElement == searchElement && !isDesktop) {
            for(i = 0; i < rooms.length; i++) {             //go through each room and see if mobileSocket[index] matches id
                if(rooms[i].mobileSockets[currentIndex].id == searchElement) {
                    currentIndex = i;
                    return currentIndex;
                }
            }
        }
        
        if(currentElement == searchElement) {
            return currentIndex;
        }
        
        if(currentElement < searchElement) {
            minIndex = currentIndex + 1;
        }
        
        else if(currentElement > searchElement) {
            maxIndex = currentIndex - 1;
        }
        
        
    }
    return -1;
}

function linearSearch(searchElement, isDesktop) {
    
    if(isDesktop) {
        
        for(i = 0; i < this.length; i++) {
            if(this[i].roomSocket.id == searchElement) {
                return i;
            }
        }
    }
    
    else {
        for(i = 0; i < this.length; i++) {
            for(j = 0; j < this[i].mobileSockets.length; j++) {
                if(this[i].mobileSockets[j].id == searchElement)
                    return i;
            }
        }
    }
    return -1;
    
}


function findRoom(id) {
    sortRoom();
    var roomIndex;
    if(rooms.length > 2) {
        roomIndex = rooms.binarySearch(id, true);
    }
    else {
        roomIndex = rooms.linearSearch(id,true);
    }
    console.log("roomIndex: " + roomIndex);
    if(roomIndex != -1) {
        return rooms[roomIndex];
    }

    return -1;
}

function findRoomByMobile(mobileid) {
    var roomIndex;
    sortRoom();
    if(rooms.length > 2) {
        for(i = 0; i < rooms.length; i++) {
            console.log("room index: " + rooms[i].mobileSockets.binarySearch(mobileid, false));
            roomIndex = rooms[i].mobileSockets.binarySearch(mobileid, false);
        }
    }
    else {
        roomIndex = rooms.linearSearch(mobileid, false);
    }
    
    if(roomIndex != -1) {
            return rooms[roomIndex];
    }
    return -1;
} 


function copyArray(arr) {
    var copiedArray = [];
    
    for(i  = 0; i < arr.length; i++) {
        copiedArray.push(arr[i]);
    }
    return copiedArray;
}

function sortRoom() {
    rooms.sort();
    for( i = 0; i < rooms.length; i++) {
        rooms[i].mobileSockets.sort(function(roomId, searchId) {
            var firstId = roomId.id;
            var secondId = searchId.id;
      
            if(firstId < secondId) {
                return -1;
            }
            
            else if(firstId > secondId) {
                return 1;
            }
            
            else {
                return 0;
            }
        });   
    }
}

function randomize(questions, choices, answers) {
    var randomizedQuestions = copyArray(questions);
    var randomizedChoices = copyArray(choices);
    var randomizedAnswers = copyArray(answers);
    var randomIndex;
    for(i = 0; i < questions.length; i++) {
        randomIndex = Math.floor(Math.random() * questions.length);
        randomizedQuestions.swap(i, randomIndex);
        randomizedChoices.swap(i, randomIndex);
        randomizedAnswers.swap(i, randomIndex);
    }
    return [randomizedQuestions, randomizedChoices, randomizedAnswers];
}

function swap(firstIndex, secondIndex) {
    var temp = this[firstIndex];
    this[firstIndex] = this[secondIndex];
    this[secondIndex] = temp;
    
}
