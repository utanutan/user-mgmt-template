require('dotenv').config();

const express = require('express');
const path = require('path');
const sessionMiddleware = require('./config/session');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const pageRoutes = require('./routes/pages');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(sessionMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/', pageRoutes);

module.exports = app;
