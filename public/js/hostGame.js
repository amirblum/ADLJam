var socket = io();
var params = jQuery.deparam(window.location.search); //Gets the id from url

var currentQuestion = 0;

var sceneText = document.getElementById('scene'),
    message = document.getElementById('question'),
    image = document.getElementById('img'),
    answersContainer = document.getElementById("answers"),
    pollsContainer = document.getElementById("polls"),
    questionNum = document.getElementById('questionNum'),
    playersResponded = document.getElementById('playersResponded'),
    collectAButton = document.getElementById('collectAns'),
    collectPButton = document.getElementById('collectPolls'),
    nextQButton = document.getElementById('nextQButton');


function hideElement(element){
    element.style.display = "none";
}

function showElement(element){
    element.style.display = "block";    
}

//When host connects to server
socket.on('connect', function(data) {
    //Tell server that it is host connection from game view
    socket.emit('host-join-game', params);
});

socket.on('noGameFound', function(){
   window.location.href = '../../';//Redirect user to 'join game' page
});

function nextQuestion(){
    hideElement(nextQButton)
    hideElement(collectPButton)

    socket.emit('nextQuestion'); //Tell server to start new question
}

socket.on('gameQuestions', function(data){
    currentQuestion++;

    sceneText.innerHTML = data.scene;
    message.innerHTML = data.question;
    image.innerHTML = '<img src="' + data.img + '">';

    showElement(sceneText);
    showElement(message);
    showElement(image);

    showElement(collectAButton);

    hideElement(answersContainer);
    hideElement(pollsContainer);
    hideElement(collectPButton);
    hideElement(nextQButton);

    showElement(playersResponded);
    
    questionNum.innerHTML = "Question " + currentQuestion + " / " + data.totalQuestions;
    playersResponded.innerHTML = "Players Answered 0 / " + data.playersInGame;
});

socket.on('updatePlayersAnswered', function(data){
    document.getElementById('playersResponded').innerHTML = "Players Answered " + data.playersAnswered + " / " + data.playersInGame; 
});

function collectAnswers(){
    socket.emit('collectAnswers');
}

socket.on('questionOver', function(playerData){
    //Hide elements on page
    hideElement(sceneText);
    hideElement(message);
    hideElement(image);
    hideElement(collectAButton)

    showElement(collectPButton);

    // Setup voting
    for (let i = 0; i < playerData.length; i++) {
        var ans = document.createElement("h3");
        ans.innerHTML = playerData[i].gameData.answer;
        ans.setAttribute('id', 'answer');

        answersContainer.appendChild(ans);
    }
    showElement(answersContainer);

    playersResponded.innerHTML = "Players Voted 0 / " + playerData.length;
});

function collectPolls(){
    socket.emit('collectPolls');
}

socket.on('updatePlayersVoted', function(data){
    document.getElementById('playersResponded').innerHTML = "Players Voted " + data.playersVoted + " / " + data.playersInGame; 
});

socket.on('votingOver', function(playerData){
    // Hide answers
    hideElement(answersContainer);
    hideElement(collectPButton);

    for (let i = 0; i < playerData.length; i++) {
        var poll = document.createElement("h3");
        poll.innerHTML = playerData[i].gameData.answer + ': ' + playerData[i].gameData.numVotes;
        pollsContainer.appendChild(poll);
    }

    showElement(pollsContainer);
    showElement(nextQButton);
});

socket.on('GameOver', function(data){
    showElement(message);

    document.getElementById('nextQButton').style.display = "none";
    document.getElementById('question').innerHTML = "GAME OVER";
    document.getElementById('playersResponded').innerHTML = "";
});