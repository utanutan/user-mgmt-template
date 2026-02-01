const express = require('express');
const User = require('../models/user');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  try {
    const users = User.findAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const user = User.findById(Number(req.params.id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id !== req.session.userId) {
      return res.status(403).json({ error: 'You can only update your own account' });
    }
    const existing = User.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { name, email } = req.body;

    // Empty string check
    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    if (email !== undefined && email.trim() === '') {
      return res.status(400).json({ error: 'Email cannot be empty' });
    }

    // Email format validation
    const newEmail = email || existing.email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Email duplicate check
    if (newEmail !== existing.email) {
      const duplicate = User.findByEmail(newEmail);
      if (duplicate) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    const updated = User.update(id, {
      name: name || existing.name,
      email: newEmail
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id !== req.session.userId) {
      return res.status(403).json({ error: 'You can only delete your own account' });
    }
    const existing = User.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }
    User.remove(id);
    req.session.destroy(() => {});
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
