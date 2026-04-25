require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// --- SECURITY MIDDLEWARE ---
// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for local development with external Unsplash images
}));

// Rate limiting to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for auth routes
  message: { error: "Too many attempts, please try again after 15 minutes" }
});

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '')));

// --- DATABASE ---
const db = new sqlite3.Database(process.env.DATABASE_URL || './database.sqlite', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Products Table
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      oldPrice INTEGER,
      badge TEXT,
      image TEXT
    )`, (err) => {
      if (!err) {
        db.get("SELECT count(*) as count FROM products", (err, row) => {
          if (row && row.count === 0) {
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
            initialProducts.forEach(p => stmt.run(p.name, p.price, p.oldPrice, p.badge, p.image));
            stmt.finalize();
          }
        });
      }
    });

    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user'
    )`);
  }
});

// --- API ENDPOINTS ---

// GET products
app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

// POST register
app.post('/api/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "All fields are required" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) return res.status(400).json({ error: "Email already exists" });
        return res.status(500).json({ error: "Registration failed" });
      }
      res.status(201).json({ id: this.lastID, name, email });
    });
  } catch (err) {
    res.status(500).json({ error: "Server error during registration" });
  }
});

// POST login
app.post('/api/login', authLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  });
});

// --- PRODUCT CRUD (Admin Access - In real app, add middleware to check user.role) ---
app.post('/api/products', (req, res) => {
  const { name, price, oldPrice, badge, image } = req.body;
  if(!name || !price || !image) return res.status(400).json({ error: "Missing required product data" });
  
  db.run("INSERT INTO products (name, price, oldPrice, badge, image) VALUES (?, ?, ?, ?, ?)", 
    [name, price, oldPrice, badge, image], function(err) {
    if (err) return res.status(500).json({ error: "Failed to create product" });
    res.status(201).json({ id: this.lastID, name, price });
  });
});

app.put('/api/products/:id', (req, res) => {
  const { name, price, oldPrice, badge, image } = req.body;
  db.run("UPDATE products SET name = ?, price = ?, oldPrice = ?, badge = ?, image = ? WHERE id = ?", 
    [name, price, oldPrice, badge, image, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: "Update failed" });
    res.json({ success: true });
  });
});

app.delete('/api/products/:id', (req, res) => {
  db.run("DELETE FROM products WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: "Delete failed" });
    res.json({ message: "Deleted" });
  });
});

// Routes
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Secure server running on port ${PORT}`));
