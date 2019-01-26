var socket = io();
var playerAnswered = false;
var correct = false;
var name;
var score = 0;

var params = jQuery.deparam(window.location.search); //Gets the id from url

socket.on('connect', function() {
    //Tell server that it is host connection from game view
    socket.emit('player-join-game', params);
    
    document.getElementById('answer').style.visibility = "visible";
});

socket.on('noGameFound', function(){
    window.location.href = '../../';//Redirect user to 'join game' page 
});

function playerAnswer(){
    var answer = document.getElementById('text').value;
    if(playerAnswered == false){
        playerAnswered = true;
        
        socket.emit('playerAnswer', answer);//Sends player answer to server
        
        //Hiding buttons from user
        document.getElementById('answer').style.visibility = "hidden";
        document.getElementById('message').style.display = "block";
        document.getElementById('message').innerHTML = "Answer Submitted! Waiting on other players...";
        
    }
}

socket.on('questionOver', function(playerData){
    var container = document.getElementById("othersAnswers");
    for (let i = 0; i < playerData.length; i++) {
        if(playerData[i].playerId != socket.id){
            var button = document.createElement("button");
            button.innerHTML = playerData[i].gameData.answer;
            button.setAttribute('onClick', "voteForAnswer('" + playerData[i].playerId + "')");
            button.setAttribute('id', 'voteButton');
            container.appendChild(button);
            // document.getElementById('answer').style.visibility = "hidden";
            //socket.emit('getScore');          Maybe will be used later
        }
    }
});

function voteForAnswer(votedForID) {
    socket.emit('playerVote', votedForID);
}

socket.on('newScore', function(data){
    document.getElementById('scoreText').innerHTML = "Score: " + data;
});

socket.on('nextQuestionPlayer', function(data){
    correct = false;
    playerAnswered = false;
    
    document.getElementById('answer').style.visibility = "visible";
    // document.getElementById('message').style.display = "none";
    document.getElementById('message').innerText = data;
    document.body.style.backgroundColor = "white";
    
});

socket.on('hostDisconnect', function(){
    window.location.href = "../../";
});

socket.on('playerGameData', function(data){
   for(var i = 0; i < data.length; i++){
       if(data[i].playerId == socket.id){
           document.getElementById('nameText').innerHTML = "Name: " + data[i].name;
       }
   }
});

socket.on('GameOver', function(){
    document.body.style.backgroundColor = "#FFFFFF";
    document.getElementById('answer').style.visibility = "hidden";
    document.getElementById('message').style.display = "block";
    document.getElementById('message').innerHTML = "GAME OVER";
});

