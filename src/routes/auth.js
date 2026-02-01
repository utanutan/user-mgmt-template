const express = require('express');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = User.create(email, passwordHash, name);

    res.status(201).json({ message: 'Registration successful', user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account uses Google login' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/google-client-id', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || null;
  res.json({ clientId });
});

router.post('/google', async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(400).json({ error: 'Google auth is not configured' });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Credential is required' });
    }

    const client = new OAuth2Client(clientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const emailVerified = payload.email_verified;
    const name = payload.name || (email ? email.split('@')[0] : 'User');
    const avatarUrl = payload.picture || null;

    if (!email) {
      return res.status(400).json({ error: 'Email is required from Google account' });
    }

    // 1. Look up by google_id
    let user = User.findByGoogleId(googleId);
    if (user) {
      req.session.userId = user.id;
      return res.json({ id: user.id, email: user.email, name: user.name, isNewUser: false });
    }

    // 2. Look up by email (link account) - only if email is verified
    user = User.findByEmail(email);
    if (user) {
      if (!emailVerified) {
        return res.status(403).json({ error: 'Google email must be verified to link to existing account' });
      }
      User.linkGoogleAccount(user.id, googleId, avatarUrl);
      req.session.userId = user.id;
      return res.json({ id: user.id, email: user.email, name: user.name, isNewUser: false });
    }

    // 3. Create new user
    const newUser = User.createGoogleUser(email, name, googleId, avatarUrl);
    req.session.userId = newUser.id;
    return res.status(201).json({ id: newUser.id, email: newUser.email, name: newUser.name, isNewUser: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = User.findById(req.session.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

module.exports = router;
