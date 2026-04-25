const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.run("ALTER TABLE orders ADD COLUMN details TEXT", (err) => {
    if (err) console.log('Details column might already exist');
  });
  db.run("ALTER TABLE orders ADD COLUMN appointment_date TEXT", (err) => {
    if (err) console.log('Appointment_date column might already exist');
  });
});

db.close();
