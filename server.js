const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, '')));

// --- DATABASE (SQLite) ---
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Initialize products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      oldPrice INTEGER,
      badge TEXT,
      image TEXT
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        // Check if table is empty, if so, seed it
        db.get("SELECT count(*) as count FROM products", (err, row) => {
          if (row.count === 0) {
            console.log("Seeding initial products into the database...");
            const initialProducts = [
              { name: "Banarasi Silk Saree", price: 3499, oldPrice: 4999, badge: "New", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600" },
              { name: "Bridal Lehenga Set", price: 12999, oldPrice: 15999, badge: "Bestseller", image: "lehenga-cat.png" },
              { name: "Pure Cotton Fabric", price: 450, oldPrice: 600, badge: "Sale", image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=600" },
              { name: "Bridal Aari Work Blouse", price: 2499, oldPrice: 3200, badge: "Handcrafted", image: "arri-work/aari-blouse-1.jpg" },
              { name: "Kanjivaram Silk Saree", price: 6999, oldPrice: 8500, badge: "Trending", image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&q=80&w=600" },
              { name: "Designer Aari Work Blouse", price: 2199, oldPrice: 2800, badge: "Elegant", image: "arri-work/aari-blouse-1.png.jpg" },
              { name: "Chanderi Silk Kurta Set", price: 4299, oldPrice: 5500, badge: "Premium", image: "https://images.unsplash.com/photo-1605462863863-10d9e47e15ee?auto=format&fit=crop&q=80&w=600" },
              { name: "Organza Floral Saree", price: 2899, oldPrice: 3800, badge: "Limited", image: "https://images.unsplash.com/photo-1621012430307-b088bb92dc0e?auto=format&fit=crop&q=80&w=600" }
            ];
            
            const stmt = db.prepare("INSERT INTO products (name, price, oldPrice, badge, image) VALUES (?, ?, ?, ?, ?)");
            initialProducts.forEach(p => {
              stmt.run(p.name, p.price, p.oldPrice, p.badge, p.image);
            });
            stmt.finalize();
          }
        });
      }
    });

    // Initialize users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )`);
  }
});

// --- API ENDPOINTS ---

// GET all products from SQLite
app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET single product by ID from SQLite
app.get('/api/products/:id', (req, res) => {
  db.get("SELECT * FROM products WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(row);
  });
});

// POST register a new user
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, password], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: "Email already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, name, email });
  });
});

// POST login a user
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  db.get("SELECT id, name, email FROM users WHERE email = ? AND password = ?", [email, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    // In a real app, you'd generate a JWT token here. For now, returning user details is fine.
    res.json(row);
  });
});

// POST a new product
app.post('/api/products', (req, res) => {
  const { name, price, oldPrice, badge, image } = req.body;
  db.run("INSERT INTO products (name, price, oldPrice, badge, image) VALUES (?, ?, ?, ?, ?)", 
    [name, price, oldPrice, badge, image], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name, price, oldPrice, badge, image });
  });
});

// PUT update a product
app.put('/api/products/:id', (req, res) => {
  const { name, price, oldPrice, badge, image } = req.body;
  db.run("UPDATE products SET name = ?, price = ?, oldPrice = ?, badge = ?, image = ? WHERE id = ?", 
    [name, price, oldPrice, badge, image, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: req.params.id, name, price, oldPrice, badge, image });
  });
});

// DELETE a product
app.delete('/api/products/:id', (req, res) => {
  db.run("DELETE FROM products WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Product deleted" });
  });
});

// Serve admin.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve index.html for the root route explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
