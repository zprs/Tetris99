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

function setup(){
    socket = io.connect('http://' + $('#connectTo').val());
    //socket = io.connect('http://99.30.176.150:8080');
    //socket = io.connect('http://localhost:8080');
    socket.on('updateLobby', updateLobby);
    socket.on('startGame', commenceGame);
    socket.on('gridUpdates', updateGrids);
    socket.on("attacking", setDefending);
    socket.on('lines', recieveLines);
    socket.on('KO', knockOut);
    socket.on('badges', badges)

    joinLobby();
}

function commenceGame(data){
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

function joinLobby(){
    $("#connectTo").hide();
    $('#joinLobby').hide();
    socket.emit('joinLobby');
}

function knockOut(data){

    if(!gameOver)
    {
        place--;

        if(place == 1)
        {
            stopGame(true);
            $('#victoryRoyale').css('visibility', 'visible');
        }
    }

    playerBoards[data.id].alive = false;
    playerBoards[data.id].place = data.place;
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

function updateLobby(playersInLobby){

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var lobbyX = canvas.width / 45;
    var lobbyY = canvas.width / 45;

    var padding = canvas.width / 80;
    var lobbyClientSize = canvas.width / 100;
    var playersPerRow = 8;

    var lobbySize = (lobbyClientSize + padding) * playersPerRow + padding;
    
    //Draw Lobby
    ctx.strokeStyle = "#429df7";
    ctx.lineWidth = 2;
    ctx.strokeRect(lobbyX,lobbyY, lobbySize, lobbySize);

    ctx.font = "20px Arial";
    ctx.fillStyle = "black";
    ctx.fillText("number of players: " + playersInLobby, lobbyX, lobbyY + lobbySize + padding * 2);
    ctx.font = "15px Arial";
    ctx.fillText("game will start at 99", lobbyX, lobbyY + lobbySize + padding * 4);

    var clientX = 0;
    var clientY = 0;
    var row = 1;

    for (let i = 0; i < playersInLobby; i++) {


        ctx.fillStyle = "#429df7";
        ctx.strokeStyle = "#429df7";;
        ctx.lineWidth = 2;
        ctx.fillRect(padding + lobbyX + clientX, padding + lobbyY + clientY, lobbyClientSize, lobbyClientSize);
        
        clientX += padding + lobbyClientSize;

        if((i + 1)/ row - playersPerRow == 0)
        {
            clientX = 0;
            clientY += padding + lobbyClientSize;
            row++;
        }
    }
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

// setup();