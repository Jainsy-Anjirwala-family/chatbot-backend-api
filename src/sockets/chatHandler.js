module.exports = (io, socket) => {
    socket.on('chat:send_message', (data) => {
        // Broadcast the message along with the authenticated user's ID
        socket.broadcast.emit('chat:receive_message', {
            userId: socket.user.id,
            username: socket.user.username,
            text: data.text,
            timestamp: new Date()
        });
    });
};