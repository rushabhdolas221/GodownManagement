const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const MongoStore = require('connect-mongo');

const User = require('./models/User');
const Product = require('./models/Product');

const app = express();

// ================= DATABASE =================
mongoose.connect('mongodb://127.0.0.1:27017/godownDB')
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Connection Error:", err));

// ================= MIDDLEWARE =================
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: 'godownSecretKey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb://127.0.0.1:27017/godownDB'
  })
}));

// ================= AUTH MIDDLEWARE =================
function isLoggedIn(req, res, next) {
  if (req.session.userId) return next();
  res.redirect('/login');
}

// ================= ROUTES =================

app.get('/', (req, res) => res.redirect('/login'));

// -------- REGISTER --------
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);

  await User.create({
    name: req.body.name,
    email: req.body.email,
    password: hashed
  });

  res.redirect('/login');
});

// -------- LOGIN --------
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.redirect('/login');

  const match = await bcrypt.compare(req.body.password, user.password);
  if (!match) return res.redirect('/login');

  req.session.userId = user._id;
  res.redirect('/dashboard');
});

// -------- LOGOUT --------
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// -------- DASHBOARD --------
app.get('/dashboard', isLoggedIn, async (req, res) => {

  const totalProducts = await Product.countDocuments();
  const products = await Product.find();

  let totalStock = 0;
  let lowStock = 0;

  products.forEach(p => {
    totalStock += p.quantity;
    if (p.quantity < p.reorderLevel) lowStock++;
  });

  res.render('dashboard', {
    totalProducts,
    totalStock,
    lowStock,
    active: 'dashboard'
  });
});

// -------- PRODUCTS --------
app.get('/products', isLoggedIn, async (req, res) => {

  const search = req.query.search || "";

  const products = await Product.find({
    name: { $regex: search, $options: 'i' }
  });

  res.render('products', {
    products,
    active: 'products'
  });
});

// -------- ADD PRODUCT --------
app.post('/add-product', isLoggedIn, async (req, res) => {
  await Product.create({
    name: req.body.name,
    category: req.body.category,
    price: req.body.price,
    reorderLevel: req.body.reorderLevel,
    quantity: 0
  });

  res.redirect('/products');
});

// -------- STOCK IN --------
app.post('/stock-in/:id', isLoggedIn, async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, {
    $inc: { quantity: Number(req.body.quantity) }
  });

  res.redirect('/products');
});

// -------- STOCK OUT --------
app.post('/stock-out/:id', isLoggedIn, async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, {
    $inc: { quantity: -Number(req.body.quantity) }
  });

  res.redirect('/products');
});

// -------- DELETE PRODUCT --------
app.post('/delete-product/:id', isLoggedIn, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.redirect('/products');
});

// -------- EDIT PRODUCT PAGE --------
app.get('/edit-product/:id', isLoggedIn, async (req, res) => {
  const product = await Product.findById(req.params.id);

  res.render('edit-product', {
    product,
    active: 'products'
  });
});

// -------- UPDATE PRODUCT --------
app.post('/update-product/:id', isLoggedIn, async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, {
    name: req.body.name,
    category: req.body.category,
    price: req.body.price,
    reorderLevel: req.body.reorderLevel
  });

  res.redirect('/products');
});

// ================= SERVER =================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});