var express = require('express');
var socket = require('socket.io');

var app = express();
var server = app.listen(8080, "0.0.0.0");
//var server = app.listen(8080, "0.0.0.0");
app.use(express.static('public'));
var io = require('socket.io').listen(server);

var virtualServers = {};
var numberOfClientsPerServer = 4;

function AddServer(){
    var id = uniqueId();
    virtualServers[id] = {id: id, clients: {}, inLobby: true};
    var newServer = virtualServers[id];
    console.log("Room #" + ObjectSize(virtualServers) + 1 + " created with id: " + id);
    return newServer;
}

function addClientToServer(vServer, socket){
    console.log("New client on server with id: " + vServer.id + " - number of clients on server: " + (ObjectSize(vServer.clients) + 1));
    socket.serverId = vServer.id;
    vServer.clients[socket.id] = {socket: socket};

    socket.join(vServer.id);
    updateLobby(vServer);

    if(ObjectSize(vServer.clients) == numberOfClientsPerServer)
    {
        vServer.inLobby = false;
    
        var clients = Object.keys(virtualServers[vServer.id].clients);
        virtualServers[vServer.id].place = clients.length + 2;
        io.to(vServer.id).emit('startGame', {players: clients});
    }
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

    socket.on('KO', function()
    {
        if(!virtualServers[socket.serverId])
            return;

        var place = virtualServers[socket.serverId].place;
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

    socket.on('lines', function(data)
    {
        data.players.forEach(player => {
            io.to(player.id).emit('lines', {id: socket.id, column: data.column, lines: data.lines});
        });

    });

    socket.on('disconnect', function (data) {
    
        if(virtualServers[socket.serverId])
        {
            delete virtualServers[socket.serverId].clients[socket.id];

            if(virtualServers[socket.serverId].inLobby)
            {
                updateLobby(virtualServers[socket.serverId]);
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

console.log("server started");