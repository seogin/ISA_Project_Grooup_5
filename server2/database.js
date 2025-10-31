const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DEFAULT_DB_FILE = process.env.DB_FILE || path.join(__dirname, 'app-data.sqlite3');

let databasePromise = null;

async function createDatabaseConnection() {
  const db = await open({
    filename: DEFAULT_DB_FILE,
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA foreign_keys = ON;');
  await db.exec('PRAGMA journal_mode = WAL;');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      api_calls_used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at TEXT,
      last_request_at TEXT
    )
  `);

  return db;
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = createDatabaseConnection();
  }
  return databasePromise;
}

module.exports = {
  getDatabase,
};
