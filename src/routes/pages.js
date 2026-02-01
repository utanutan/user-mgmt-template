const express = require('express');
const path = require('path');
const { requireAuthPage } = require('../middleware/auth');

const router = express.Router();
const publicDir = path.join(__dirname, '..', 'public');

router.get('/login', (req, res) => {
  res.sendFile('pages/login.html', { root: publicDir });
});

router.get('/register', (req, res) => {
  res.sendFile('pages/register.html', { root: publicDir });
});

router.get('/dashboard', requireAuthPage, (req, res) => {
  res.sendFile('pages/dashboard.html', { root: publicDir });
});

router.get('/', (req, res) => {
  res.redirect('/login');
});

module.exports = router;
