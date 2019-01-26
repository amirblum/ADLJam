var socket = io();
var params = jQuery.deparam(window.location.search); //Gets the id from url

var currentQuestion = 0;

//When host connects to server
socket.on('connect', function(data) {
    
    //Tell server that it is host connection from game view
    socket.emit('host-join-game', params);
});

socket.on('noGameFound', function(){
   window.location.href = '../../';//Redirect user to 'join game' page
});

function nextQuestion(){
    document.getElementById('nextQButton').style.display = "none";
    document.getElementById('playersResponded').style.display = "block";
    
    socket.emit('nextQuestion'); //Tell server to start new question
}

socket.on('gameQuestions', function(data){
    currentQuestion++;

    document.getElementById('scene').innerHTML = data.scene;
    document.getElementById('img').innerHTML = '<img src="' + data.img + '">';
    document.getElementById('question').innerHTML = data.question;
    document.getElementById('questionNum').innerHTML = "Question " + currentQuestion + " / " + data.totalQuestions;
    document.getElementById('playersResponded').innerHTML = "Players Answered 0 / " + data.playersInGame;
});

socket.on('updatePlayersAnswered', function(data){
    document.getElementById('playersResponded').innerHTML = "Players Answered " + data.playersAnswered + " / " + data.playersInGame; 
});

function collectAnswers(){
    socket.emit('collectAnswers');
}

socket.on('questionOver', function(playerData){
    var ans;
    var container = document.getElementById("answers");
    for (let i = 0; i < playerData.length; i++) {
        ans = document.createElement("h3");
        ans.innerHTML = playerData[i].gameData.answer;
        container.appendChild(ans);
    }
    //Hide elements on page
    document.getElementById('playersResponded').innerHTML = "Players Voted 0 / " + playerData.length;
});

function collectPolls(){
    socket.emit('collectPolls');
}

socket.on('updatePlayersVoted', function(data){
    document.getElementById('playersResponded').innerHTML = "Players Voted " + data.playersVoted + " / " + data.playersInGame; 
});

socket.on('votingOver', function(playerData){
    var poll;
    var container = document.getElementById("polls");

    for (let i = 0; i < playerData.length; i++) {
        poll = document.createElement("h3");
        poll.innerHTML = playerData[i].gameData.answer + ': ' + playerData[i].gameData.numVotes;
        container.appendChild(poll);
    }
    
    document.getElementById('nextQButton').style.display = "block";
});



socket.on('AnswersRecived', function(arr){

});

socket.on('GameOver', function(data){
    document.getElementById('nextQButton').style.display = "none";
    document.getElementById('question').innerHTML = "GAME OVER";
    document.getElementById('playersResponded').innerHTML = "";
});