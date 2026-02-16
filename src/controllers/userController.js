const { pool } = require('../config/db');
const socketManager = require('../sockets/socketManager');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

exports.createUserAndNotify = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        // 1. Insert into Neon DB
        const queryText = 'INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username, email, created_at';
        const result = await pool.query(queryText, [username, email, password]);
        const newUser = result.rows[0];

        // 2. Generate a JWT Token so the user can connect to WebSockets
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username }, 
            env.jwtSecret, 
            { expiresIn: '1h' }
        );

        // 3. Emit global socket event
        const io = socketManager.getIO();
        io.emit('system_notification', {
            type: 'NEW_USER',
            message: `${newUser.username} just joined!`
        });

        // 4. Send Response
        res.status(201).json({ success: true, token, user: newUser });
    } catch (error) {
        console.log('Error creating user:', error);
        if (error.code === '23505') { // Postgres unique violation error code
            return res.status(400).json({ error: 'username or email already exists' });
        }
        next(error); 
    }
};