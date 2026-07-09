const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    // रूम जॉइन करना
    socket.on('join-room', (roomId, userId, username) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId, username);

        // व्हाइटबोर्ड ड्राइंग डेटा शेयर करना
        socket.on('drawing', (data) => {
            socket.to(roomId).emit('drawing', data);
        });

        // फाइल शेयर करना
        socket.on('file-share', (fileData) => {
            socket.to(roomId).emit('file-receive', fileData);
        });

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

server.listen(3000, () => console.log('Server running on port 3000'));
