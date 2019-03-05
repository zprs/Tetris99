var express = require('express');
var socket = require('socket.io');

var app = express();
var server = app.listen(8080, "0.0.0.0");
//var server = app.listen(8080, "0.0.0.0");
app.use(express.static('public'));
var io = require('socket.io').listen(server);

var virtualServers = {};
var numberOfClientsPerServer = 99;

function AddServer(){
    var id = uniqueId();
    virtualServers[id] = {id: id, clients: {}, inLobby: true, votesToStart: 0};
    var newServer = virtualServers[id];
    console.log("Room #" + ObjectSize(virtualServers) + 1 + " created with id: " + id);
    return newServer;
}

function addClientToServer(vServer, socket){
    console.log("New client on server with id: " + vServer.id + " - number of clients on server: " + (ObjectSize(vServer.clients) + 1));
    socket.serverId = vServer.id;
    vServer.clients[socket.id] = {socket: socket, badgePoints: 0, lineMultiplier: 1};

    socket.join(vServer.id);
    updateLobby(vServer);

    if(ObjectSize(vServer.clients) == numberOfClientsPerServer)
        startServerGame(vServer.id);
}

function startServerGame(serverid)
{
    virtualServers[serverid].inLobby = false;
    var clients = Object.keys(virtualServers[serverid].clients);
    virtualServers[serverid].place = clients.length;
    io.to(serverid).emit('startGame', {players: clients});
}

function updateLobby(vServer){
    var clients = Object.values(vServer.clients);
    io.to(vServer.id).emit('updateLobby', clients.length);
}

io.sockets.on('connection', newConnetcion);

function newConnetcion(socket){

    socket.on('joinLobby', function(){

        var servers = Object.values(virtualServers);
        var serversInLobby = [];

        servers.forEach(vServer => {
            if(vServer.inLobby)
                serversInLobby.push(vServer);
        });

        if(serversInLobby.length == 0)
        {
            console.log("No virtual servers. New server is being created...")
            var newServer = AddServer();
            addClientToServer(newServer, socket);
        }
        else{
            for (var vServer of serversInLobby) {
                var isInServer = false;
                if(NumClientsOnServer(vServer) < numberOfClientsPerServer)
                {
                    addClientToServer(vServer, socket);
                    isInServer = true;
                }
    
                if(!isInServer)
                {
                    console.log("No room in previous servers. New server is being created...");
                    var newServer = AddServer();
                    addClientToServer(newServer, socket);
                }
            }
        }
    });

    socket.on('KO', function(data)
    {
        if(!virtualServers[socket.serverId])
        {
            console.log('\x1b[31m%s\x1b[0m', "[ERROR]","Server with id: " + socket.serverId + " Not Found");
            return;
        }
            
        if(virtualServers[socket.serverId].clients[data.attackerId])
        {
            virtualServers[socket.serverId].clients[data.attackerId].badgePoints += virtualServers[socket.serverId].clients[socket.id].badgePoints + 1;
            var badgePoints = virtualServers[socket.serverId].clients[data.attackerId].badgePoints;

            socket.broadcast.to(socket.serverId).emit("badges", {playerId: data.attackerId, badges: badgePoints});

            if(badgePoints >= 30)
                virtualServers[socket.serverId].clients[data.attackerId].lineMultiplier = 2;
            else if(badgePoints >= 14)
                virtualServers[socket.serverId].clients[data.attackerId].lineMultiplier = 1.75;
            else if(badgePoints >= 6)
                virtualServers[socket.serverId].clients[data.attackerId].lineMultiplier = 1.5;
            else if(badgePoints >= 2)
                virtualServers[socket.serverId].clients[data.attackerId].lineMultiplier = 1.25;
        }
        else if(data.attackerId != null)
            console.log('\x1b[31m%s\x1b[0m', "[ERROR]","Attacker Not Found. ID: " + data.attackerId);

        var place = virtualServers[socket.serverId].place;
        io.to(data.attackerId).emit('addKO');
        socket.broadcast.to(socket.serverId).emit('KO', {id: socket.id, place: place});
        virtualServers[socket.serverId].place--;
    });

    socket.on('attacking', function(data)
    {
        data.forEach(player => {
            io.to(player.id).emit('attacking', {id: socket.id, add: player.add});
        });
    });

    socket.on('gridUpdates', function(data)
    {
        socket.broadcast.to(socket.serverId).emit('gridUpdates', data);
    });

    socket.on('voteStart', function()
    {
        if(!socket.voted)
        {
            virtualServers[socket.serverId].votesToStart++;
            io.to(socket.serverId).emit('voteStart', virtualServers[socket.serverId].votesToStart);
            socket.voted = true;

            var numberOfPlayers = Object.values(virtualServers[socket.serverId].clients).length;

            if(numberOfPlayers > 1 && virtualServers[socket.serverId].votesToStart >= numberOfPlayers)
                startServerGame(socket.serverId);
        }
    });

    socket.on('lines', function(data)
    {

        if(!virtualServers[socket.serverId])
        {
            console.log('\x1b[31m%s\x1b[0m', "[ERROR]","Server with id: " + socket.serverId + " Not Found");
            return;
        }
        
        var lines = Math.round(virtualServers[socket.serverId].clients[socket.id].lineMultiplier * data.lines);

        data.players.forEach(player => {
            io.to(player.id).emit('lines', {id: socket.id, column: data.column, lines: lines, id: socket.id});
        });

    });

    socket.on('disconnect', function (data) {
    
        if(virtualServers[socket.serverId])
        {
            delete virtualServers[socket.serverId].clients[socket.id];

            if(virtualServers[socket.serverId].inLobby)
            {
                updateLobby(virtualServers[socket.serverId]);

                if(socket.voted)
                {
                    virtualServers[socket.serverId].votesToStart--;
                    socket.broadcast.to(socket.serverId).emit('voteStart', virtualServers[socket.serverId].votesToStart);
                }
            }
            else{

                //Just act like it was a KO
                var place = virtualServers[socket.serverId].place;
                socket.broadcast.to(socket.serverId).emit('KO', {id: socket.id, place: place});
                virtualServers[socket.serverId].place--;

                if(Object.values(virtualServers[socket.serverId].length == 0))
                {
                    delete virtualServers[socket.serverId];
                }
                    
            }
        }    
    });
}

function ObjectSize(obj) {
    return Object.keys(obj).length;
};

function NumClientsOnServer(vServer){
    return ObjectSize(vServer.clients);
}

var uniqueId = function() {
    return 'id-' + Math.random().toString(36).substr(2, 16);
};

process.on('uncaughtException', function(error) {

    console.log("-------------------------- UNHANDELED REJECTION --------------------------------");
    console.log(error);
    console.log("--------------------------------------------------------------------------------");
    //process.exit(1);
});


console.log("server started");
