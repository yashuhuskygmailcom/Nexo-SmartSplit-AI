// init-db.js  (run: node init-db.js)
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.resolve(__dirname, 'server/nexo_db.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Delete old DB
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Old database deleted.');
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Creating tables...');

  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      UNIQUE(user_id, friend_id)
    )
  `);

  db.run(`
    CREATE TABLE groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      UNIQUE(group_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      paid_by INTEGER NOT NULL,
      group_id INTEGER,
      budget_category_id INTEGER
    )
  `);

  db.run(`
    CREATE TABLE expense_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount_owed REAL NOT NULL
    )
  `);

  // Additional feature tables
  db.run(`
    CREATE TABLE payment_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT,
      description TEXT,
      paid INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      points_required INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      console.log('Tables created successfully.');
      insertPresetBadges();
    }
  });
});

function insertPresetBadges() {
  const presetBadges = [
    { name: 'Split Master', description: 'Successfully split 10 expenses', icon: '🏆' },
    { name: 'Social Butterfly', description: 'Add 5 friends to your network', icon: '🦋' },
    { name: 'Budget Boss', description: 'Stay under budget for a full month', icon: '💎' },
    { name: 'Scanner Pro', description: 'Scan 20 receipts using OCR', icon: '📱' },
    { name: 'Group Leader', description: 'Create 3 expense groups', icon: '👑' },
    { name: 'Early Bird', description: 'Pay bills before due date 5 times', icon: '🌅' },
    { name: 'Debt Free', description: 'Settle all debts with friends', icon: '✨' },
    { name: 'Spender', description: 'Spend over $1000 in a month', icon: '💰' },
    { name: 'Accountant', description: 'Track expenses for 30 consecutive days', icon: '📊' },
    { name: 'Generous Soul', description: 'Pay for group expenses 10 times', icon: '🤝' },
    { name: 'Weekend Warrior', description: 'Split expenses on weekend getaways', icon: '🎉' },
    { name: 'Money Manager', description: 'Create and manage 5 different budgets', icon: '💼' },
  ];

  const insert = `INSERT INTO badges (name, description, icon, points_required) VALUES (?, ?, ?, ?)`;

  presetBadges.forEach((badge, index) => {
    db.run(insert, [badge.name, badge.description, badge.icon, 0], function(err) {
      if (err) {
        console.error('Error inserting preset badge:', err.message);
      }
      if (index === presetBadges.length - 1) {
        console.log('Preset badges inserted successfully.');
        db.close((err2) => {
          if (err2) {
            console.error('Error closing database:', err2.message);
          } else {
            console.log('Database connection closed.');
          }
        });
      }
    });
  });
}
