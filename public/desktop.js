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


$(function() {
    var points = 0;
    var currentSet;
    var socket = io();
    var isNotFirst = false;         //don't add points to first question
    var roomTransition = 1;
    var roomCode = generateRoomCode();
	$("#main-window").append("<h2>" + roomCode + "<h2>");
    
    var socket = io();
    console.log(roomCode);
    socket.emit('new room', {room: roomCode});
    
    
    /*socket.on('continue', function(set) {
        currentSet = set;
        console.log(set.choices[0]);
        var firstString = set.roomTransition[roomTransition-1];
        var secondString = set.roomTransition[roomTransition];
        var firstRoom = $(firstString);
        var secondRoom = $(secondString);
        
        $(secondString + ":first").append($("<h2 class = 'question-format'>").text(set.question));
        for(i = 0; i < 4; i++) {
             console.log("HELLO!");
            $(secondString +":first").append($('<button class = "choice" type = "submit">').text(set.choices[i]));
        }
        $(secondString +":first").append($("<h2 id = 'scoreboard' class = 'question-format'>").text("Points: " + points));
        var counter = 0;
        $(".choice").each(function() {
            $(this).val(set.choices[counter++]);            
        });
        
        
        $(firstRoom).addClass('pt-page-rotatePushLeft');
        $(secondRoom).addClass('pt-page-moveFromRight');
        $(secondRoom).addClass('pt-page-current');
        console.log(secondRoom);
        
    });
    
    socket.on('hello', function(data) {
        console.log("hello");
    })
    
    socket.on("score-response", function(answer) {
        
        if(answer.isCorrect) {
            $(currentSet.roomTransition[roomTransition] + ":first").append($("<h2 class = 'question-format'>").text("You are correct!"));
        }
        else {
            $(currentSet.roomTransition[roomTransition++] + ":first").append($("<h2 class = 'question-format'>").text("You are wrong!"));

        }
        points += answer.score;
        $("#scoreboard").text("Points: " + points);
        
        
    });
    
    $(document).on('click', '.choice', function() {
        console.log($(this).val());
        socket.emit('answer',$(this).val()); 
    }); */
     
    
    
    
});