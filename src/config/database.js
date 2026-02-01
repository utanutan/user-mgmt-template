const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'database.sqlite'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    google_id TEXT UNIQUE,
    auth_provider TEXT DEFAULT 'email',
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// Migration for existing databases
const columns = db.pragma('table_info(users)').map(c => c.name);

if (!columns.includes('google_id')) {
  db.exec(`ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE`);
}
if (!columns.includes('auth_provider')) {
  db.exec(`ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email'`);
}
if (!columns.includes('avatar_url')) {
  db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
}

// Migrate password_hash to nullable if needed (SQLite limitation: recreate table)
const passwordCol = db.pragma('table_info(users)').find(c => c.name === 'password_hash');
if (passwordCol && passwordCol.notnull === 1) {
  db.exec(`
    BEGIN TRANSACTION;
    CREATE TABLE users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      google_id TEXT UNIQUE,
      auth_provider TEXT DEFAULT 'email',
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    INSERT INTO users_new (id, email, password_hash, name, google_id, auth_provider, avatar_url, created_at, updated_at)
      SELECT id, email, password_hash, name, google_id, auth_provider, avatar_url, created_at, updated_at FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
    COMMIT;
  `);
}

module.exports = db;
