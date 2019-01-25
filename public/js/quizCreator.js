var socket = io();
var questionNum = 1; //Starts at two because question 1 is already present

function updateDatabase(){
    var questions = [];
    var name = document.getElementById('name').value;
    for(var i = 1; i <= questionNum; i++){
        var question = document.getElementById('q' + i).value;
        questions.push({"question": question})
    }
    
    var quiz = {id: 0, "name": name, "questions": questions};
    socket.emit('newQuiz', quiz);
}

function addQuestion(){
    questionNum += 1;
    
    var questionsDiv = document.getElementById('allQuestions');
    
    var newQuestionDiv = document.createElement("div");

    var sceneLabel = document.createElement('label');
    var sceneField = document.createElement('textarea');

    var questionLabel = document.createElement('label');
    var questionField = document.createElement('input');
    
    
    sceneLabel.innerHTML = "Scene " + String(questionNum) + ": ";
    sceneField.setAttribute('class', 'scene');
    sceneField.setAttribute('id', 's' + String(questionNum));
    sceneField.maxLength = "5000";
    sceneField.cols = "53";
    sceneField.rows = "10";
    sceneField.setAttribute('type', 'text');


    questionLabel.innerHTML = "Question " + String(questionNum) + ": ";
    questionField.setAttribute('class', 'question');
    questionField.setAttribute('id', 'q' + String(questionNum));
    questionField.setAttribute('type', 'text');
    questionField.setAttribute('size', "53");
    
    
    newQuestionDiv.setAttribute('id', 'question-field');//Sets class of div
    
    //need?

    
    newQuestionDiv.appendChild(sceneLabel);
    newQuestionDiv.appendChild(sceneField);

    newQuestionDiv.appendChild(document.createElement('br'));
    newQuestionDiv.appendChild(document.createElement('br'));

    newQuestionDiv.appendChild(questionLabel);
    newQuestionDiv.appendChild(questionField);

    
    questionsDiv.appendChild(document.createElement('br'));//Creates a break between each question
    questionsDiv.appendChild(newQuestionDiv);//Adds the question div to the screen
    
    newQuestionDiv.appendChild(document.createElement('br'));
    newQuestionDiv.appendChild(document.createElement('br'));

    newQuestionDiv.style.backgroundColor = randomColor();
}

//Called when user wants to exit quiz creator
function cancelQuiz(){
    if (confirm("Are you sure you want to exit? All work will be DELETED!")) {
        window.location.href = "../";
    }
}

socket.on('startGameFromCreator', function(data){
    window.location.href = "../../host/?id=" + data;
});

function randomColor(){
    green='#008b43'
    purple="#702c92"
    return '#008b43';
}

function setBGColor(){
    var randColor = randomColor();
    document.getElementById('question-field').style.backgroundColor = randColor;
}









