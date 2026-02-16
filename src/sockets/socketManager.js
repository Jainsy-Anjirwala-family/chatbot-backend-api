const { Server } = require('socket.io');
const env = require('../config/env');
const { verifySocketToken } = require('../middlewares/socketAuthMiddleware');
const registerChatHandlers = require('./chatHandler');

let io;

module.exports = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: { origin: env.clientUrl, methods: ["GET", "POST"] }
        });

        // Apply Authentication Middleware
        io.use(verifySocketToken);

        io.on('connection', (socket) => {
            console.log(`[Socket] User ${socket.user.username} connected`);

            registerChatHandlers(io, socket);

            socket.on('disconnect', () => {
                console.log(`[Socket] User ${socket.user.username} disconnected`);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) throw new Error("Socket.io not initialized!");
        return io;
    }
};