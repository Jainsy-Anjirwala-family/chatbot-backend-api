const jwt = require('jsonwebtoken');
const env = require('../config/env');

const verifySocketToken = (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Authentication error: No token provided"));
    }

    try {
        const decoded = jwt.verify(token, env.jwtSecret);
        socket.user = decoded; // Attach user payload to the socket
        next();
    } catch (error) {
        return next(new Error("Authentication error: Invalid token"));
    }
};

module.exports = { verifySocketToken };