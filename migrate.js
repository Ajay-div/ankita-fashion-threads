const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.run("ALTER TABLE products ADD COLUMN category TEXT", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Category column already exists.');
      } else {
        console.error('Error adding column:', err.message);
      }
    } else {
      console.log('Category column added successfully.');
    }
  });
  
  // Seed some categories for existing products
  db.run("UPDATE products SET category = 'Sarees' WHERE name LIKE '%Saree%'");
  db.run("UPDATE products SET category = 'Lehengas' WHERE name LIKE '%Lehenga%'");
  db.run("UPDATE products SET category = 'Aari Work' WHERE name LIKE '%Aari%'");
  db.run("UPDATE products SET category = 'Fabrics' WHERE name LIKE '%Fabric%'");
});

db.close();
