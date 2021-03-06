//Import dependencies
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');

//Import classes
const {LiveGames} = require('./utils/liveGames');
const {Players} = require('./utils/players');

const publicPath = path.join(__dirname, '../public');
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var games = new LiveGames();
var players = new Players();

//Mongodb setup
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://heroku_lw0wlxwv:e56d4tbujujf6iohn45f0ehue9@ds113495.mlab.com:13495/heroku_lw0wlxwv";

app.use(express.static(publicPath));

var port = process.env.PORT || 3000;

//Starting server on port 3000
server.listen(port, () => {
    console.log("Server started on port " + port);

    // Add default quizes if needed
    MongoClient.connect(url, function(err, db){
        if (err) {console.log(err);throw err};
        var dbo = db.db('heroku_lw0wlxwv');
        dbo.collection('foaGames').find({}).toArray(function(err, result){
            if(err) {console.log(err);throw err};
            if(Object.keys(result).length == 0){
                // No quizes found, load the defaults
                fs.readdir('./quizes/', (err, files) => {
                    if(err) {console.log(err);throw err};
                    
                    let num = 1;
                    files.forEach(file => {
                        var game = require('../quizes/' + file);
                        game.id = num++;
    
                        console.log('Adding default quiz: ' + game.name);
    
                        dbo.collection("foaGames").insertOne(game, function(err, res) {
                            if (err) {console.log(err);throw err};
                            db.close();
                        });
                    });
                })
            }
        });
    });
});

//When a connection to server is made from client
io.on('connection', (socket) => {

    //When host connects for the first time
    socket.on('host-join', (data) =>{
        
        //Check to see if id passed in url corresponds to id of game in database
        MongoClient.connect(url, function(err, db) {
            if (err) {console.log(err);throw err};
            var dbo = db.db("heroku_lw0wlxwv");
            var query = { id:  parseInt(data.id)};
            dbo.collection('foaGames').find(query).toArray(function(err, result){
                if(err) {console.log(err);throw err};
                
                //A game was found with the id passed in url
                if(result[0] !== undefined){
                    var gamePin = Math.floor(Math.random()*90000) + 10000; //new pin for game

                    games.addGame(gamePin, socket.id, false, {playersAnswered: 0, playersVoted: 0, questionLive: false, votingLive: false, gameid: data.id, question: 1}); //Creates a game with pin and host id

                    var game = games.getGame(socket.id); //Gets the game data

                    socket.join(game.pin);//The host is joining a room based on the pin

                    console.log('Game Created with pin:', game.pin); 

                    //Sending game pin to host so they can display it for players to join
                    socket.emit('showGamePin', {
                        pin: game.pin
                    });
                }else{
                    socket.emit('noGameFound');
                }
                db.close();
            });
        });
        
    });
    
    //When the host connects from the game view
    socket.on('host-join-game', (data) => {
        var oldHostId = data.id;
        var game = games.getGame(oldHostId);//Gets game with old host id
        if(game){
            game.hostId = socket.id;//Changes the game host id to new host id
            socket.join(game.pin);
            var playerData = players.getPlayers(oldHostId);//Gets player in game
            for(var i = 0; i < Object.keys(players.players).length; i++){
                if(players.players[i].hostId == oldHostId){
                    players.players[i].hostId = socket.id;
                }
            }
            var gameid = game.gameData['gameid'];
            MongoClient.connect(url, function(err, db){
                if (err) {console.log(err);throw err};
    
                var dbo = db.db('heroku_lw0wlxwv');
                var query = { id:  parseInt(gameid)};
                dbo.collection("foaGames").find(query).toArray(function(err, res) {
                    if (err) {console.log(err);throw err};
                    
                    var scene = res[0].questions[0].scene;
                    var question = res[0].questions[0].question;
                    var img = res[0].questions[0].img;
                    var totalQuestions = res[0].questions.length;
                    
                    socket.emit('gameQuestions', {
                        scene: scene,
                        question: question,
                        img: img,
                        totalQuestions: totalQuestions,
                        playersInGame: playerData.length
                    });
                    db.close();
                });
            });
            
            
            io.to(game.pin).emit('gameStartedPlayer');
            game.gameData.questionLive = true;
        }else{
            socket.emit('noGameFound');//No game was found, redirect user
        }
    });
    
    //When player connects for the first time
    socket.on('player-join', (params) => {
        
        var gameFound = false; //If a game is found with pin provided by player
        
        //For each game in the Games class
        for(var i = 0; i < games.games.length; i++){
            //If the pin is equal to one of the game's pin
            if(params.pin == games.games[i].pin){
                
                console.log('Player connected to game');
                
                var hostId = games.games[i].hostId; //Get the id of host of game
                
                
                players.addPlayer(hostId, socket.id, params.name, {score: 0, numVotes: 0, answer: 0}); //add player to game
                
                socket.join(params.pin); //Player is joining room based on pin
                
                var playersInGame = players.getPlayers(hostId); //Getting all players in game
                
                io.to(params.pin).emit('updatePlayerLobby', playersInGame);//Sending host player data to display
                gameFound = true; //Game has been found
            }
        }
        
        //If the game has not been found
        if(gameFound == false){
            socket.emit('noGameFound'); //Player is sent back to 'join' page because game was not found with pin
        }
        
        
    });
    
    //When the player connects from game view
    socket.on('player-join-game', (data) => {
        var player = players.getPlayer(data.id);
        if(player){
            var game = games.getGame(player.hostId);
            socket.join(game.pin);
            player.playerId = socket.id;//Update player id with socket id
            
            var playerData = players.getPlayers(game.hostId);
            socket.emit('playerGameData', playerData);
        }else{
            socket.emit('noGameFound');//No player found
        }
        
    });
    
    //When a host or player leaves the site
    socket.on('disconnect', () => {
        var game = games.getGame(socket.id); //Finding game with socket.id
        //If a game hosted by that id is found, the socket disconnected is a host
        if(game){
            //Checking to see if host was disconnected or was sent to game view
            if(game.gameLive == false){
                games.removeGame(socket.id);//Remove the game from games class
                console.log('Game ended with pin:', game.pin);

                var playersToRemove = players.getPlayers(game.hostId); //Getting all players in the game

                //For each player in the game
                for(var i = 0; i < playersToRemove.length; i++){
                    players.removePlayer(playersToRemove[i].playerId); //Removing each player from player class
                }

                io.to(game.pin).emit('hostDisconnect'); //Send player back to 'join' screen
                socket.leave(game.pin); //Socket is leaving room
            }
        }else{
            //No game has been found, so it is a player socket that has disconnected
            var player = players.getPlayer(socket.id); //Getting player with socket.id
            //If a player has been found with that id
            if(player){
                var hostId = player.hostId;//Gets id of host of the game
                var game = games.getGame(hostId);//Gets game data with hostId
                var pin = game.pin;//Gets the pin of the game
                
                if(game.gameLive == false){
                    players.removePlayer(socket.id);//Removes player from players class
                    var playersInGame = players.getPlayers(hostId);//Gets remaining players in game

                    io.to(pin).emit('updatePlayerLobby', playersInGame);//Sends data to host to update screen
                    socket.leave(pin); //Player is leaving the room
            
                }
            }
        }
        
    });
    
    //Sets data in player class to answer from player
    socket.on('playerAnswer', function(answer){
        var player = players.getPlayer(socket.id);
        var hostId = player.hostId;
        var playerNum = players.getPlayers(hostId);
        var game = games.getGame(hostId);
        if(game.gameData.questionLive == true){//if the question is still live
            player.gameData.answer = answer;
            game.gameData.playersAnswered += 1;

            //Checks if all players answered
            if(game.gameData.playersAnswered == playerNum.length){
                game.gameData.questionLive = false; //Question has been ended bc players all answered under time
                game.gameData.votingLive = true; //Question has been ended bc players all answered under time
                var playerData = players.getPlayers(game.hostId);
                io.to(game.pin).emit('questionOver', playerData);//Tell everyone that question is over
            }else{
                //update host screen of num players answered
                io.to(game.pin).emit('updatePlayersAnswered', {
                    playersInGame: playerNum.length,
                    playersAnswered: game.gameData.playersAnswered
                });
            }
        }
    });

    //Sets data in player class to answer from player
    socket.on('playerVote', function(voteID){
        var player = players.getPlayer(socket.id);
        var votedForPlayer = players.getPlayer(voteID);
        var hostId = player.hostId;
        var playerNum = players.getPlayers(hostId);
        var game = games.getGame(hostId);
        if(game.gameData.votingLive == true) {//if the voting is still live
            votedForPlayer.gameData.numVotes++;
            votedForPlayer.gameData.score += 100;
            game.gameData.playersVoted += 1;

            //Checks if all players voted
            if(game.gameData.playersVoted == playerNum.length){
                game.gameData.votingLive = false; //voting has been ended bc players all voted
                var playerData = players.getPlayers(game.hostId);
                io.to(game.pin).emit('votingOver', playerData);//Tell everyone that voting is over
            }else{
                //update host screen of num players answered
                io.to(game.pin).emit('updatePlayersVoted', {
                    playersInGame: playerNum.length,
                    playersVoted: game.gameData.playersVoted
                });
            }
        }
    });
    
    socket.on('getScore', function(){
        var player = players.getPlayer(socket.id);
        socket.emit('newScore', player.gameData.score); 
    });
    
    socket.on('time', function(data){
        var time = data.time / 20;
        time = time * 100;
        var playerid = data.player;
        var player = players.getPlayer(playerid);
        player.gameData.score += time;
    });
       
    socket.on('nextQuestion', function(){
        var playerData = players.getPlayers(socket.id);
        //Reset players current answer to 0
        for (var i = 0; i < Object.keys(players.players).length; i++) {
            if (players.players[i].hostId == socket.id) {
                players.players[i].gameData.answer = '';
            }
        }
        
        var game = games.getGame(socket.id);
        game.gameData.playersAnswered = 0;
        game.gameData.questionLive = true;
        game.gameData.question += 1;
        var gameid = game.gameData.gameid;
        
        MongoClient.connect(url, function(err, db){
                if (err) {console.log(err);throw err};
    
                var dbo = db.db('heroku_lw0wlxwv');
                var query = { id:  parseInt(gameid)};
                dbo.collection("foaGames").find(query).toArray(function(err, res) {
                    if (err) {console.log(err);throw err};
                    
                    if(res[0].questions.length >= game.gameData.question){
                        var questionNum = game.gameData.question;
                        questionNum = questionNum - 1;

                        var scene = res[0].questions[questionNum].scene;
                        var question = res[0].questions[questionNum].question;
                        var img = res[0].questions[questionNum].img;
                        var totalQuestions = res[0].questions.length;

                        socket.emit('gameQuestions', {
                            scene: scene,
                            question: question,
                            img: img,
                            totalQuestions: totalQuestions,
                            playersInGame: playerData.length
                        });
                        
                        db.close();
                    
                        io.to(game.pin).emit('nextQuestionPlayer', { question: question});
                    }else{
                        var playersInGame = players.getPlayers(game.hostId);
                        var first = {name: "", score: 0};
                        var second = {name: "", score: 0};
                        var third = {name: "", score: 0};
                        var fourth = {name: "", score: 0};
                        var fifth = {name: "", score: 0};
                        
                        for(var i = 0; i < playersInGame.length; i++){
                            console.log(playersInGame[i].gameData.score);
                            if(playersInGame[i].gameData.score > fifth.score){
                                if(playersInGame[i].gameData.score > fourth.score){
                                    if(playersInGame[i].gameData.score > third.score){
                                        if(playersInGame[i].gameData.score > second.score){
                                            if(playersInGame[i].gameData.score > first.score){
                                                //First Place
                                                fifth.name = fourth.name;
                                                fifth.score = fourth.score;
                                                
                                                fourth.name = third.name;
                                                fourth.score = third.score;
                                                
                                                third.name = second.name;
                                                third.score = second.score;
                                                
                                                second.name = first.name;
                                                second.score = first.score;
                                                
                                                first.name = playersInGame[i].name;
                                                first.score = playersInGame[i].gameData.score;
                                            }else{
                                                //Second Place
                                                fifth.name = fourth.name;
                                                fifth.score = fourth.score;
                                                
                                                fourth.name = third.name;
                                                fourth.score = third.score;
                                                
                                                third.name = second.name;
                                                third.score = second.score;
                                                
                                                second.name = playersInGame[i].name;
                                                second.score = playersInGame[i].gameData.score;
                                            }
                                        }else{
                                            //Third Place
                                            fifth.name = fourth.name;
                                            fifth.score = fourth.score;
                                                
                                            fourth.name = third.name;
                                            fourth.score = third.score;
                                            
                                            third.name = playersInGame[i].name;
                                            third.score = playersInGame[i].gameData.score;
                                        }
                                    }else{
                                        //Fourth Place
                                        fifth.name = fourth.name;
                                        fifth.score = fourth.score;
                                        
                                        fourth.name = playersInGame[i].name;
                                        fourth.score = playersInGame[i].gameData.score;
                                    }
                                }else{
                                    //Fifth Place
                                    fifth.name = playersInGame[i].name;
                                    fifth.score = playersInGame[i].gameData.score;
                                }
                            }
                        }
                        
                        io.to(game.pin).emit('GameOver', {
                            num1: first.name,
                            num2: second.name,
                            num3: third.name,
                            num4: fourth.name,
                            num5: fifth.name
                        });
                    }
                });
                
            });
        
    });

    socket.on('collectAnswers', function(){
        var game = games.getGame(socket.id);
        game.gameData.questionLive = false;
        game.gameData.votingLive = true;

        var playerData = players.getPlayers(game.hostId);
        io.to(game.pin).emit('questionOver', playerData);
    });

    socket.on('collectPolls', function(){
        var game = games.getGame(socket.id);
        game.gameData.votingLive = false;
        var playerData = players.getPlayers(game.hostId);
        
        var gameid = game.gameData.gameid;
            
            MongoClient.connect(url, function(err, db){
                if (err) {console.log(err);throw err};
    
                var dbo = db.db('heroku_lw0wlxwv');
                var query = { id:  parseInt(gameid)};
                dbo.collection("foaGames").find(query).toArray(function(err, res) {
                    if (err) {console.log(err);throw err};
                    io.to(game.pin).emit('votingOver', playerData);
                    
                    db.close();
                });
            });
    });
    
    //When the host starts the game
    socket.on('startGame', () => {
        var game = games.getGame(socket.id);//Get the game based on socket.id
        game.gameLive = true;
        socket.emit('gameStarted', game.hostId);//Tell player and host that game has started
    });
    
    //Give user game names data
    socket.on('requestDbNames', function(){
        
        MongoClient.connect(url, function(err, db){
            if (err) {console.log(err);throw err};
    
            var dbo = db.db('heroku_lw0wlxwv');
            dbo.collection("foaGames").find().toArray(function(err, res) {
                if (err) {console.log(err);throw err};

                socket.emit('gameNamesData', res);
                db.close();
            });
        }); 
    });
    
    
    socket.on('newQuiz', function(data){
        MongoClient.connect(url, function(err, db){
            if (err) {console.log(err);throw err};
            var dbo = db.db('heroku_lw0wlxwv');
            dbo.collection('foaGames').find({}).toArray(function(err, result){
                if(err) {console.log(err);throw err};
                var num = Object.keys(result).length;
                if(num == 0){
                	data.id = 1;
                	num = 1;
                }else{
                	data.id = result[num -1 ].id + 1;
                }
                var game = data;
                dbo.collection("foaGames").insertOne(game, function(err, res) {
                    if (err) {console.log(err);throw err};
                    db.close();
                });
                db.close();
                socket.emit('startGameFromCreator', num);
            });
        });
    });
});














































