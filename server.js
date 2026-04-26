require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 8080;

// --- CONFIG & MIDDLEWARE ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Image Upload Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts, please try again later" }
});

// --- DATABASE ---
const db = new sqlite3.Database(process.env.DATABASE_URL || './database.sqlite', (err) => {
  if (!err) {
    console.log('Connected to SQLite.');
    
    // Products
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      oldPrice INTEGER,
      badge TEXT,
      category TEXT,
      image TEXT
    )`);

    // Users
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user'
    )`);

    // Orders (Bookings)
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT,
      items TEXT NOT NULL,
      total INTEGER NOT NULL,
      status TEXT DEFAULT 'Pending',
      details TEXT,
      appointment_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Reviews
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// --- EMAIL SETUP ---
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to your email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- API ENDPOINTS ---

// GET Products (with search and category filter)
app.get('/api/products', (req, res) => {
  const { category, search } = req.query;
  let query = "SELECT * FROM products WHERE 1=1";
  let params = [];

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }
  if (search) {
    query += " AND name LIKE ?";
    params.push(`%${search}%`);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "DB Error" });
    res.json(rows);
  });
});

// AUTH
app.post('/api/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashed], function(err) {
    if (err) return res.status(400).json({ error: "Email exists" });
    res.status(201).json({ id: this.lastID, name, email });
  });
});

app.post('/api/login', authLimiter, (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  });
});

// ORDERS
app.post('/api/orders', (req, res) => {
  const { email, items, total, name, details } = req.body;
  db.run("INSERT INTO orders (user_email, items, total, details, appointment_date) VALUES (?, ?, ?, ?, ?)", 
    [email, JSON.stringify(items), total, JSON.stringify(details), details?.apptDate], async function(err) {
    if (err) return res.status(500).json({ error: "Order failed" });
    
    // SEND EMAIL NOTIFICATION
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Stitching Booking Request - Ankita Fashion Threads',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #d4af37; background: #fff; color: #333;">
          <h2 style="color: #d4af37;">Booking Request Received, ${name || 'Customer'}!</h2>
          <p>We have received your request for <b>Custom Stitching #${this.lastID}</b>.</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Service Details:</h3>
            <p><b>Blouse Type:</b> ${details?.blouseType || 'Not specified'}</p>
            <p><b>Neck Style:</b> ${details?.neckStyle || 'Not specified'}</p>
            <p><b>Sleeve Style:</b> ${details?.sleeveStyle || 'Not specified'}</p>
            <p><b>Appointment Date:</b> ${details?.apptDate || 'To be scheduled'}</p>
            <p><b>Estimated Total:</b> ₹${total.toLocaleString()}</p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #eee;">
          <p>Our designer will contact you shortly to confirm your appointment and discuss further customization.</p>
          <p>Best Regards,<br><b>Ankita Fashion Threads Team</b></p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.log("Email Error:", error);
    });

    res.status(201).json({ id: this.lastID });
  });
});

// REVIEWS
app.post('/api/reviews', (req, res) => {
  const { productId, name, rating, comment } = req.body;
  db.run("INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)",
    [productId, name, rating, comment], function(err) {
      if (err) return res.status(500).json({ error: "Review failed" });
      res.status(201).json({ success: true });
    });
});

app.get('/api/reviews/:productId', (req, res) => {
  db.all("SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC", 
    [req.params.productId], (err, rows) => {
      res.json(rows);
    });
});

app.get('/api/orders', (req, res) => {
  db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, rows) => {
    res.json(rows);
  });
});

// IMAGE UPLOAD
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  res.json({ filePath: `/uploads/${req.file.filename}` });
});

// PRODUCT CRUD
app.post('/api/products', (req, res) => {
  const { name, price, oldPrice, badge, category, image } = req.body;
  db.run("INSERT INTO products (name, price, oldPrice, badge, category, image) VALUES (?, ?, ?, ?, ?, ?)",
    [name, price, oldPrice, badge, category, image], function(err) {
      res.status(201).json({ id: this.lastID });
  });
});

app.put('/api/products/:id', (req, res) => {
  const { name, price, oldPrice, badge, category, image } = req.body;
  db.run("UPDATE products SET name=?, price=?, oldPrice=?, badge=?, category=?, image=? WHERE id=?",
    [name, price, oldPrice, badge, category, image, req.params.id], () => res.json({ success: true }));
});

app.delete('/api/products/:id', (req, res) => {
  db.run("DELETE FROM products WHERE id=?", [req.params.id], () => res.json({ success: true }));
});

// ADMIN STATS
app.get('/api/stats', (req, res) => {
  db.get("SELECT COUNT(*) as products, (SELECT COUNT(*) FROM users) as users, (SELECT COUNT(*) FROM orders) as orders, (SELECT SUM(total) FROM orders) as revenue FROM products", (err, row) => {
    res.json(row);
  });
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Secure server running on port ${PORT}`));
