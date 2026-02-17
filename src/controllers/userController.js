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
        res.status(201).json({ success: true, token, user: newUser, message: 'User created successfully' });
    } catch (error) {
        console.log('Error creating user:', error);
        if (error.code === '23505') { // Postgres unique violation error code
            return res.status(400).json({ error: 'username or email already exists' });
        }
        next(error); 
    }
};
exports.existingUserAndNotify = async (req, res, next) => {
    try {
        // 1. Grab email and password (we don't need username to log in)
        const { email, password } = req.body;

        // 2. Fetch the EXISTING user from Neon DB
        const queryText = 'SELECT id, username, email, password FROM users WHERE email = $1';
        const result = await pool.query(queryText, [email]);
        const existingUser = result.rows[0];

        // 3. Check if user actually exists and password matches
        if (!existingUser) {
            return res.status(401).json({ error: 'User not found with this email' });
        }
        if (existingUser.password !== password) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        // 4. Generate a JWT Token
        const token = jwt.sign(
            { id: existingUser.id, username: existingUser.username }, 
            env.jwtSecret, 
            { expiresIn: '1h' }
        );

        // 5. Emit global socket event that they are online (Optional but cool!)
        const io = socketManager.getIO();
        io.emit('system_notification', {
            type: 'USER_ONLINE', // Changed from NEW_USER
            message: `${existingUser.username} is now online!`
        });

        // Remove the password from the object before sending it to the frontend
        delete existingUser.password;

        // 6. Send Response (Status 200 OK, instead of 201 Created)
        res.status(200).json({ success: true, token, user: existingUser, message: 'User logged in successfully' });
    } catch (error) {
        console.log('Error logging in user:', error);
        next(error); 
    }
};