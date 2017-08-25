function generateRoomCode() {
	var roomCode = "";
	var possible = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
	for(i = 0; i < 10; i++) {
		possible.push(i.toString());
	}

	for(i = 0; i < 5; i++) {
		roomCode += possible[Math.floor(Math.random() * possible.length)];
	}

	return roomCode;
}

function changeRoom(firstRoom, secondRoom) {
    $(firstRoom).addClass('pt-page-rotatePushLeft');
    $(secondRoom).addClass('pt-page-moveFromRight');
    $(secondRoom).addClass('pt-page-current');
}

function determineWinner(pointScoring) {
    var winnerIndex = 0;
    var winnerPoints;
    
    var duplicate = copyArray(pointScoring);
    duplicate.sort(function(a,b){return a-b});
    winnerPoints = (duplicate[duplicate.length-1] == duplicate[duplicate.length-2]) ? -1 : duplicate[duplicate.length - 1];
    if(winnerPoints == -1) {
        return -1;
    }
    
    return findWinnerIndex(pointScoring, winnerPoints);
    
}

function findWinnerIndex(pointScoring, points) {
    for(i = 0; i < pointScoring.length; i++) {
        if(pointScoring[i] == points) {
            return i;
        }
    }
}



function copyArray(original) {
    var duplicate = [];
    for(i = 0; i < original.length; i++) {
        duplicate[i] = original[i];
    }
    return duplicate;
}


$(function() {
    var points = 0;
    var currentSet;
    var roomTransition = 1;
    var playerNumber = 0;
    var socket = io();

    if(window.location.pathname == '/') {
        var roomCode = generateRoomCode();
	   $("#main-window").append("<h2>" + roomCode + "<h2>");
        console.log(roomCode);
        socket.emit('new room', {room: roomCode});
    }
    
    //when numOfPlayers is determined
    $(".players").on('click', function() {
        changeRoom("#slide-0", "#slide-1");
        socket.emit("player-connect", ($(this).val()));
        return false;
    });
    
    //when user submits room code
    $(".roomcode").on('click', function() {
        
        socket.emit('mobile connect', $("#code-input").val());
        $("#code-input").val('');
        
        socket.on("wrong roomcode", function(message) {
            $("#error-code").text(message);            
            $("#error-code").css("display", "block");
            console.log(message);
        });
        
        socket.on("right roomcode", function(players) {
            if(players.maxNum != 1) {
                changeRoom("#slide-0", "#slide-1");
            }
            console.log("Player ID: " + players.playerNum);
            playerNumber = players.playerNum;
        });
        return false;

    });
    
    
    
    
    //when the room code matches, start game
    socket.on('start game', function(roomSwitch) {
        
        var firstString = (roomSwitch.solo) ? "#slide-0" : roomSwitch.roomids[roomTransition-1]; //change room based of whether solo or multiplayer
        var secondString = roomSwitch.roomids[roomTransition];
        changeRoom(firstString, secondString);
        socket.emit("lets play");
        
    });
    

    
    //serve next question
    socket.on('continue', function(set) {
        currentSet = set.currentSet;
        console.log("room transition: " + roomTransition);
        console.log("Player Points: " + set.playerPoints);
        var firstString = currentSet.roomTransition[roomTransition-1];
        var secondString = currentSet.roomTransition[roomTransition];
        console.log(firstString + " " + secondString);
        if(secondString != "#end")  {                //if not the last question
            $(secondString + ":first").append($("<h2 class = 'question-format'>").text("Question # " + roomTransition + ": " + currentSet.question));
            for(i = 0; i < 4; i++) {
                if(window.location.pathname == '/') {
                    $(secondString +":first").append($('<button class = "choice" type = "submit" disabled>').text(currentSet.choices[i]));
                }
                else {
                    $(secondString +":first").append($('<button class = "choice" type = "submit">').text(currentSet.choices[i]));
                }
            }
            var choiceCounter = 0;
            $(".choice").each(function() {
                if(choiceCounter > 3) {
                    choiceCounter = choiceCounter % 4;
                }
                $(this).val(currentSet.choices[choiceCounter++]);
            });
        }
        
        if(window.location.pathname != '/' && secondString != "#end") {
            $(secondString +":first").append($("<h2 class = 'question-format scoreboard'>").text("Points: " + points));
        }
        
        else {
            
            console.log("max players: " + set.maxPlayers);
            for(i = 0; i < set.maxPlayers; i++) {
                
                var playerScore;
                var classString = 'player-' + (i + 1);
                if(set.playerPoints[i] != undefined) {
                    
                    playerScore = $("<h2 class = 'question-format'>").text("Player " + (i + 1) + ": " + set.playerPoints[i]);
                }
                else {
                    playerScore = $("<h2 class = 'question-format'>").text("Player " + (i + 1) + ": " + 0);
                }
                $(secondString +":first").append(playerScore);
                playerScore.addClass(classString);
            }
            if(secondString == "#end") {
                var winner = determineWinner(set.playerPoints);
                var result; 
                if(set.maxPlayers == 1){
                    result = $("<h2 class = 'question-format'>").text("Your final score was " + set.playerPoints[0] + " points out of a possible 500");
                }
                
                else {                                    
                    result = (winner != -1) ? ($("<h2 class = 'question-format'>").text("Player " + (winner + 1) + " has won!")) : ($("<h2 class = 'question-format'>").text("There has been a tie for first place!"));
                    console.log(result);
                    
                } 
                
                $(secondString + ":first").append(result);
                
            }
        }

        changeRoom(firstString,secondString);
        
    });
    
    //when server sends back answer response to mobile
    socket.on("score-response", function(answer) {
        if(answer.userResponse) {
            $(currentSet.roomTransition[roomTransition] + ":first").append($("<h2 class = 'question-format'>").text("You are correct!"));
        }
        else {
            $(currentSet.roomTransition[roomTransition] + ":first").append($("<h2 class = 'question-format'>").text("You are wrong!"));

        }
        points += answer.score;
        $(".scoreboard").text("Points: " + points);
        if(!(answer.isSolo)) {
            $(currentSet.roomTransition[roomTransition] + ":first").append($("<h2 class = 'question-format'>").text("Waiting for other answers."));
        }
        roomTransition++;
        socket.emit("individual-score",{playerId: playerNumber, wasCorrect: answer.userResponse});
        
        
    });
    
    socket.on("desktop-update", function(answer) {
        console.log("index: " + (answer.playerId -1));
        console.log(answer.score);
        console.log("Player " + answer.playerId + ": " +  answer.score[(answer.playerId -1)]);
        var playerId = ".player-" + answer.playerId;
        console.log(playerId);
        $(playerId).text("Player " + answer.playerId + ": " + answer.score[(answer.playerId -1)]);     
        //updates that specific score on the desktop host screen
        
        if(answer.firstAnswer) {
            roomTransition++;       //makes sure the room to room transitions stay on track/ avoid indexoutofbounds
        }
    });
    
    socket.on("game end", function(data) {
        var firstRoom = data.slides[roomTransition];
        var secondRoom = "#disconnected";
        var message = $("<h2 class = 'wait'>").text(data.message);
        $(secondRoom + ":first").append(message);
        changeRoom(firstRoom, secondRoom);
        
    });
    
    
    $(document).on('click', '.choice', function() {
        socket.emit('answer',$(this).val());
        $(".choice").each(function() {
            $(this).prop('disabled', true);
        });

    });
    
     
    //FIX ROOM CODE/SETCOUNTER ERROR
    
    
});
