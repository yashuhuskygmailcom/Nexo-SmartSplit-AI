// server/index.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const { createWorker } = require('tesseract.js');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;
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
      group_id INTEGER
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
});

// ---------- MIDDLEWARE ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow frontend (Vite) on 5173 or 5174
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
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

// Just to avoid "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Nexo backend is running ✅');
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

  const sql = `
    SELECT u.id, u.username, u.email
    FROM friends f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ?
  `;

  db.all(sql, [userId], (err, rows) => {
    if (err) {
      console.error('Get friends error:', err);
      return res.status(500).json({ message: 'Failed to fetch friends' });
    }
    res.json(rows);
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
          splits: splitsByExpense[e.id] || [],
        }));

        res.json(result);
      }
    );
  });
});

// POST /api/expenses
app.post('/api/expenses', requireAuth, (req, res) => {
  const { description, amount, date, paid_by, splits, groupId } = req.body || {};

  if (!description || !amount || !date || !paid_by || !Array.isArray(splits) || splits.length === 0) {
    return res.status(400).json({ message: 'Invalid expense data' });
  }

  db.run(
    'INSERT INTO expenses (description, amount, date, paid_by, group_id) VALUES (?, ?, ?, ?, ?)',
    [description, amount, date, paid_by, groupId || null],
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
  const { description, amount, date, paid_by, splits, groupId } = req.body || {};

  db.run(
    `
      UPDATE expenses
      SET description = ?, amount = ?, date = ?, paid_by = ?, group_id = ?
      WHERE id = ?
    `,
    [description, amount, date, paid_by, groupId || null, expenseId],
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

    const extracted = {
      merchantName,
      date,
      total,
      items: [],
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

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
