const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/nexo_db.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    viewAllData();
  }
});

const tables = [
  'users',
  'sqlite_sequence',
  'groups',
  'group_members',
  'expenses',
  'expense_splits',
  'friends',
  'payment_reminders',
  'badges',
  'user_badges',
  'budget_categories'
];

function viewAllData() {
  db.serialize(() => {
    tables.forEach(table => {
      db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
        if (err) {
          console.error(`Error fetching data from ${table}:`, err.message);
        } else {
          console.log(`\n--- Data from ${table} ---`);
          console.table(rows);
        }
      });
    });
  });

  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('\nClose the database connection.');
  });
}
