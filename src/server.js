const http = require('http');
const app = require('./app');
const socketManager = require('./sockets/socketManager');
const { connectDB } = require('./config/db');
const env = require('./config/env');

const server = http.createServer(app);
socketManager.init(server);

connectDB().then(() => {
    server.listen(env.port, () => {
        console.log(`🚀 Server running on http://localhost:${env.port}`);
        console.log(`🔌 WebSockets enabled`);
    });
});