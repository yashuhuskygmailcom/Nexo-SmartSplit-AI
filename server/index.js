// server/index.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const { createWorker } = require('tesseract.js');
const cors = require('cors');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178'],
    credentials: true,
  },
});
const PORT = process.env.PORT || 10000;
const DB_PATH = path.join(__dirname, 'nexo_db.sqlite');

// ---------- DB SETUP ----------
if (!fs.existsSync(__dirname)) {
  fs.mkdirSync(__dirname, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure optional profile columns exist on the users table (safe ALTERs)
  db.all("PRAGMA table_info(users)", (err, rows) => {
    if (err) {
      console.error('Failed to read users table info', err);
      return;
    }
    const cols = (rows || []).map(r => r.name);

    // Build list of required ALTER statements (only ones that are needed)
    const alters = [];
    if (!cols.includes('phone')) alters.push("ALTER TABLE users ADD COLUMN phone TEXT");
    if (!cols.includes('currency')) alters.push("ALTER TABLE users ADD COLUMN currency TEXT DEFAULT 'INR'");
    if (!cols.includes('default_split_method')) alters.push("ALTER TABLE users ADD COLUMN default_split_method TEXT DEFAULT 'equal'");

    // Run alters sequentially and then run the migration check after all alters complete
    function runAlters(i) {
      if (i >= alters.length) return runCurrencyMigration();
      db.run(alters[i], (e) => {
        if (e) console.error('Schema alter failed:', alters[i], e);
        runAlters(i + 1);
      });
    }

    function runCurrencyMigration() {
      // Automatic migration: convert existing USD/empty currency values to INR
      db.get("SELECT COUNT(*) as cnt FROM users WHERE currency IS NULL OR currency = '' OR currency = 'USD'", (mErr, mRow) => {
        if (mErr) {
          console.error('Currency migration check failed', mErr);
          return;
        }
        const toMigrate = mRow && mRow.cnt ? mRow.cnt : 0;
        if (toMigrate > 0) {
          db.run("UPDATE users SET currency = 'INR' WHERE currency IS NULL OR currency = '' OR currency = 'USD'", function(uErr) {
            if (uErr) {
              console.error('Currency migration failed', uErr);
              return;
            }
            console.log(`Currency migration: updated ${this.changes} user(s) to INR`);
          });
        }
      });
    }

    if (alters.length > 0) runAlters(0); else runCurrencyMigration();
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      UNIQUE(user_id, friend_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      UNIQUE(group_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
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
    CREATE TABLE IF NOT EXISTS expense_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount_owed REAL NOT NULL
    )
  `);

  // Additional tables for reminders and badges
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_reminders (
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
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      points_required INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_id)
    )
  `);

  // Wallet table for virtual money
  db.run(`
    CREATE TABLE IF NOT EXISTS user_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Wallet transaction history
  db.run(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Budget categories for users
  db.run(`
    CREATE TABLE IF NOT EXISTS budget_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      budget_amount REAL NOT NULL,
      icon TEXT DEFAULT '💰',
      color TEXT DEFAULT 'from-slate-500 to-slate-600',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Notifications table for notification center
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      status TEXT DEFAULT 'unread',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME
    )
  `);

  // Notification queue for processing
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_id INTEGER NOT NULL,
      scheduled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (notification_id) REFERENCES notifications (id)
    )
  `);

  // Seed preset badges if they don't exist
  seedPresetBadges();
});

function seedPresetBadges() {
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

  db.get('SELECT COUNT(*) as count FROM badges', (err, row) => {
    if (err) {
      console.error('Error checking badges:', err);
      return;
    }

    // Only seed if no badges exist
    if (row.count === 0) {
      const insert = `INSERT INTO badges (name, description, icon, points_required) VALUES (?, ?, ?, ?)`;
      presetBadges.forEach((badge) => {
        db.run(insert, [badge.name, badge.description, badge.icon, 0], (err) => {
          if (err) console.error('Error seeding badge:', err);
        });
      });
      console.log('Preset badges seeded successfully.');
    }
  });
}

// ---------- MIDDLEWARE ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow frontend (Vite) on 5173, 5174, 5175, 5176, 5177, 5178
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178'],
  credentials: true,
}));

app.use(session({
  secret: 'nexo-super-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// Multer for uploads (OCR)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({ dest: uploadsDir });

// ---------- HELPERS ----------
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  next();
}

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../build')));

// Serve React app on root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// ---------- AUTH ROUTES ----------

// POST /api/signup  { username, email, password }
app.post('/api/signup', (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
  );
  stmt.run(username, email, hash, function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ message: 'Email already registered' });
      }
      console.error('Signup error:', err);
      return res.status(500).json({ message: 'Signup failed' });
    }
    return res.status(201).json({ id: this.lastID, username, email });
  });
});

// POST /api/login  { email, password }
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: 'Login failed' });
    }
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    res.json({
      message: 'Login successful',
      user: { id: user.id, username: user.username, email: user.email },
    });
  });
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// GET /api/check-session
app.get('/api/check-session', (req, res) => {
  if (!req.session.userId) {
    return res.json({ loggedIn: false });
  }
  db.get(
    'SELECT id, username, email FROM users WHERE id = ?',
    [req.session.userId],
    (err, user) => {
      if (err || !user) {
        return res.json({ loggedIn: false });
      }
      res.json({ loggedIn: true, user });
    }
  );
});

// GET /api/user/:email  (used to find friend by email)
app.get('/api/user/:email', (req, res) => {
  const email = req.params.email;
  db.get(
    'SELECT id, username, email FROM users WHERE email = ?',
    [email],
    (err, user) => {
      if (err) {
        console.error('Get user error:', err);
        return res.status(500).json({ message: 'Failed to fetch user' });
      }
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ user });
    }
  );
});

// ---------- FRIENDS ----------

// GET /api/friends
app.get('/api/friends', requireAuth, (req, res) => {
  const userId = req.session.userId;

  // Return friends along with a computed balance between the current user and each friend.
  // balance = amount friend owes the user (positive) - amount user owes the friend (negative)
  const sql = `
    SELECT u.id, u.username, u.email,
      COALESCE((
        SELECT SUM(s.amount_owed)
        FROM expenses e
        JOIN expense_splits s ON s.expense_id = e.id
        WHERE e.paid_by = ? AND s.user_id = u.id
      ), 0) AS owed_to_user,
      COALESCE((
        SELECT SUM(s.amount_owed)
        FROM expenses e
        JOIN expense_splits s ON s.expense_id = e.id
        WHERE e.paid_by = u.id AND s.user_id = ?
      ), 0) AS owed_by_user
    FROM friends f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ?
  `;

  db.all(sql, [userId, userId, userId], (err, rows) => {
    if (err) {
      console.error('Get friends error:', err);
      return res.status(500).json({ message: 'Failed to fetch friends' });
    }

    const result = rows.map(r => ({
      id: r.id,
      username: r.username,
      email: r.email,
      balance: (r.owed_to_user || 0) - (r.owed_by_user || 0),
    }));

    console.log(`[GET /api/friends] userId: ${userId}, found ${result.length} friends:`, result);

    res.json(result);
  });
});

// POST /api/friends  { friendId }
app.post('/api/friends', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { friendId } = req.body || {};

  if (!friendId) {
    return res.status(400).json({ message: 'friendId is required' });
  }
  if (friendId === userId) {
    return res.status(400).json({ message: 'You cannot add yourself as a friend.' });
  }

  db.get('SELECT id FROM users WHERE id = ?', [friendId], (err, friend) => {
    if (err) {
      console.error('Add friend error (lookup):', err);
      return res.status(500).json({ message: 'Failed to add friend' });
    }
    if (!friend) {
      return res.status(404).json({ message: 'Friend user not found' });
    }

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO friends (user_id, friend_id)
      VALUES (?, ?)
    `);

    db.serialize(() => {
      stmt.run(userId, friendId);
      stmt.run(friendId, userId, (err2) => {
        if (err2) {
          console.error('Add friend error (insert):', err2);
          return res.status(500).json({ message: 'Failed to add friend' });
        }
        res.json({ message: 'Friend added successfully' });
      });
    });
  });
});

// ---------- GROUPS ----------

// GET /api/groups
app.get('/api/groups', requireAuth, (req, res) => {
  const userId = req.session.userId;

  const sql = `
    SELECT g.id, g.name
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id
    WHERE gm.user_id = ?
  `;

  db.all(sql, [userId], (err, groups) => {
    if (err) {
      console.error('Get groups error:', err);
      return res.status(500).json({ message: 'Failed to fetch groups' });
    }

    if (groups.length === 0) {
      return res.json([]);
    }

    const groupIds = groups.map(g => g.id);
    const placeholders = groupIds.map(() => '?').join(',');

    const membersSql = `
      SELECT gm.group_id, u.username
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id IN (${placeholders})
    `;
    const expensesSql = `
      SELECT group_id, SUM(amount) AS total
      FROM expenses
      WHERE group_id IN (${placeholders})
      GROUP BY group_id
    `;

    db.all(membersSql, groupIds, (err2, membersRows) => {
      if (err2) {
        console.error('Group members error:', err2);
        return res.status(500).json({ message: 'Failed to fetch group members' });
      }

      db.all(expensesSql, groupIds, (err3, expRows) => {
        if (err3) {
          console.error('Group expenses error:', err3);
          return res.status(500).json({ message: 'Failed to fetch group expenses' });
        }

        const membersByGroup = {};
        membersRows.forEach(r => {
          if (!membersByGroup[r.group_id]) membersByGroup[r.group_id] = [];
          membersByGroup[r.group_id].push(r.username);
        });

        const totalByGroup = {};
        expRows.forEach(r => {
          totalByGroup[r.group_id] = r.total || 0;
        });

        const result = groups.map(g => ({
          id: g.id,
          name: g.name,
          members: membersByGroup[g.id] || [],
          totalExpenses: totalByGroup[g.id] || 0,
        }));

        res.json(result);
      });
    });
  });
});

// POST /api/groups  { name, members: number[] }
app.post('/api/groups', requireAuth, (req, res) => {
  const ownerId = req.session.userId;
  const { name, members } = req.body || {};

  if (!name || !Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ message: 'name and members are required' });
  }

  const uniqueMembers = Array.from(new Set([...members, ownerId]));

  db.run(
    'INSERT INTO groups (name, owner_id) VALUES (?, ?)',
    [name, ownerId],
    function (err) {
      if (err) {
        console.error('Create group error:', err);
        return res.status(500).json({ message: 'Failed to create group' });
      }
      const groupId = this.lastID;

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO group_members (group_id, user_id)
        VALUES (?, ?)
      `);

      db.serialize(() => {
        uniqueMembers.forEach(uid => {
          stmt.run(groupId, uid);
        });
        stmt.finalize(err2 => {
          if (err2) {
            console.error('Group members insert error:', err2);
            return res.status(500).json({ message: 'Failed to add group members' });
          }
          res.status(201).json({ id: groupId, name });
        });
      });
    }
  );
});

// ---------- EXPENSES ----------

// GET /api/expenses
app.get('/api/expenses', requireAuth, (req, res) => {
  const userId = req.session.userId;

  const sql = `
    SELECT DISTINCT e.*
    FROM expenses e
    LEFT JOIN expense_splits s ON s.expense_id = e.id
    WHERE e.paid_by = ? OR s.user_id = ?
    ORDER BY e.date DESC, e.id DESC
  `;

  db.all(sql, [userId, userId], (err, expenses) => {
    if (err) {
      console.error('Get expenses error:', err);
      return res.status(500).json({ message: 'Failed to fetch expenses' });
    }

    if (expenses.length === 0) {
      return res.json([]);
    }

    const expenseIds = expenses.map(e => e.id);
    const placeholders = expenseIds.map(() => '?').join(',');

    db.all(
      `
        SELECT s.expense_id, s.user_id, s.amount_owed, u.username
        FROM expense_splits s
        JOIN users u ON u.id = s.user_id
        WHERE s.expense_id IN (${placeholders})
      `,
      expenseIds,
      (err2, splitsRows) => {
        if (err2) {
          console.error('Expense splits error:', err2);
          return res.status(500).json({ message: 'Failed to fetch expense splits' });
        }

        const splitsByExpense = {};
        splitsRows.forEach(r => {
          if (!splitsByExpense[r.expense_id]) splitsByExpense[r.expense_id] = [];
          splitsByExpense[r.expense_id].push({
            user_id: r.user_id,
            amount_owed: r.amount_owed,
            username: r.username,
          });
        });

        const result = expenses.map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          date: e.date,
          paid_by: e.paid_by,
          groupId: e.group_id || undefined,
          budgetCategoryId: e.budget_category_id || null,
          splits: splitsByExpense[e.id] || [],
        }));

        res.json(result);
      }
    );
  });
});

// POST /api/expenses
app.post('/api/expenses', requireAuth, (req, res) => {
  const { description, amount, date, paid_by, splits, groupId, budgetCategory } = req.body || {};

  if (!description || !amount || !date || !paid_by || !Array.isArray(splits) || splits.length === 0) {
    return res.status(400).json({ message: 'Invalid expense data' });
  }

  const budgetCategoryId = budgetCategory ? parseInt(budgetCategory, 10) : null;

  db.run(
    'INSERT INTO expenses (description, amount, date, paid_by, group_id, budget_category_id) VALUES (?, ?, ?, ?, ?, ?)',
    [description, amount, date, paid_by, groupId || null, budgetCategoryId],
    function (err) {
      if (err) {
        console.error('Create expense error:', err);
        return res.status(500).json({ message: 'Failed to create expense' });
      }
      const expenseId = this.lastID;

      const stmt = db.prepare(`
        INSERT INTO expense_splits (expense_id, user_id, amount_owed)
        VALUES (?, ?, ?)
      `);

      db.serialize(() => {
        splits.forEach(s => {
          stmt.run(expenseId, s.user_id, s.amount_owed);
        });
        stmt.finalize(err2 => {
          if (err2) {
            console.error('Insert splits error:', err2);
            return res.status(500).json({ message: 'Failed to save splits' });
          }
          res.status(201).json({ id: expenseId });
        });
      });
    }
  );
});

// PUT /api/expenses/:id
app.put('/api/expenses/:id', requireAuth, (req, res) => {
  const expenseId = req.params.id;
  const { description, amount, date, paid_by, splits, groupId, budgetCategory } = req.body || {};

  const budgetCategoryId = budgetCategory ? parseInt(budgetCategory, 10) : null;

  db.run(
    `
      UPDATE expenses
      SET description = ?, amount = ?, date = ?, paid_by = ?, group_id = ?, budget_category_id = ?
      WHERE id = ?
    `,
    [description, amount, date, paid_by, groupId || null, budgetCategoryId, expenseId],
    (err) => {
      if (err) {
        console.error('Update expense error:', err);
        return res.status(500).json({ message: 'Failed to update expense' });
      }

      db.run(
        'DELETE FROM expense_splits WHERE expense_id = ?',
        [expenseId],
        (err2) => {
          if (err2) {
            console.error('Delete old splits error:', err2);
            return res.status(500).json({ message: 'Failed to update splits' });
          }

          const stmt = db.prepare(`
            INSERT INTO expense_splits (expense_id, user_id, amount_owed)
            VALUES (?, ?, ?)
          `);

          db.serialize(() => {
            (splits || []).forEach(s => {
              stmt.run(expenseId, s.user_id, s.amount_owed);
            });
            stmt.finalize(err3 => {
              if (err3) {
                console.error('Insert new splits error:', err3);
                return res.status(500).json({ message: 'Failed to update splits' });
              }
              res.json({ message: 'Expense updated' });
            });
          });
        }
      );
    }
  );
});

// DELETE /api/expenses/:id
app.delete('/api/expenses/:id', requireAuth, (req, res) => {
  const expenseId = req.params.id;

  db.run('DELETE FROM expense_splits WHERE expense_id = ?', [expenseId], (err) => {
    if (err) {
      console.error('Delete splits error:', err);
      return res.status(500).json({ message: 'Failed to delete expense splits' });
    }
    db.run('DELETE FROM expenses WHERE id = ?', [expenseId], (err2) => {
      if (err2) {
        console.error('Delete expense error:', err2);
        return res.status(500).json({ message: 'Failed to delete expense' });
      }
      res.json({ message: 'Expense deleted' });
    });
  });
});

// GET /api/expenses/summary
app.get('/api/expenses/summary', requireAuth, (req, res) => {
  const userId = req.session.userId;

  const paidSql = `
    SELECT COALESCE(SUM(amount), 0) AS totalPaid
    FROM expenses
    WHERE paid_by = ?
  `;
  const owedSql = `
    SELECT COALESCE(SUM(amount_owed), 0) AS totalOwed
    FROM expense_splits
    WHERE user_id = ?
  `;

  db.get(paidSql, [userId], (err, paidRow) => {
    if (err) {
      console.error('Summary paid error:', err);
      return res.status(500).json({ message: 'Failed to get summary' });
    }
    db.get(owedSql, [userId], (err2, owedRow) => {
      if (err2) {
        console.error('Summary owed error:', err2);
        return res.status(500).json({ message: 'Failed to get summary' });
      }
      res.json({
        totalPaid: paidRow.totalPaid || 0,
        totalOwed: owedRow.totalOwed || 0,
      });
    });
  });
});

// ---------- OCR ----------

// POST /api/scan-receipt  (field name: "receipt")
app.post('/api/scan-receipt', requireAuth, upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(req.file.path);
    await worker.terminate();

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const merchantName = lines[0] || 'Unknown merchant';

    const dateRegex = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/;
    let date = new Date().toISOString().split('T')[0];
    for (const line of lines) {
      const m = line.match(dateRegex);
      if (m) {
        date = m[1];
        break;
      }
    }

    let total = 0;
    const numberRegex = /(\d+[\.,]\d{2})/g;
    for (const line of lines) {
      if (/total/i.test(line)) {
        const matches = [...line.matchAll(numberRegex)];
        if (matches.length > 0) {
          total = parseFloat(matches[matches.length - 1][1].replace(',', '.'));
          break;
        }
      }
    }

    // Try to extract item lines (name + price) from the receipt text.
    const items = [];

    // helper to parse price string to number
    const parsePrice = (s) => {
      if (!s) return null;
      const cleaned = s.replace(/,/g, '.').replace(/[^0-9.]/g, '');
      const v = parseFloat(cleaned);
      return Number.isFinite(v) ? v : null;
    };

    // Find index of the line that contains the total (if any)
    const totalLineIndex = lines.findIndex(l => /total/i.test(l));

    // Consider candidate lines for items: after merchant line up to total line
    const startIdx = 1;
    const endIdx = totalLineIndex >= 0 ? totalLineIndex : lines.length;

    for (let i = startIdx; i < endIdx; i++) {
      const line = lines[i];
      // skip obvious non-item lines
      if (!line || /subtotal|tax|amount|balance|change|visa|mastercard/i.test(line)) continue;

      const matches = [...line.matchAll(numberRegex)];
      if (matches.length === 0) continue;

      // take last numeric match as the price
      const priceStr = matches[matches.length - 1][1];
      const price = parsePrice(priceStr);
      if (price === null) continue;

      // derive name by removing the price substring from the line
      let name = line.replace(priceStr, '').trim();
      // remove leading quantity markers like "1 x" or "2x"
      name = name.replace(/^\d+\s*x?\s*/i, '').trim();
      // remove trailing separators
      name = name.replace(/[-\.\s]+$/, '').trim();

      if (!name) name = 'Item';

      items.push({ name, price });
    }

    const extracted = {
      merchantName,
      date,
      total,
      items,
    };

    res.json(extracted);
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ message: 'Failed to process receipt' });
  } finally {
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      // ignore
    }
  }
});

// ---------- BADGES ----------
// GET all badges (admin can see all, users see their own awards)
app.get('/api/badges', requireAuth, (req, res) => {
  const userId = req.session.userId;
  
  const sql = `
    SELECT b.id, b.name, b.description, b.icon, b.points_required,
           COUNT(ub.id) as earned_by_count,
           (SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = b.id LIMIT 1) as user_earned
    FROM badges b
    LEFT JOIN user_badges ub ON ub.badge_id = b.id
    GROUP BY b.id
    ORDER BY b.id
  `;
  
  db.all(sql, [userId], (err, badges) => {
    if (err) {
      console.error('Get badges error:', err);
      return res.status(500).json({ message: 'Failed to get badges' });
    }
    res.json(badges || []);
  });
});

// POST - Create a new badge (admin only, but we'll allow for now)
app.post('/api/badges', requireAuth, (req, res) => {
  const { name, description, icon, points_required } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Badge name is required' });
  }
  
  const sql = `
    INSERT INTO badges (name, description, icon, points_required)
    VALUES (?, ?, ?, ?)
  `;
  
  db.run(sql, [name, description || '', icon || '⭐', points_required || 0], function(err) {
    if (err) {
      console.error('Create badge error:', err);
      return res.status(500).json({ message: 'Failed to create badge' });
    }
    res.json({ id: this.lastID, name, description, icon, points_required });
  });
});

// PUT - Update a badge
app.put('/api/badges/:id', requireAuth, (req, res) => {
  const badgeId = req.params.id;
  const { name, description, icon, points_required } = req.body;
  
  const sql = `
    UPDATE badges
    SET name = ?, description = ?, icon = ?, points_required = ?
    WHERE id = ?
  `;
  
  db.run(sql, [name, description, icon, points_required, badgeId], function(err) {
    if (err) {
      console.error('Update badge error:', err);
      return res.status(500).json({ message: 'Failed to update badge' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    res.json({ id: badgeId, name, description, icon, points_required });
  });
});

// DELETE - Delete a badge
app.delete('/api/badges/:id', requireAuth, (req, res) => {
  const badgeId = req.params.id;
  
  const sql = `DELETE FROM badges WHERE id = ?`;
  
  db.run(sql, [badgeId], function(err) {
    if (err) {
      console.error('Delete badge error:', err);
      return res.status(500).json({ message: 'Failed to delete badge' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    res.json({ message: 'Badge deleted' });
  });
});

// POST - Award badge to user
app.post('/api/badges/:badgeId/award/:userId', requireAuth, (req, res) => {
  const { badgeId, userId } = req.params;
  
  const sql = `
    INSERT OR IGNORE INTO user_badges (user_id, badge_id)
    VALUES (?, ?)
  `;
  
  db.run(sql, [userId, badgeId], function(err) {
    if (err) {
      console.error('Award badge error:', err);
      return res.status(500).json({ message: 'Failed to award badge' });
    }
    res.json({ message: 'Badge awarded' });
  });
});

// DELETE - Revoke badge from user
app.delete('/api/badges/:badgeId/award/:userId', requireAuth, (req, res) => {
  const { badgeId, userId } = req.params;
  
  const sql = `
    DELETE FROM user_badges
    WHERE user_id = ? AND badge_id = ?
  `;
  
  db.run(sql, [userId, badgeId], function(err) {
    if (err) {
      console.error('Revoke badge error:', err);
      return res.status(500).json({ message: 'Failed to revoke badge' });
    }
    res.json({ message: 'Badge revoked' });
  });
});

// ---------- LEADERBOARD ----------
app.get('/api/leaderboard', requireAuth, (req, res) => {
  const userId = req.session.userId;
  
  const sql = `
    SELECT 
      u.id,
      u.username as name,
      COUNT(DISTINCT ub.id) as badges,
      (SELECT COUNT(DISTINCT id) FROM expenses WHERE paid_by = u.id) as expenses_count,
      (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE paid_by = u.id) as total_paid,
      u.created_at
    FROM users u
    LEFT JOIN user_badges ub ON ub.user_id = u.id
    GROUP BY u.id
    ORDER BY badges DESC, total_paid DESC
  `;
  
  db.all(sql, (err, users) => {
    if (err) {
      console.error('Get leaderboard error:', err);
      return res.status(500).json({ message: 'Failed to get leaderboard' });
    }
    
    // Add rank and calculate points (simple: badges * 100 + expenses_count * 50)
    const leaderboard = (users || []).map((user, index) => ({
      ...user,
      rank: index + 1,
      points: (user.badges || 0) * 100 + (user.expenses_count || 0) * 50,
      avatar: user.name.charAt(0).toUpperCase()
    }));
    
    res.json(leaderboard);
  });
});

// ---------- DASHBOARD ----------
app.get('/api/dashboard', requireAuth, (req, res) => {
  const userId = req.session.userId;

  const totalFriendsSql = `
    SELECT COUNT(*) AS count
    FROM friends
    WHERE user_id = ?
  `;
  const totalGroupsSql = `
    SELECT COUNT(DISTINCT g.id) AS count
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id
    WHERE gm.user_id = ?
  `;
  const recentExpensesSql = `
    SELECT id, description, amount, date
    FROM expenses
    WHERE paid_by = ?
    ORDER BY date DESC, id DESC
    LIMIT 5
  `;

  db.get(totalFriendsSql, [userId], (err, friendsRow) => {
    if (err) {
      console.error('Dashboard friends error:', err);
      return res.status(500).json({ message: 'Failed to get dashboard data' });
    }
    db.get(totalGroupsSql, [userId], (err2, groupsRow) => {
      if (err2) {
        console.error('Dashboard groups error:', err2);
        return res.status(500).json({ message: 'Failed to get dashboard data' });
      }
      db.all(recentExpensesSql, [userId], (err3, recentExpenses) => {
        if (err3) {
          console.error('Dashboard expenses error:', err3);
          return res.status(500).json({ message: 'Failed to get dashboard data' });
        }

        res.json({
          totalFriends: friendsRow.count || 0,
          totalGroups: groupsRow.count || 0,
          recentExpenses: recentExpenses || [],
        });
      });
    });
  });
});

// ---------- USER PROFILE ----------
// Update current user's profile
app.put('/api/user', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { username, email, phone, currency, defaultSplitMethod } = req.body || {};

  if (!username || !email) {
    return res.status(400).json({ message: 'username and email are required' });
  }

  // Check email uniqueness (exclude current user)
  db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, row) => {
    if (err) {
      console.error('Profile update - email check error', err);
      return res.status(500).json({ message: 'Failed to update profile' });
    }
    if (row) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const sql = `
      UPDATE users
      SET username = ?, email = ?, phone = ?, currency = ?, default_split_method = ?
      WHERE id = ?
    `;

    db.run(sql, [username, email, phone || null, currency || 'INR', defaultSplitMethod || 'equal', userId], function (err2) {
      if (err2) {
        console.error('Profile update error', err2);
        return res.status(500).json({ message: 'Failed to update profile' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return updated user info
      db.get('SELECT id, username, email, phone, currency, default_split_method as defaultSplitMethod FROM users WHERE id = ?', [userId], (err3, updated) => {
        if (err3) {
          console.error('Failed to fetch updated user', err3);
          return res.status(500).json({ message: 'Failed to fetch updated profile' });
        }
        res.json({ user: updated });
      });
    });
  });
});

// ---------- WALLET ----------
// GET /api/wallet - Get user's wallet balance
app.get('/api/wallet', requireAuth, (req, res) => {
  const userId = req.session.userId;

  db.get(
    'SELECT id, balance, currency FROM user_wallets WHERE user_id = ?',
    [userId],
    (err, wallet) => {
      if (err) {
        console.error('Get wallet error:', err);
        return res.status(500).json({ message: 'Failed to fetch wallet' });
      }

      // If no wallet exists, create one
      if (!wallet) {
        db.run(
          'INSERT INTO user_wallets (user_id, balance, currency) VALUES (?, ?, ?)',
          [userId, 0, 'INR'],
          function (err2) {
            if (err2) {
              console.error('Create wallet error:', err2);
              return res.status(500).json({ message: 'Failed to create wallet' });
            }
            res.json({ id: this.lastID, balance: 0, currency: 'INR' });
          }
        );
      } else {
        res.json(wallet);
      }
    }
  );
});

// POST /api/wallet/add-funds - Add money to wallet
app.post('/api/wallet/add-funds', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { amount, description } = req.body || {};

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }

  // First, ensure wallet exists
  db.run(
    'INSERT OR IGNORE INTO user_wallets (user_id, balance, currency) VALUES (?, ?, ?)',
    [userId, 0, 'INR'],
    () => {
      // Update wallet balance
      db.run(
        'UPDATE user_wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [amount, userId],
        (err) => {
          if (err) {
            console.error('Add funds error:', err);
            return res.status(500).json({ message: 'Failed to add funds' });
          }

          // Record transaction
          db.run(
            'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)',
            [userId, 'credit', amount, description || 'Added funds'],
            function (err2) {
              if (err2) {
                console.error('Record transaction error:', err2);
                return res.status(500).json({ message: 'Failed to record transaction' });
              }

              // Return updated balance
              db.get(
                'SELECT balance, currency FROM user_wallets WHERE user_id = ?',
                [userId],
                (err3, wallet) => {
                  if (err3) {
                    return res.status(500).json({ message: 'Failed to fetch wallet' });
                  }
                  res.json({ message: 'Funds added successfully', wallet });
                }
              );
            }
          );
        }
      );
    }
  );
});

// POST /api/wallet/pay-debt - Pay debt/expense from wallet
app.post('/api/wallet/pay-debt', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { amount, friendId, description } = req.body || {};

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }

  // friendId is optional for expense payments (when paying from wallet for expenses)

  // If friendId is provided, this is a debt payment to a friend
  // If friendId is not provided, this is a general expense payment from wallet

  // First, ensure wallet exists
  db.run(
    'INSERT OR IGNORE INTO user_wallets (user_id, balance, currency) VALUES (?, ?, ?)',
    [userId, 0, 'INR'],
    () => {
      // Check wallet balance
      db.get(
        'SELECT balance FROM user_wallets WHERE user_id = ?',
        [userId],
        (err, wallet) => {
          if (err) {
            console.error('Check balance error:', err);
            return res.status(500).json({ message: 'Failed to check wallet balance' });
          }

          if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient wallet balance' });
          }

          // Deduct from wallet
          db.run(
            'UPDATE user_wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            [amount, userId],
            (err2) => {
              if (err2) {
                console.error('Deduct from wallet error:', err2);
                return res.status(500).json({ message: 'Failed to process payment' });
              }

              // Record transaction
              db.run(
                'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)',
                [userId, 'debit', amount, description || 'Paid ₹' + amount + ' debt'],
                (err3) => {
                  if (err3) {
                    console.error('Record transaction error:', err3);
                    return res.status(500).json({ message: 'Failed to record transaction' });
                  }

                  if (friendId) {
                    // First, check total owed to this friend
                    db.get(`
                      SELECT COALESCE(SUM(es.amount_owed), 0) as total_owed
                      FROM expense_splits es
                      JOIN expenses e ON e.id = es.expense_id
                      WHERE e.paid_by = ? AND es.user_id = ?
                    `, [friendId, userId], (errCheck, owedRow) => {
                      if (errCheck) {
                        console.error('Check owed amount error:', errCheck);
                        return res.status(500).json({ message: 'Failed to check owed amount' });
                      }

                      const totalOwed = owedRow.total_owed || 0;
                      if (amount > totalOwed) {
                        return res.status(400).json({ message: 'Cannot pay more than owed. You owe ₹' + totalOwed.toFixed(2) });
                      }

                      // Update expense_splits to reduce owed amount
                      db.all(`
                        SELECT es.id, es.amount_owed
                        FROM expense_splits es
                        JOIN expenses e ON e.id = es.expense_id
                        WHERE e.paid_by = ? AND es.user_id = ?
                        ORDER BY e.date ASC
                      `, [friendId, userId], (err5, splits) => {
                      if (err5) {
                        console.error('Get splits error:', err5);
                        return res.status(500).json({ message: 'Failed to get expense splits' });
                      }

                      let remaining = amount;
                      const updates = [];
                      for (const split of splits) {
                        if (remaining <= 0) break;
                        const reduce = Math.min(remaining, split.amount_owed);
                        remaining -= reduce;
                        const newAmount = Math.max(0, split.amount_owed - reduce);
                        updates.push({ id: split.id, amount: newAmount });
                      }

                      if (updates.length > 0) {
                        let completed = 0;
                        updates.forEach(update => {
                          db.run('UPDATE expense_splits SET amount_owed = ? WHERE id = ?', [update.amount, update.id], (err6) => {
                            if (err6) console.error('Update split error:', err6);
                            completed++;
                            if (completed === updates.length) {
                              // Return updated balance and summary
                              db.get(
                                'SELECT balance, currency FROM user_wallets WHERE user_id = ?',
                                [userId],
                                (err4, updatedWallet) => {
                                  if (err4) {
                                    return res.status(500).json({ message: 'Failed to fetch wallet' });
                                  }
                                  // Get updated summary
                                  const paidSql = `
                                    SELECT COALESCE(SUM(amount), 0) AS totalPaid
                                    FROM expenses
                                    WHERE paid_by = ?
                                  `;
                                  const owedSql = `
                                    SELECT COALESCE(SUM(amount_owed), 0) AS totalOwed
                                    FROM expense_splits
                                    WHERE user_id = ?
                                  `;
                                  db.get(paidSql, [userId], (errPaid, paidRow) => {
                                    if (errPaid) {
                                      console.error('Summary paid error:', errPaid);
                                      return res.status(500).json({ message: 'Failed to get summary' });
                                    }
                                    db.get(owedSql, [userId], (errOwed, owedRow) => {
                                      if (errOwed) {
                                        console.error('Summary owed error:', errOwed);
                                        return res.status(500).json({ message: 'Failed to get summary' });
                                      }
                                      res.json({
                                        message: 'Debt paid successfully',
                                        wallet: updatedWallet,
                                        summary: {
                                          totalPaid: paidRow.totalPaid || 0,
                                          totalOwed: owedRow.totalOwed || 0,
                                        }
                                      });
                                    });
                                  });
                                }
                              );
                            }
                          });
                        });
                      } else {
                        // No splits to update, return wallet and summary
                        db.get(
                          'SELECT balance, currency FROM user_wallets WHERE user_id = ?',
                          [userId],
                          (err4, updatedWallet) => {
                            if (err4) {
                              return res.status(500).json({ message: 'Failed to fetch wallet' });
                            }
                            // Get updated summary
                            const paidSql = `
                              SELECT COALESCE(SUM(amount), 0) AS totalPaid
                              FROM expenses
                              WHERE paid_by = ?
                            `;
                            const owedSql = `
                              SELECT COALESCE(SUM(amount_owed), 0) AS totalOwed
                              FROM expense_splits
                              WHERE user_id = ?
                            `;
                            db.get(paidSql, [userId], (errPaid, paidRow) => {
                              if (errPaid) {
                                console.error('Summary paid error:', errPaid);
                                return res.status(500).json({ message: 'Failed to get summary' });
                              }
                              db.get(owedSql, [userId], (errOwed, owedRow) => {
                                if (errOwed) {
                                  console.error('Summary owed error:', errOwed);
                                  return res.status(500).json({ message: 'Failed to get summary' });
                                }
                                res.json({
                                  message: 'Debt paid successfully',
                                  wallet: updatedWallet,
                                  summary: {
                                    totalPaid: paidRow.totalPaid || 0,
                                    totalOwed: owedRow.totalOwed || 0,
                                  }
                                });
                              });
                            });
                          }
);
}
                    });
                  }
                );
              } else {
                    // Return updated balance
                    db.get(
                      'SELECT balance, currency FROM user_wallets WHERE user_id = ?',
                      [userId],
                      (err4, updatedWallet) => {
                        if (err4) {
                          return res.status(500).json({ message: 'Failed to fetch wallet' });
                        }
                        res.json({
                          message: 'Debt paid successfully',
                          wallet: updatedWallet
                        });
                      }
                    );
                  }
                }
              );
            }
          );
        }
      );
    }
  );
});

// GET /api/wallet/transactions - Get transaction history
app.get('/api/wallet/transactions', requireAuth, (req, res) => {
  const userId = req.session.userId;

  db.all(
    'SELECT id, type, amount, description, created_at FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [userId],
    (err, transactions) => {
      if (err) {
        console.error('Get transactions error:', err);
        return res.status(500).json({ message: 'Failed to fetch transactions' });
      }
      res.json(transactions || []);
    }
  );
});

// ---------- BUDGET ROUTES ----------

// GET /api/budgets - Get all budget categories for user
app.get('/api/budgets', requireAuth, (req, res) => {
  const userId = req.session.userId;

  db.all(
    'SELECT id, name, budget_amount, icon, color, created_at FROM budget_categories WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, budgets) => {
      if (err) {
        console.error('Get budgets error:', err);
        return res.status(500).json({ message: 'Failed to fetch budgets' });
      }
      res.json(budgets || []);
    }
  );
});

// POST /api/budgets - Create a new budget category
app.post('/api/budgets', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { name, budget_amount, icon, color } = req.body;

  if (!name || !budget_amount || budget_amount <= 0) {
    return res.status(400).json({ message: 'Invalid budget data' });
  }

  const stmt = db.prepare(
    'INSERT INTO budget_categories (user_id, name, budget_amount, icon, color) VALUES (?, ?, ?, ?, ?)'
  );

  stmt.run(userId, name, budget_amount, icon || '💰', color || 'from-slate-500 to-slate-600', function (err) {
    if (err) {
      console.error('Create budget error:', err);
      return res.status(500).json({ message: 'Failed to create budget' });
    }
    res.status(201).json({
      id: this.lastID,
      user_id: userId,
      name,
      budget_amount,
      icon: icon || '💰',
      color: color || 'from-slate-500 to-slate-600'
    });
  });
});

// PUT /api/budgets/:id - Update a budget category
app.put('/api/budgets/:id', requireAuth, (req, res) => {
  const budgetId = req.params.id;
  const userId = req.session.userId;
  const { name, budget_amount, icon, color } = req.body;

  if (!name || !budget_amount || budget_amount <= 0) {
    return res.status(400).json({ message: 'Invalid budget data' });
  }

  const stmt = db.prepare(
    'UPDATE budget_categories SET name = ?, budget_amount = ?, icon = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
  );

  stmt.run(name, budget_amount, icon, color, budgetId, userId, function (err) {
    if (err) {
      console.error('Update budget error:', err);
      return res.status(500).json({ message: 'Failed to update budget' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    res.json({ message: 'Budget updated successfully' });
  });
});

// DELETE /api/budgets/:id - Delete a budget category
app.delete('/api/budgets/:id', requireAuth, (req, res) => {
  const budgetId = req.params.id;
  const userId = req.session.userId;

  const stmt = db.prepare('DELETE FROM budget_categories WHERE id = ? AND user_id = ?');

  stmt.run(budgetId, userId, function (err) {
    if (err) {
      console.error('Delete budget error:', err);
      return res.status(500).json({ message: 'Failed to delete budget' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    res.json({ message: 'Budget deleted successfully' });
  });
});

// ---------- PAYMENT REMINDERS ----------

// GET /api/payment-reminders - Get all payment reminders for user
app.get('/api/payment-reminders', requireAuth, (req, res) => {
  const userId = req.session.userId;

  db.all(
    'SELECT id, amount, due_date, description, paid, created_at FROM payment_reminders WHERE user_id = ? ORDER BY due_date ASC',
    [userId],
    (err, reminders) => {
      if (err) {
        console.error('Get payment reminders error:', err);
        return res.status(500).json({ message: 'Failed to fetch payment reminders' });
      }
      res.json(reminders || []);
    }
  );
});

// POST /api/payment-reminders - Create a new payment reminder
app.post('/api/payment-reminders', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { amount, due_date, description } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }

  const stmt = db.prepare(
    'INSERT INTO payment_reminders (user_id, amount, due_date, description) VALUES (?, ?, ?, ?)'
  );

  stmt.run(userId, amount, due_date || null, description || '', function (err) {
    if (err) {
      console.error('Create payment reminder error:', err);
      return res.status(500).json({ message: 'Failed to create payment reminder' });
    }
    res.status(201).json({
      id: this.lastID,
      user_id: userId,
      amount,
      due_date,
      description,
      paid: 0
    });
  });
});

// PUT /api/payment-reminders/:id - Update a payment reminder
app.put('/api/payment-reminders/:id', requireAuth, (req, res) => {
  const reminderId = req.params.id;
  const userId = req.session.userId;
  const { amount, due_date, description, paid } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }

  const stmt = db.prepare(
    'UPDATE payment_reminders SET amount = ?, due_date = ?, description = ?, paid = ? WHERE id = ? AND user_id = ?'
  );

  stmt.run(amount, due_date || null, description || '', paid ? 1 : 0, reminderId, userId, function (err) {
    if (err) {
      console.error('Update payment reminder error:', err);
      return res.status(500).json({ message: 'Failed to update payment reminder' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Payment reminder not found' });
    }
    res.json({ message: 'Payment reminder updated successfully' });
  });
});

// DELETE /api/payment-reminders/:id - Delete a payment reminder
app.delete('/api/payment-reminders/:id', requireAuth, (req, res) => {
  const reminderId = req.params.id;
  const userId = req.session.userId;

  const stmt = db.prepare('DELETE FROM payment_reminders WHERE id = ? AND user_id = ?');

  stmt.run(reminderId, userId, function (err) {
    if (err) {
      console.error('Delete payment reminder error:', err);
      return res.status(500).json({ message: 'Failed to delete payment reminder' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Payment reminder not found' });
    }
    res.json({ message: 'Payment reminder deleted successfully' });
  });
});

// ---------- NOTIFICATIONS ----------

// GET /api/notifications - Get user's notifications
app.get('/api/notifications', requireAuth, (req, res) => {
  const userId = req.session.userId;

  db.all(
    'SELECT id, type, title, message, data, status, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId],
    (err, notifications) => {
      if (err) {
        console.error('Get notifications error:', err);
        return res.status(500).json({ message: 'Failed to fetch notifications' });
      }
      res.json(notifications || []);
    }
  );
});

// POST /api/notifications - Create a notification
app.post('/api/notifications', requireAuth, (req, res) => {
  const { userId, type, title, message, data } = req.body;

  if (!userId || !type || !title || !message) {
    return res.status(400).json({ message: 'userId, type, title, and message are required' });
  }

  const stmt = db.prepare(
    'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)'
  );

  stmt.run(userId, type, title, message, data ? JSON.stringify(data) : null, function (err) {
    if (err) {
      console.error('Create notification error:', err);
      return res.status(500).json({ message: 'Failed to create notification' });
    }

    const notificationId = this.lastID;

    // Send real-time notification via WebSocket
    io.to(`user_${userId}`).emit('notification', {
      id: notificationId,
      type,
      title,
      message,
      data,
      status: 'unread',
      created_at: new Date().toISOString(),
    });

    res.status(201).json({
      id: notificationId,
      user_id: userId,
      type,
      title,
      message,
      data,
      status: 'unread'
    });
  });
});

// PUT /api/notifications/:id/read - Mark notification as read
app.put('/api/notifications/:id/read', requireAuth, (req, res) => {
  const notificationId = req.params.id;
  const userId = req.session.userId;

  db.run(
    'UPDATE notifications SET status = ?, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    ['read', notificationId, userId],
    function (err) {
      if (err) {
        console.error('Mark notification read error:', err);
        return res.status(500).json({ message: 'Failed to mark notification as read' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      res.json({ message: 'Notification marked as read' });
    }
  );
});

// POST /api/notifications/send-payment-reminder - Send payment reminder to user
app.post('/api/notifications/send-payment-reminder', requireAuth, (req, res) => {
  const { targetUserId, amount, description } = req.body;
  const senderId = req.session.userId;

  if (!targetUserId || !amount) {
    return res.status(400).json({ message: 'targetUserId and amount are required' });
  }

  // Get sender's name
  db.get('SELECT username FROM users WHERE id = ?', [senderId], (err, sender) => {
    if (err) {
      console.error('Get sender error:', err);
      return res.status(500).json({ message: 'Failed to get sender info' });
    }

    const title = 'Payment Reminder';
    const message = sender.username + ' is reminding you to pay ₹' + amount.toFixed(2) + (description ? ' for ' + description : '');

    // Create notification
    const stmt = db.prepare(
      'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)'
    );

    stmt.run(targetUserId, 'payment_reminder', title, message, JSON.stringify({ amount, senderId, description }), function (err2) {
      if (err2) {
        console.error('Create payment reminder error:', err2);
        return res.status(500).json({ message: 'Failed to send payment reminder' });
      }

      const notificationId = this.lastID;

      // Send real-time notification
      io.to(`user_${targetUserId}`).emit('notification', {
        id: notificationId,
        type: 'payment_reminder',
        title,
        message,
        data: { amount, senderId, description },
        status: 'unread',
        created_at: new Date().toISOString(),
      });

      res.json({ message: 'Payment reminder sent successfully' });
    });
  });
});

// POST /api/notifications/send-all-reminders - Send reminders to all users with pending payments
app.post('/api/notifications/send-all-reminders', requireAuth, (req, res) => {
  const senderId = req.session.userId;

  // Get all users who owe money to the sender
  db.all(
    `SELECT DISTINCT es.user_id as target_user_id, SUM(es.amount_owed) as total_owed, u.username as sender_name
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     JOIN users u ON u.id = ?
     WHERE e.paid_by = ? AND es.amount_owed > 0
     GROUP BY es.user_id`,
    [senderId, senderId],
    (err, debtors) => {
      if (err) {
        console.error('Get all debtors error:', err);
        return res.status(500).json({ message: 'Failed to get debtors' });
      }

      if (debtors.length === 0) {
        return res.json({ message: 'No pending payments to remind' });
      }

      let sentCount = 0;
      const errors = [];

      debtors.forEach((debtor) => {
        const title = 'Payment Reminder';
        const message = debtor.sender_name + ' is reminding you to pay ₹' + debtor.total_owed.toFixed(2);
        const stmt = db.prepare(
          'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)'
        );

        stmt.run(debtor.target_user_id, 'payment_reminder', title, message, JSON.stringify({
          amount: debtor.total_owed,
          senderId,
          description: 'Outstanding balance'
        }), function (err2) {
          if (err2) {
            console.error('Create bulk reminder error:', err2);
            errors.push(`Failed to send to user ${debtor.target_user_id}`);
          } else {
            sentCount++;

            // Send real-time notification
            io.to(`user_${debtor.target_user_id}`).emit('notification', {
              id: this.lastID,
              type: 'payment_reminder',
              title,
              message,
              data: { amount: debtor.total_owed, senderId, description: 'Outstanding balance' },
              status: 'unread',
              created_at: new Date().toISOString(),
            });
          }

          // Send response when all reminders are processed
          if (sentCount + errors.length === debtors.length) {
            res.json({
              message: `Sent ${sentCount} reminders${errors.length > 0 ? ', ' + errors.length + ' failed' : ''}`,
              sent: sentCount,
              failed: errors.length,
              errors: errors.length > 0 ? errors : undefined
            });
          }
        });
      });
    }
  );
});

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// ---------- START ----------
server.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
