//Canvas
var canvas = document.getElementById('mainCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var ctx = canvas.getContext('2d');

var grid = {columns: []};
var lastGrid = null;

var blockSize = 30;
var blockPadding = 5;
var blockCurveRadius = 5;

var requestAnimationFrameId;

var dropInterval = 30;
var dropTimer = 0;

var currentPiece;
var nextPieces = [];
var numUpcomingPieces = 5;
var holdPiece;
var alreadySwitchedHold = false;

var mute = false;
var winNoise = new Audio('audio/royaleMusic.mp3');
var pieceLandNoise = new Audio('audio/pieceLand.mp3')

var rColor = "#5c7af2";
var lColor = "#fcb04e";
var sColor = "#74f442";
var sqColor = "#f9fc6a";
var zColor = "#ff6666";
var tColor = "#d07fff";
var iColor = "#8cffe8";

var playBackgroundAlpha = .5;
var playBackgroundColor = "#606566";
var badgeIconColor = "#ffde4c";
var incompleteBadgeIconColor = "#e0ba11";
var defendingLineColor = "white";//"#fff959";

var garbageBarLines = [];
var garbageBlockColor1 = "#ffd866";
var garbageBlockColor2 = "#ff59a9";
var garbageBlockColor = "#939393";

var attackModeHighlightColor = "white";

garbageBarLineTime = 1000;

var attacking = [];
var defending = [];

var attackMode = 0;
var lastAttackMode = 0;

var numKOTargets = 1;
var numRadnTargets = 1;
var numBadgesTargets = 1;

var horizontalTime = 8;
var horizontalTimer = 0;

var verticalTime = 5;
var verticalTimer = 0;

var left = false;
var right = false;
var down = false;

var playHeight = (blockSize + blockPadding) * numberOfRows + blockPadding;
var playWidth = (blockSize + blockPadding) * numberOfColumns + blockPadding;

var playStartX = canvas.width / 2 - playWidth / 2;
var playStartY = canvas.height / 2 - playHeight / 2;

var holdWidth = (blockSize + blockPadding) * 4 + blockPadding * 5;
var holdHeight = (blockSize + blockPadding) * 4 - blockPadding;

$(document).on('keydown', function(e){

    if(gameStarted && !gameOver)
    {
        if(e.keyCode == 87) // W -- KOS
            setAttackMode(0);
        if(e.keyCode == 65) // A -- Random
            setAttackMode(1);
        if(e.keyCode == 68) // D -- Badges
            setAttackMode(2);
        if(e.keyCode == 83) // S -- Attacking
            setAttackMode(3);

        if(e.keyCode == 37){ // Left
            currentPiece.move(-1, 0);
            horizontalTimer = 0;
            left = true;
        }
        if(e.keyCode == 39){ // Right
            currentPiece.move(1, 0);
            horizontalTimer = 0;
            right = true;
        }
        if(e.keyCode == 40){ // Down
            currentPiece.move(0, 1);
            verticalTimer = 0;
            down = true;
        }
        if(e.keyCode == 38){ // UP
            currentPiece.rotate(2);
        }
        if(e.keyCode == 16 && !alreadySwitchedHold) //L-Shift
        {
    
            currentPiece.blocks.forEach(block => {
                grid.columns[block.column][block.row] = null;
            });
    
            if(holdPiece)
            {
                var newHoldPiece = getPiece(currentPiece.type, false);
                currentPiece = getPiece(holdPiece.type, true);
                holdPiece = newHoldPiece;
    
                currentPiece.blocks.forEach(block => {
                    grid.columns[block.column][block.row] = block;
                });
                
                alreadySwitchedHold = true;
            }
            else{
                holdPiece = getPiece(currentPiece.type, false);
                nextPiece(true);
                alreadySwitchedHold = true;
            }
            
        }
        if(e.keyCode == 32){ // Space
            currentPiece.drop();
        }

    }
});

$(document).on('keyup', function(e){
    if(gameStarted)
    {
        if(e.keyCode == 37){ // Left
            left = false;
        }
        if(e.keyCode == 39){ // Right
            right = false;
        }
        if(e.keyCode == 40){ // Down
            down = false;
        }
    }

});

function startGame(){
    gameStarted = true;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //canvas.style.background = "#a3e0ff";

    for (let i = 0; i < numberOfColumns; i++) {
        
        var column = [];

        for (let x = 0; x < numberOfRows; x++) {
            column.push(null);
        }

        grid.columns.push(column);
    }

    lastGrid = copyGrid(grid);

    for (let i = 0; i < numUpcomingPieces; i++) {
        newNextPiece();
    }

    if(requestAnimationFrameId){
        location.reload();
    }

    setAttackMode(0);

    nextPiece(true);
    animate();
}

function animate(){

    requestAnimationFrameId = requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if(!gameOver)
    {
        if(down)
        {
            if(verticalTimer < verticalTime)
            verticalTimer++;
            else{
                verticalTimer = 0;
                currentPiece.move(0, 1);
            }
        }

        if(left)
        {
            if(horizontalTimer < horizontalTime)
                horizontalTimer++;
            else{
                horizontalTimer = 0;
                currentPiece.move(-1, 0);
            }
        }
        else if(right)
        {
            if(horizontalTimer < horizontalTime)
                horizontalTimer++;
            else{
                horizontalTimer = 0;
                currentPiece.move(1, 0);
            }
        }

        if(dropTimer < dropInterval)
            dropTimer++;
        else
        {
            if(currentPiece != null && currentPiece.move(0, 1)){ //block has reached the bottom or hit something;
                nextPiece();
            }
            dropTimer  = 0;
        }

    }

    drawGrid();
    drawGarbageBar();
    drawNextPieces();
    drawHold();

    if(gameOver)
    {
        ctx.globalAlpha = playBackgroundAlpha;
        ctx.fillStyle = playBackgroundColor;
        ctx.fillRect(playStartX, playStartY, playWidth, playHeight);
        ctx.globalAlpha = 1;

        ctx.textAlign = "center";
        ctx.fillStyle = "#f24147";

        var endText = "GAME OVER";

        if(!won)
        {
            ctx.font = "bold " + playWidth / 7.5+ "px Rubik";
            ctx.fillText(endText, playStartX + playWidth / 2, playStartY + playHeight / 2, playWidth);
            ctx.font = "bold " + playWidth / 10 + "px Rubik";

            ctx.fillStyle = "white";
            ctx.fillText("PLACE: " + place, playStartX + playWidth / 2, playStartY + playHeight / 2 + playWidth / 6, playWidth);
        }

        
    }

    var playerBoardValues = Object.values(playerBoards);

    playerBoardValues.forEach(board => {
        drawOtherPlayerBoard(board);
    });

    if(!gameOver)
    {
        updateGarbageBar();
        drawPhantomPiece();

        updateAttackMode();
        drawAttackMode();
        drawDefendingUI();
        drawAttackingUI();
    } 

    drawInfoPannel();
}

var boardsPadding = 5;
var boardsHeight = (playHeight - boardsPadding * (playersPerRow - 1)) / playersPerRow;
var boardsWidth = boardsHeight / 2;
var boardsBlockPadding = 1;
var boardsBlockSize = (boardsHeight - (boardsBlockPadding * 20)) / 20;

function getOtherPlayerBoardPos(board){

    var x;
    var y;

    if(board.side == 0)
    {
        x = playStartX - (boardsWidth + boardsPadding) * playersPerColumn - blockPadding * 10 - holdWidth + (board.column * (boardsWidth + boardsPadding));
        y = playStartY + board.row * (boardsHeight + boardsPadding);
    }
    else{
        x = playStartX + playWidth + blockPadding * 12 + holdWidth + (board.column * (boardsWidth + boardsPadding));
        y = playStartY + board.row * (boardsHeight + boardsPadding);
    }

    return pos = {x: x, y: y};

}

var boardBadgeSize = 8;

function drawOtherPlayerBoard(board)
{
    var pos = getOtherPlayerBoardPos(board);

    if(!board.alive)
    {
        ctx.globalAlpha = 1;
        ctx.font = "bold " + boardsWidth / 2 + "px Rubik";
        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.fillText("K.O.", pos.x + boardsWidth / 2, pos.y + boardsHeight / 2, boardsWidth);
        ctx.font = boardsWidth / 3 + "px Rubik";
        ctx.fillText(board.place, pos.x + boardsWidth / 2, pos.y + boardsHeight / 1.5, boardsWidth);

        return;
    }

    ctx.globalAlpha = .5;

    ctx.fillStyle = "#606566";
    ctx.fillRect(pos.x, pos.y, boardsWidth, boardsHeight);

    for (let i = 0; i < board.grid.columns.length; i++) {
        
        const column = board.grid.columns[i];

        for (let h = 0; h < column.length; h++) {

            if(column[h] != null)
                column[h].draw(pos.x + boardsBlockPadding, pos.y + boardsBlockPadding);
        }
    }

    if(board.badges && board.badges > 0)
    {
        var fullBadges = 0;

        if(board.badges >= 30)
            fullBadges = 4;
        else if(board.badges >= 14)
            fullBadges = 3;
        else if(board.badges >= 6)
            fullBadges = 2;
        else if(board.badges >= 2)
            fullBadges = 1;

        for (let i = 0; i < fullBadges; i++) {
            
            ctx.fillStyle = badgeIconColor;
            ctx.fillRect(pos.x + (boardBadgeSize * 1.5) * i, pos.y, boardBadgeSize, boardBadgeSize);
            ctx.fill();
        }
    }

    ctx.globalAlpha = 1;
}

function updateGrid(board, update)
{
    if(update.color == null)
        board.grid.columns[update.column][update.row] = null;
    else
        board.grid.columns[update.column][update.row] = new PlayerBoardBlock(update.column, update.row, update.color);
}

function PlayerBoardBlock(column, row, color) {
    this.column = column;
    this.row = row;
    this.color = color;
    
    this.size = boardsBlockSize;
    this.padding = boardsBlockPadding;

    this.draw = function(x, y){
        ctx.fillStyle = this.color;

        var pos = this.getPosition(x, y);

        ctx.fillRect(pos.x, pos.y, this.size, this.size);
    }

    this.getPosition = function(startX, startY)
    {
        var x = this.column * (this.size + this.padding) + startX;
        var y = this.row * (this.size + this.padding) + startY;

        return {x: x, y: y}
    }
}

function eliminateFullRows()
{
    var rowsDeleted = [];

    for (let x = 0; x <  numberOfRows; x++) {
    
        var numFilled = 0;

        for (let i = 0; i < numberOfColumns; i++) {
            if(grid.columns[i][x] != null)
                numFilled++;
        }

        if(numFilled == numberOfColumns)
        {
            for (let i = 0; i < numberOfColumns; i++) {
                grid.columns[i][x] = null;
            }

            rowsDeleted.push(x);
        }
    }

    if(rowsDeleted.length > 0)
    {
        for (let r = 0; r < rowsDeleted.length; r++) { //bottom to top
            const row = rowsDeleted[r];

            if(garbageBarLines.length > 0)
            {
                garbageBarLines.shift();
                garbageBarLines.forEach(line => {
                    line.block.row++;
                });
            }

            for (let x = numberOfRows; x >= 0; x--) {
                
                if(x < row)
                {
                    for (let i = 0; i < numberOfColumns; i++) {

                        grid.columns[i][x + 1] = grid.columns[i][x];

                        if(grid.columns[i][x] != null)
                            grid.columns[i][x].row++;
                    }   
                }
            }              
        }

        var numberOfGarbageLines = 0;

        if(rowsDeleted.length == 2)
            numberOfGarbageLines = 1;
        else if(rowsDeleted.length == 3)
            numberOfGarbageLines = 2;
        else if(rowsDeleted.length == 4)
            numberOfGarbageLines = 4;

        var data = {
            players: attacking,
            column: Math.floor(Math.random() * 10),
            lines: numberOfGarbageLines
        }

        if(numberOfGarbageLines > 0)
            socket.emit('lines', data);

    }
}

function addGarbageLine(column, attackerId){
    var endGame = false;

    if(currentPiece && !currentPiece.canMove(0, 1))
        nextPiece();

    for (let x = 0; x < numberOfRows; x++){
        for (let i = 0; i < numberOfColumns; i++) {

            var isPartOfCurrentPiece = false;

            if(currentPiece) // If the block is a the current piece, ignore it
            {
                currentPiece.blocks.forEach(block => {
                    if(block.column == i && block.row == x)
                        isPartOfCurrentPiece = true;
                });
            }

            if(!isPartOfCurrentPiece)
            {                   
                if(x-1 < 0)
                {
                    if(grid.columns[i][x] != null)
                        endGame = true
                }
                else
                {
                    if(grid.columns[i][x] != null)
                        grid.columns[i][x].row -= 1;

                    grid.columns[i][x-1] = grid.columns[i][x];
                }
            }   
        }   
    }      
    
    for (let i = 0; i < numberOfColumns; i++) {
        if(i != column)
            grid.columns[i][19] = new Block(i, 19, garbageBlockColor);
        else
            grid.columns[i][19] = null;
    }
    
    if(endGame)
        stopGame(false, attackerId);
}

function stopGame(win, attackerId){

    if(gameOver == true)
        return;

    won = win;

    if(win && !mute)
        winNoise.play();

    attacking.forEach(attack => {
        attack["add"] = false;
    });

    
    socket.emit("attacking", attacking);

    if(!win)
    {
        socket.emit('KO', {attackerId: attackerId});
        badgePoints = 0;
    }

    gameOver = true;
}

function updateGarbageBar(){
    for (let i = garbageBarLines.length - 1; i >= 0; i--)  {

        var garbageBarLine = garbageBarLines[i];

        if(garbageBarLine.time < garbageBarLineTime)
            garbageBarLine.time++;
        else{
            addGarbageLine(garbageBarLine.column, garbageBarLine.attackerId);
            garbageBarLines.splice(i, 1);
            garbageBarLines.forEach(line => {
                line.block.row++;
            });
        }
    }
}

function drawGarbageBar(){
    var x = playStartX - blockSize - blockPadding * 3;
    var y = playStartY + blockSize * 4 + blockPadding * 4;

    ctx.fillStyle = playBackgroundColor;
    ctx.globalAlpha = playBackgroundAlpha;
    ctx.fillRect(x, y, blockSize + blockPadding * 2, blockSize * 16 + blockPadding * 17);
    ctx.globalAlpha = 1;

    for (let i = 0; i < garbageBarLines.length; i++) {
        var block = garbageBarLines[i].block;

        if(garbageBarLines[i].time > 800)
            block.color = garbageBlockColor2;
        else if(garbageBarLines[i].time > 500)
            block.color = garbageBlockColor1;

        block.draw(x + blockPadding, y + blockPadding);
    }
}

function drawNextPieces(){
    var x = playStartX + playWidth + blockPadding;
    var y = playStartY;

    var width = (blockSize + blockPadding) * 4 + blockPadding * 5;
    var height = (blockSize + blockPadding) * numUpcomingPieces * 3 + blockPadding;

    ctx.fillStyle = playBackgroundColor;
    ctx.globalAlpha = playBackgroundAlpha;
    ctx.fillRect(x, y, width, height);
    ctx.globalAlpha = 1;

    y += blockSize;
    
    nextPieces.forEach(nextPiece => {

        var iX = 0;
        var iY = 0;

        if(nextPiece.type == 0)
        {
            iX -= blockSize / 2;
            iY -= blockSize / 2;
        }

        nextPiece.draw(x - (blockSize + blockPadding) * 4.5 + width / 2 + iX, y + iY + blockPadding);
        y += (blockSize + blockPadding) * 2 + blockSize;
    });
}

function drawHold(){
    var x = playStartX - blockPadding - holdWidth;
    var y = playStartY;

    ctx.fillStyle = playBackgroundColor;
    ctx.globalAlpha = playBackgroundAlpha;
    ctx.fillRect(x, y, holdWidth, holdHeight);
    ctx.globalAlpha = 1;

    if(holdPiece != null)
    {
        if(holdPiece.type == 0)
        {
            x -= blockSize / 2;
            y -= blockSize / 2;
        }

        holdPiece.draw(x - (blockSize + blockPadding) * 4.5 + holdWidth / 2, y + holdHeight / 2 - (blockSize + blockPadding) * 1.5 + blockSize * 2 / 3);
    }
}

function drawGrid(){
    ctx.fillStyle = playBackgroundColor;
    ctx.globalAlpha = playBackgroundAlpha;
    ctx.fillRect(playStartX, playStartY, playWidth, playHeight);
    ctx.globalAlpha = 1;

    for (let i = 0; i < grid.columns.length; i++) {
        
        const column = grid.columns[i];

        for (let x = 0; x < column.length; x++) {

            if(column[x] != null)
                column[x].draw(playStartX + blockPadding, playStartY + blockPadding);
        }
    }
}

var badgeSize = 30;

function drawInfoPannel(){

    var y = (blockSize + blockPadding) * numUpcomingPieces * 3 + blockPadding * 2 + playStartY;
    var x = playStartX + playWidth + blockPadding;

    var height = (playHeight - (y - playStartY));
    var width = (blockSize + blockPadding) * 4 + blockPadding * 5;

    ctx.globalAlpha = playBackgroundAlpha;
    ctx.fillStyle = playBackgroundColor;
    ctx.fillRect(x, y, width, height);
    ctx.globalAlpha = 1;
    
    ctx.font = playWidth / 12 + "px Rubik";
    ctx.textAlign = "left";
    ctx.fillStyle = "white";
    ctx.fillText(place + "/99", x + blockPadding, y + blockPadding + blockSize);
    ctx.fillText("K.O.   " + numberOfKOs, x + blockPadding, y + blockPadding * 2 + blockSize * 2);

    var badgePosX = x + boardsPadding * 5;
    var badgePosY = y + boardsPadding * 15;

    var fullBadges = 0;
    var totalToNextBadge = 0;

    var badgesLeft = badgePoints;

    if(badgePoints >= 30)
        fullBadges = 4;
    else if(badgePoints >= 14)
    {
        fullBadges = 3;
        totalToNextBadge = 30;
        badgesLeft -= 14; 
    }
    else if(badgePoints >= 6)
    {
        fullBadges = 2;
        totalToNextBadge = 14;
        badgesLeft -= 6;
    }
    else if(badgePoints >= 2)
    {
        fullBadges = 1;
        totalToNextBadge = 6;
        badgesLeft -= 2;
    }
    else 
    {
        fullBadges = 0;
        totalToNextBadge = 2;
    }
        
    var numberOfBadgesToDraw = fullBadges;
    var percentExtra = badgesLeft / totalToNextBadge

    if(percentExtra > 0)
        numberOfBadgesToDraw++;
        
    for (let i = 0; i < numberOfBadgesToDraw; i++) {

        var height = badgeSize;

        ctx.fillStyle = badgeIconColor;

        if(i + 1 > fullBadges)
        {
            height *= percentExtra;
            badgePosY = badgePosY + badgeSize - height;
            ctx.fillStyle = incompleteBadgeIconColor;
        }
        
        ctx.fillRect(badgePosX, badgePosY, badgeSize, height);
        ctx.fill();

        if(i == 0 || i == 2)
            badgePosX += badgeSize * 1.5;
        else if(i == 1)
        {
            badgePosX -= badgeSize * 1.5;
            badgePosY += badgeSize * 1.5;
        }
    }
}

function drawAttackMode(){
    var width = playWidth / 3;
    var height = width / 4;
    var padding = 25;
    
    var curveRadius = 10;

    var x = playStartX + playWidth / 2;
    var y = playStartY + (height + padding);

    ctx.globalAlpha = .5;
    ctx.textAlign = 'center';

    var textY = playWidth / -90;

    var backgroundColor = "#b2b2b2";
    var highlightColor = attackModeHighlightColor;

    var koColor = backgroundColor;
    var randColor = backgroundColor;
    var badgeColor = backgroundColor;
    var attackColor = backgroundColor;

    switch(attackMode)
    {
        case 0: // KO's
            koColor = highlightColor;
        break;
        case 1: // Random
            randColor = highlightColor;
        break;
        case 2: // Badges
            badgeColor = highlightColor;
        break;
        case 3: // Attackers
            attackColor = highlightColor;
        break;
    }

    ctx.font = playWidth / 18 + "px Rubik";

    // KO's
        ctx.globalAlpha = .5;
        roundRect(ctx, x - width / 2, y - height / 2 - padding, width, height, curveRadius, koColor);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        ctx.fillText("K.O's", x, y - height / 2 + textY, width);
    // Random
        ctx.globalAlpha = .5;
        roundRect(ctx, x - width - padding, y, width, height, curveRadius, randColor);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        ctx.fillText("Random", x - width / 2 - padding, y + padding + textY, width);
    // Badges
        ctx.globalAlpha = .5;
        roundRect(ctx, x + padding, y, width, height, curveRadius, badgeColor);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        ctx.fillText("Badges", x + padding + width / 2, y + padding + textY, width);
    // Attackers
        ctx.globalAlpha = .5;
        roundRect(ctx, x - width / 2, y + padding + height / 2, width, height, curveRadius, attackColor);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "white";
        ctx.fillText("Attackers", x, y + padding * 2 + height / 2 + textY, width);

    ctx.globalAlpha = 1;
}

function setAttackMode(mode){
    attackMode = mode;
}

function updateAttackMode()
{
    var lastAttacking = attacking;
    var boards = Object.values(playerBoards);

    for (let i = boards.length - 1; i >= 0; i--) {
        const player = boards[i];

        if(!player.alive)
            boards.splice(i, 1);
    }

    switch(attackMode)
    {
        case 0: // KO's

            lastAttackMode = attackMode;

            var closestToDeath = [];

            boards.forEach(board => {
                var count = 0;

                for (let i = 0; i < board.grid.columns.length; i++) {
                    for (let x = 0; x < board.grid.columns[i].length; x++) {
                        if(board.grid.columns[i][x] != null)
                        {
                            var row = numberOfRows - x;
                            count += (row * row);
                        }
                    }
                }

                if(board.alive)
                    closestToDeath.push({id: board.id, count: count})
            });

            closestToDeath.sort(function (player1, player2) {
                if (player1.count > player2.count) return -1;
                if (player1.count < player2.count) return 1;
            });

            attacking = closestToDeath.slice(0, numKOTargets);

        break;
        case 1: // Random

            if(attackMode == lastAttackMode)
                return;
            else
                lastAttackMode = attackMode;

            var players = [];

            boards.forEach(board => {
                if(board.alive)
                    players.push({id: board.id, count: Math.random()});
            });

            players.sort(function (player1, player2) {
                if (player1.count > player2.count) return -1;
                if (player1.count < player2.count) return 1;
            });

            attacking = players.slice(0, numRadnTargets);
        break;
        case 2: // Badges
            lastAttackMode = attackMode;

            var players = Object.values(playerBoards);

            for (let i = players.length - 1; i >= 0; i--) {
                const player = players[i];

                if(!player.alive)
                    players.splice(i, 1);
            }

            players.sort(function (player1, player2) {
                if (player1.badges > player2.badges) return -1;
                if (player1.badges < player2.badges) return 1;
            });

            attacking = players.slice(0, numBadgesTargets);
        break;
        case 3: // Attackers

            lastAttackMode = attackMode;

            attacking = [];

            defending.forEach(defend => {
                attacking.push({id: defend});
            });
            
        break;
    }

    var sentAttacking = [].concat(attacking);


    for (let i = sentAttacking.length - 1; i >= 0; i--) { //Remove ids that we are still attacking
        
        for (let x = lastAttacking.length - 1; x >= 0; x--) {
            const oldAttack = lastAttacking[x];

            if(sentAttacking[i].id == oldAttack.id)
            {
                sentAttacking.splice(i, 1);   
                lastAttacking.splice(x, 1);
                break;
            }
        }
    }

    sentAttacking.forEach(attack => {
        attack["add"] = true;
    });

    lastAttacking.forEach(attack => {
        attack["add"] = false;
    });

    if(sentAttacking.length > 0 || lastAttacking.length > 0)
        socket.emit("attacking", sentAttacking.concat(lastAttacking));
}

function drawDefendingUI(){
    defending.forEach(defend => {
        ctx.globalAlpha = .2;
        ctx.strokeStyle = defendingLineColor;
        ctx.beginPath();
        ctx.moveTo(playStartX + playWidth / 2, playStartY + playHeight);

        var board = playerBoards[defend];
        var pos = getOtherPlayerBoardPos(board);

        if(!board.alive)
            return;

        ctx.lineTo(pos.x + boardsWidth / 2, pos.y + boardsHeight / 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    });
}

function drawAttackingUI(){
    
    attacking.forEach(attack => {
        var board = playerBoards[attack.id];
        var pos = getOtherPlayerBoardPos(board);

        var padding = boardsWidth / 5;

        roundRect(ctx, pos.x - padding / 2, pos.y - padding / 2, boardsWidth + padding, boardsHeight + padding, padding, null, "white");
    });

    
}

function drawHexThing (board, pos) {
    ctx.globalAlpha = .3;

    ctx.beginPath();
    ctx.strokeStyle = "#63ffdd";
    ctx.lineWidth = 3;
    polygon(ctx, pos.x + boardsWidth / 2, pos.y + boardsHeight / 2, boardsWidth * 3/4, 6, 0, false);
    ctx.stroke();

    ctx.globalAlpha = 1;

    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.strokeStyle = "#8cf3ff";
    ctx.fillStyle = "#38bc9f";
    polygon(ctx, pos.x + boardsWidth / 2, pos.y + boardsHeight / 2, boardsWidth / 2, 6, 0, false);
    ctx.stroke();
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = "#8cf3ff";
    ctx.fillStyle = "#51e2c3";
    polygon(ctx, pos.x + boardsWidth / 2, pos.y + boardsHeight / 2, boardsWidth / 2 - 6, 6, 0, false);
    ctx.stroke();
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = "#8cf3ff";
    ctx.fillStyle = "#51e2c3";
    polygon(ctx, pos.x + boardsWidth / 2, pos.y + boardsHeight / 2, boardsWidth / 2 - 20, 6, 0, false);
    ctx.stroke();
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.globalAlpha = 1;
}

function polygon(ctx, x, y, radius, sides, startAngle, anticlockwise) {
    if (sides < 3) return;
    var a = (Math.PI * 2)/sides;
    a = anticlockwise?-a:a;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(startAngle);
    ctx.moveTo(radius,0);
    for (var i = 1; i < sides; i++) {
        ctx.lineTo(radius*Math.cos(a*i),radius*Math.sin(a*i));
    }
    ctx.closePath();
    ctx.restore();
}

function Block(column, row, color) {
    this.column = column;
    this.row = row;
    this.color = color;

    this.radius = blockCurveRadius;
    this.size = blockSize;
    this.padding = blockPadding;

    this.draw = function(x, y){
        ctx.lineWidth = 3;
        roundRect(ctx, this.column * (this.size + this.padding) + x, this.row * (this.size + this.padding) + y, this.size, this.size, this.radius, this.color);//, shadeColorHex(this.color, 25));
    }

    this.checkForBlocksDown = function(y, ignore){ //true => there is a collision

        if(numberOfRows <= this.row + y)
            return true;

        var block = grid.columns[this.column][this.row + y];

        if(block != null)
        {
            var isRealBlock = true;

            ignore.forEach(ignoreBlock => {
                if(block == ignoreBlock)
                    isRealBlock = false;
            });

            return isRealBlock;
        }
        
        return false;
    }

    this.checkForBlocksSide = function(x, ignore){ //true => there is a collision

        if(numberOfColumns == this.column + x || this.column + x < 0)
            return true;

        var block = grid.columns[this.column + x][this.row];
        
        if(block != null)
        {
            var isRealBlock = true;

            ignore.forEach(ignoreBlock => {
                if(block == ignoreBlock)
                    isRealBlock = false;
            });

            return isRealBlock;
        }
        return false;
    }
}

function getBlocksL(){
    var blocks = [];

    //Rotation 1
    blocks.push(new Block(3, 1, lColor));
    blocks.push(new Block(4, 1, lColor));
    blocks.push(new Block(5, 1, lColor));
    blocks.push(new Block(5, 0, lColor));

    return blocks;
}
function getBlocksR(){
    var blocks = [];

    //Rotation 1
    blocks.push(new Block(3, 1, rColor));
    blocks.push(new Block(4, 1, rColor));
    blocks.push(new Block(5, 1, rColor));
    blocks.push(new Block(3, 0, rColor));

    return blocks;
}
function getBlocksT(){
    var blocks = [];

    //Rotation 1
    blocks.push(new Block(3, 1, tColor));
    blocks.push(new Block(4, 1, tColor));
    blocks.push(new Block(5, 1, tColor));
    blocks.push(new Block(4, 0, tColor));

    return blocks;
}
function getBlocksI(){
    var blocks = [];

    //Rotation 1
    blocks.push(new Block(3, 1, iColor));
    blocks.push(new Block(4, 1, iColor));
    blocks.push(new Block(5, 1, iColor));
    blocks.push(new Block(6, 1, iColor));

    return blocks;
}
function getBlocksZ(){
    var blocks = [];

    //Rotation 1
    blocks.push(new Block(3, 0, zColor));
    blocks.push(new Block(4, 0, zColor));
    blocks.push(new Block(4, 1, zColor));
    blocks.push(new Block(5, 1, zColor));

    return blocks;
}
function getBlocksS(){

    var blocks = [];

    //Rotation 1
    blocks.push(new Block(3, 1, sColor));
    blocks.push(new Block(4, 1, sColor));
    blocks.push(new Block(4, 0, sColor));
    blocks.push(new Block(5, 0, sColor));

    return blocks;
}
function getBlocksSQ(){

    var blocks = [];

    //Rotation 1
    blocks.push(new Block(3, 1, sqColor));
    blocks.push(new Block(4, 1, sqColor));
    blocks.push(new Block(3, 0, sqColor));
    blocks.push(new Block(4, 0, sqColor));

    return blocks;
}

function getPiece(i, spawn){
    if(i == null)
        return false;

    var blocks = [];

    switch(i)
    {
        case 0:
            blocks = getBlocksI();
        break;
        case 1:
            blocks = getBlocksL();
        break;
        case 2:
            blocks = getBlocksR();
        break;
        case 3:
            blocks = getBlocksZ();
        break;
        case 4:
            blocks = getBlocksS();
        break;
        case 5:
            blocks = getBlocksSQ();
        break;
        case 6:
            blocks = getBlocksT();
        break;
    }

    if(spawn)
    {
        blocks.forEach(block => {
            grid.columns[block.column][block.row] = block;
        });
    }

    return new Piece(blocks, blocks[2], i);
}

function newNextPiece(){
    var type = Math.floor(Math.random() * 7);

    if(nextPieces[nextPieces.length - 1] && type == nextPieces[nextPieces.length - 1].type)
        type = Math.floor(Math.random() * 7);

    nextPieces.push(getPiece(type, false));
}

function nextPiece(dontPlayNoise){

    if(!dontPlayNoise && !mute)
    {
        pieceLandNoise.pause();
        pieceLandNoise.currentTime = 0;
        pieceLandNoise.play();
    }
        

    alreadySwitchedHold = false;
    eliminateFullRows();

    var updates = [];

    //Find diferences from last grid
    if(lastGrid != null)
    {
        for (let i = 0; i < grid.columns.length; i++) {

            for (let x = 0; x < grid.columns[i].length; x++) {

                var last = lastGrid.columns[i][x];
                var current = grid.columns[i][x];

                if(last)
                    last = last.color;
                if(current)
                    current = current.color;

                if(last != current)
                    updates.push({column: i, row: x, color: current, id: clientId});
            }
        }
    }

    lastGrid = copyGrid(grid);
        
    if(updates.length > 0)
        socket.emit('gridUpdates', updates);

    nextCurrentPieceCheck = getPiece(nextPieces[0].type, false);

    for (let i = 0; i < nextCurrentPieceCheck.blocks.length; i++) {
        const block = nextCurrentPieceCheck.blocks[i];

        if(grid.columns[block.column][block.row] != null)
        {
            stopGame(false, null);
            return;
        }
    }

    currentPiece = getPiece(nextPieces[0].type, true);
    nextPieces.splice(0, 1);
    newNextPiece();
}

function copyGrid(mainObj) {

    var newUnrelatedObject = {columns: []};

    for (let i = 0; i < mainObj.columns.length; i++) {
        const column = mainObj.columns[i];

        newUnrelatedObject.columns[i] = [];

        for (let x = 0; x < column.length; x++) {
            const block = column[x];

            let blockCopy = null;
            
            if(block != null)
                blockCopy = {color: block.color};

            newUnrelatedObject.columns[i].push(blockCopy);
        }
    }

    return newUnrelatedObject;

  }

function drawPhantomPiece(){

    var phantomPiece = new Piece();
    phantomPiece.blocks = [];

    currentPiece.blocks.forEach(block => {
        var phantomBlock = new Block(block.column, block.row, block.color);
        phantomPiece.blocks.push(phantomBlock);
    });

    var stop = false;

    while(!stop)
    {
        phantomPiece.blocks.forEach(block => {
            if(block.checkForBlocksDown(1, currentPiece.blocks))
                stop = true;
        });

        if(!stop)
        {
            phantomPiece.blocks.forEach(block => {
                block.row++;
            });
        }
    }

    ctx.globalAlpha = 0.5;

    phantomPiece.draw(playStartX + blockPadding, playStartY + blockPadding);
    ctx.globalAlpha = 1;
}

function Piece(blocks, pivot, type)
{
    this.blocks = blocks;
    this.pivot = pivot;
    this.type = type;

    this.drop = function(){

        var stop = false;

        while(!stop)
        {
            if(this.move(0, 1))
            {
                stop = true;
                nextPiece();
            }
        }
    }

    this.draw = function(x, y){
        this.blocks.forEach(block => {
            block.draw(x, y);
        });
    }

    this.canMove = function(x = 0, y = 0){

        var collision = false;

        this.blocks.forEach(block => {
            if(y != 0 && block.checkForBlocksDown(y, this.blocks))
                collision = true;
            else if(x != 0 && block.checkForBlocksSide(x, this.blocks))
                collision = true;
        });

        return !collision;

    }

    this.move = function(x = 0, y = 0){

        if(!this.canMove(x,y))
        {
            return true;
        }
        else{
            this.blocks.forEach(block => {
                grid.columns[block.column][block.row] = null;
            });

            this.blocks.forEach(block => {
                block.column += x;
                block.row += y;
                grid.columns[block.column][block.row] = block;
            });

            return false;
        }
    }

    this.rotate = function(dir)
    {
        var newPositions = [];

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];

            var x1 = block.column;
            var y1 = block.row;

            this.pivot = this.blocks[1];

            var px = this.pivot.column;
            var py = this.pivot.row;
            
            var x = x1 - px
            var y = y1 - py

            x1 = -y
            y1 = x

            var x2 = px + x1;
            var y2 = py + y1;

            if(px - 1 < 0)
                x2++;
            else if(px + 1 >= numberOfColumns)
                x2--;

            if(x2 != null && y2 != null)
            {
                if(block.checkForBlocksDown(y2 - block.row, this.blocks) || block.checkForBlocksSide(x2 - block.column, this.blocks))
                    return;
                    
                newPositions.push({x: x2, y: y2});
            }
            
        }

        this.blocks.forEach(block => {
            grid.columns[block.column][block.row] = null;
        });
        
        for (let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            
            block.row = newPositions[i].y;
            block.column = newPositions[i].x;

            grid.columns[block.column][block.row] = block;
        }
    }

}

function shadeColorHex(color, percent) {
    var num = parseInt(color.slice(1),16), amt = Math.round(2.55 * percent), R = (num >> 16) + amt, G = (num >> 8 & 0x00FF) + amt, B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

function roundRect(ctx, x, y, width, height, radius, fillColor, strokeColor) {

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    
    if(fillColor)
    {
        ctx.fillStyle = fillColor;
        ctx.fill();
    }
        
    if(strokeColor)
    {
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
    }

}