const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const { globalErrorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('src/public')); 

app.use('/api/users', userRoutes);

app.use(globalErrorHandler); // Must be last

module.exports = app;