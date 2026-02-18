const { pool } = require('../config/db');
const socketManager = require('../sockets/socketManager');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

exports.createUserAndNotify = async (req, res, next) => {
    try {
        const { username, email, password,login_user_date} = req.body;

        // 1. Insert into Neon DB
        const queryText = 'INSERT INTO users(username, email, password, previous_login_details) VALUES($1, $2, $3, $4) RETURNING id, username, email, created_at';
        const result = await pool.query(queryText, [username, email, password, login_user_date]);
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
        if (error.code === '23505') { // Postgres unique violation error code
            return res.status(400).json({ error: 'username or email already exists' });
        }
        next(error); 
    }
};
exports.existingUserAndNotify = async (req, res, next) => {
    try {
        // 1. Grab email and password (we don't need username to log in)
        const { email, password, login_user_date } = req.body;

        // 2. Fetch the EXISTING user from Neon DB
        const queryText = 'SELECT id, username, email, password, previous_login_details FROM users WHERE email = $1 AND password = $2';
        const result = await pool.query(queryText, [email, password]);
        const existingUser = result.rows[0];

        // 3. Check if user actually exists and password matches
        if (!existingUser) {
            return res.status(401).json({ error: 'User not found with this email' });
        }
        if (existingUser.password !== password) {
            return res.status(401).json({ error: 'Incorrect password' });
        }
        const updatedHistory = existingUser.previous_login_details || [];
        const newArrList = updatedHistory.length > 0 ? JSON.parse(updatedHistory) : [];
            newArrList.push({
                timestamp: login_user_date || new Date().toISOString()
            });

        // 3. UPDATE: Save the combined list back to Neon DB
        const updateQuery = 'UPDATE users SET previous_login_details = $1 WHERE id = $2 RETURNING *';
        const updateResult = await pool.query(updateQuery, [JSON.stringify(newArrList), existingUser.id]);
        const userWithHistory = updateResult.rows[0];

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
        next(error); 
    }
};
exports.logoutUser = async (req, res, next) => {
    try {
        // Now we get data from the body sent by the frontend
        const { email, username, logout_date } = req.body;

        // Check if the frontend actually sent the data
        if (!email || !username) {
            return res.status(400).json({ 
                success: false, 
                error: "Username and email are required to logout" 
            });
        }

        
        // 2. Fetch the EXISTING user from Neon DB
        const queryText = 'SELECT id, username, email, password, previous_logout_details FROM users WHERE email = $1';
        const result = await pool.query(queryText, [email]);
        const existingUser = result.rows[0];
        
        const updatedHistory = existingUser.previous_logout_details || [];
        const newArrList = updatedHistory.length > 0 ? JSON.parse(updatedHistory) : [];
            newArrList.push({
                timestamp: logout_date || new Date().toISOString()
            });

        // 3. UPDATE: Save the combined list back to Neon DB
        const updateQuery = 'UPDATE users SET previous_logout_details = $1 WHERE id = $2 RETURNING *';
        const updateResult = await pool.query(updateQuery, [JSON.stringify(newArrList), existingUser.id]);
        const userWithHistory = updateResult.rows[0];

        // Emit global socket event 
        const io = socketManager.getIO();
        io.emit('system_notification', {
            type: 'USER_LOGOUT',
            message: `${username} has logged out.`,
            email: email
        });

        res.status(200).json({ 
            success: true, 
            message: 'Logged out successfully' 
        });

    } catch (error) {
        next(error);
    }
};