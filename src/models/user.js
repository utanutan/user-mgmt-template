const db = require('../config/database');

const create = (email, passwordHash, name) => {
  const stmt = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)');
  const result = stmt.run(email, passwordHash, name);
  return { id: result.lastInsertRowid, email, name };
};

const findByEmail = (email) => {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
};

const findById = (id) => {
  const stmt = db.prepare('SELECT id, email, name, auth_provider, avatar_url, created_at, updated_at FROM users WHERE id = ?');
  return stmt.get(id);
};

const findAll = () => {
  const stmt = db.prepare('SELECT id, email, name, auth_provider, avatar_url, created_at, updated_at FROM users');
  return stmt.all();
};

const findByGoogleId = (googleId) => {
  const stmt = db.prepare('SELECT * FROM users WHERE google_id = ?');
  return stmt.get(googleId);
};

const createGoogleUser = (email, name, googleId, avatarUrl) => {
  const stmt = db.prepare(
    'INSERT INTO users (email, password_hash, name, google_id, auth_provider, avatar_url) VALUES (?, NULL, ?, ?, ?, ?)'
  );
  const result = stmt.run(email, name, googleId, 'google', avatarUrl);
  return { id: result.lastInsertRowid, email, name, isNewUser: true };
};

const linkGoogleAccount = (userId, googleId, avatarUrl) => {
  const stmt = db.prepare(
    "UPDATE users SET google_id = ?, auth_provider = 'both', avatar_url = COALESCE(avatar_url, ?), updated_at = datetime('now') WHERE id = ?"
  );
  stmt.run(googleId, avatarUrl, userId);
  return findById(userId);
};

const update = (id, { name, email }) => {
  const stmt = db.prepare("UPDATE users SET name = ?, email = ?, updated_at = datetime('now') WHERE id = ?");
  stmt.run(name, email, id);
  return findById(id);
};

const remove = (id) => {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  return stmt.run(id);
};

module.exports = { create, findByEmail, findById, findAll, findByGoogleId, createGoogleUser, linkGoogleAccount, update, remove };
