//Canvas
var canvas = document.getElementById('mainCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var ctx = canvas.getContext('2d');

//Sockets
var socket;
var clientId;

//Game Setup Variables
var numberOfPlayers;
var playerBoards = {};

var playersPerRow = 7;
var playersPerColumn = 7;

var numberOfColumns = 10;
var numberOfRows = 20;

var maxGarbageLines = 16;

var place = 99;
var badgePoints = 0;

var numberOfKOs = 0;

var votesToStart = 0;
var inLobby = false;

var gameStarted = false;
var gameOver = false;
var won = false;

window.addEventListener('resize', function(event){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    playStartX = canvas.width / 2 - playWidth / 2;
    playStartY = canvas.height / 2 - playHeight / 2;

    if(!gameStarted && !gameOver && inLobby)
        updateLobby(lobbyPlayers);
});


function setup(){
    //socket = io.connect('http://' + $('#connectTo').val());
    socket = io.connect('http://t66-alb-1977116731.us-west-1.elb.amazonaws.com/');
    //socket = io.connect('http://localhost:8080');
    socket.on('updateLobby', updateLobby);
    socket.on('startGame', commenceGame);
    socket.on('gridUpdates', updateGrids);
    socket.on("attacking", setDefending);
    socket.on('lines', recieveLines);
    socket.on('KO', knockOut);
    socket.on('badges', badges)
    socket.on('addKO', addKO);
    socket.on('voteStart', updateVotes);
    $("#header").hide();
    joinLobby();
}

var idleTime = 0;
$(document).ready(function () {

    //Increment the idle time counter every minute.
    var idleInterval = setInterval(timerIncrement, 3000); // 3 seconds

    //Zero the idle timer on mouse movement.
    $(this).mousemove(function (e) {
        idleTime = 0;
    });
    $(this).keypress(function (e) {
        idleTime = 0;
    });
});

function timerIncrement() {

    if(!gameStarted)
        return;

    idleTime++;

    if (idleTime > 10) { // 30 seconds
        alert("Idle too long :(");
        window.location.reload();

        // var column = Math.floor(Math.random() * 11);
        
        // for (let i = 0; i < 8; i++) {
        //     if(garbageBarLines.length < maxGarbageLines)
        //         garbageBarLines.push({time: 0, column: column, block: new Block(0, 15 - garbageBarLines.length, garbageBlockColor), attackerId: null});
        // }
    }
}

function commenceGame(data){

    inLobby = false;

    $("#voteStart").hide();

    clientId = socket.io.engine.id;
    var numberOfPlayers = data.players.length - 1;
    place = numberOfPlayers + 1;
    var playerIds = Object.values(data.players);
    
    playerIds = shuffle(playerIds);

    for (let i = 0; i < playerIds.length; i++) {
        const playerId = playerIds[i];

        if(playerId == clientId)
            playerIds.splice(i, 1);
        
    }

    var rowNum = 0;
    var columnNum = 0;
    var side = 0;

    for (let i = 0; i < numberOfPlayers; i++) {
        var grid = {columns: []};

        if(i == numberOfPlayers / 2)
        {
            rowNum = 0;
            columnNum = 0
            side++;
        }

        for (let n = 0; n < numberOfColumns; n++) {
            var column = [];
    
            for (let x = 0; x < numberOfRows; x++) {
                column.push(null);
            }
    
            grid.columns.push(column);
        }
        
        playerBoards[playerIds[i]] = {id: playerIds[i], grid: grid, column: columnNum, row: rowNum, side: side, alive: true, badges: {}};

        columnNum++;

        if(columnNum >= playersPerColumn)
        {
            rowNum++;
            columnNum = 0;
        }
    }

    startGame();
}

function voteStart(){
    if(!gameStarted)
        socket.emit('voteStart', true);

    $("#voteStart").attr("disabled", "disabled");
}

function updateVotes(data){
    votesToStart = data;
    updateLobby(lobbyPlayers);
}

function joinLobby(){
    $("#connectTo").hide();
    $('#joinLobby').hide();
    socket.emit('joinLobby');

    inLobby = true;
}

function knockOut(data){

    if(!gameOver)
    {
        place--;

        if(place == 1)
        {
            stopGame(true);
            $('#victory').css('visibility', 'visible');
        }
    }

    playerBoards[data.id].alive = false;
    playerBoards[data.id].place = data.place;
}

function addKO()
{
    numberOfKOs++;
}   

function badges(data){

    if(data.playerId != clientId)
        playerBoards[data.playerId].badges = data.badges;
    else
        badgePoints = data.badges;
}

function recieveLines(data){
    for (let i = 0; i < data.lines; i++) {
        if(garbageBarLines.length < maxGarbageLines)
            garbageBarLines.push({time: 0, column: data.column, block: new Block(0, 15 - garbageBarLines.length, garbageBlockColor), attackerId: data.id});
    }
}

function setDefending(data){
    if(data.add == true)
        defending.push(data.id);
    else
        defending.splice(defending.indexOf(data.id), 1);
}

function updateGrids(data){
    for (let i = 0; i < data.length; i++) {
        const update = data[i];

        updateGrid(playerBoards[update.id], {row: update.row, column: update.column, color: update.color});
    }
}

var lobbyPlayers = 0;

function updateLobby(playersInLobby){

    lobbyPlayers = playersInLobby;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var padding = canvas.height / 50;
    var lobbyClientSize =canvas.height / 50;
    var playersPerRow = 8;

    var lobbySize = (lobbyClientSize + padding) * playersPerRow + padding;

    var lobbyX = canvas.width / 2 - lobbySize / 2;
    var lobbyY = canvas.height / 2 - lobbySize / 1.2;
    
    //Draw Lobby
    ctx.strokeStyle = "#429df7";
    ctx.lineWidth = 5;
    roundRect(ctx, lobbyX,lobbyY, lobbySize, lobbySize, 10, null, "white");

    ctx.font = (canvas.height / 30) + "px Rubik";
    ctx.fillStyle = "white";
    ctx.fillText("number of players: " + playersInLobby, lobbyX, lobbyY + lobbySize + padding * 2);
    ctx.font = (canvas.height / 50) + "px Rubik";

    ctx.globalAlpha = .6;
    ctx.fillText("game will start with 99", lobbyX, lobbyY + lobbySize + padding * 4);
    ctx.fillText("votes for early start: " + votesToStart, lobbyX, lobbyY + lobbySize + padding * 6);

    var votesNeeded = playersInLobby;

    if(votesNeeded == 1)
        votesNeeded++;
        
    ctx.fillText("votes needed: " + votesNeeded, lobbyX, lobbyY + lobbySize + padding * 8);

    ctx.globalAlpha = 1;

    var clientX = 0;
    var clientY = 0;
    var row = 1;

    for (let i = 0; i < playersInLobby; i++) {
        ctx.fillStyle = "white";
        ctx.lineWidth = 2;
        roundRect(ctx, padding + lobbyX + clientX, padding + lobbyY + clientY, lobbyClientSize, lobbyClientSize, 4, "white");
        
        clientX += padding + lobbyClientSize;

        if((i + 1)/ row - playersPerRow == 0)
        {
            clientX = 0;
            clientY += padding + lobbyClientSize;
            row++;
        }
    }
}

var backgroundToggle = true;

function togglePaint(){

    backgroundToggle = !backgroundToggle;

    if(backgroundToggle)
        $("#background").show();
    else
        $("#background").hide();

}


function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
  
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  
    return array;
}

//setup();