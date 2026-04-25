// REAL PRODUCT DATA (Now fetched from backend API)
let products = [];

// PRODUCT DETAIL MODAL & REVIEWS
const detailModal = document.getElementById('productDetailModal');
let selectedProductId = null;
let currentRating = 0;

function openProductModal(id) {
  const p = products.find(prod => prod.id === id);
  if(!p) return;
  selectedProductId = id;
  document.getElementById('detailImg').src = p.image;
  document.getElementById('detailName').innerText = p.name;
  document.getElementById('detailPrice').innerText = `₹${p.price.toLocaleString()}`;
  detailModal.classList.add('active');
  fetchReviews(id);
}

function closeProductModal() {
  detailModal.classList.remove('active');
}

async function fetchReviews(productId) {
  const res = await fetch(`/api/reviews/${productId}`);
  const reviews = await res.json();
  const list = document.getElementById('reviewsList');
  const avg = document.getElementById('avgRating');
  
  if(reviews.length === 0) {
    list.innerHTML = '<p style="color:var(--text-secondary); font-size:0.9rem;">No reviews yet. Be the first!</p>';
    avg.innerText = '0 ★';
    return;
  }

  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  avg.innerText = `${(totalRating / reviews.length).toFixed(1)} ★`;
  
  list.innerHTML = reviews.map(r => `
    <div style="border-bottom: 1px solid #222; padding: 10px 0;">
      <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:5px;">
        <span style="font-weight:600; color:var(--accent);">${r.user_name}</span>
        <span style="color:var(--accent);">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
      </div>
      <p style="font-size:0.9rem;">${r.comment}</p>
    </div>
  `).join('');
}

// Star Rating Interaction
document.querySelectorAll('.star').forEach(star => {
  star.onclick = (e) => {
    currentRating = parseInt(e.target.dataset.val);
    document.querySelectorAll('.star').forEach((s, idx) => {
      if(idx < currentRating) {
        s.classList.replace('ri-star-line', 'ri-star-fill');
      } else {
        s.classList.replace('ri-star-fill', 'ri-star-line');
      }
    });
  };
});

// Review Submission
document.getElementById('reviewForm').onsubmit = async (e) => {
  e.preventDefault();
  if(!currentUser) {
    alert("Please login to leave a review.");
    openLogin();
    return;
  }
  if(currentRating === 0) {
    alert("Please select a rating.");
    return;
  }

  const comment = document.getElementById('reviewText').value;
  const res = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: selectedProductId,
      name: currentUser.name,
      rating: currentRating,
      comment: comment
    })
  });

  if(res.ok) {
    document.getElementById('reviewText').value = '';
    currentRating = 0;
    document.querySelectorAll('.star').forEach(s => s.classList.replace('ri-star-fill', 'ri-star-line'));
    fetchReviews(selectedProductId);
  }
};

// SEARCH & FILTER
const searchInput = document.querySelector('.nav-search input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    fetchProducts('', e.target.value);
  });
}

function filterByCategory(category) {
  fetchProducts(category);
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// CHECKOUT LOGIC
const checkoutBtn = document.querySelector('.btn-checkout');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', async () => {
    if (!currentUser) {
      alert("Please login to complete your order.");
      openLogin();
      return;
    }
    if (cart.length === 0) {
      alert("Your bag is empty!");
      return;
    }

    checkoutBtn.disabled = true;
    checkoutBtn.innerText = "Processing...";

    try {
      const bookingDetails = {
        blouseType: document.getElementById('blouseType').value,
        neckStyle: document.getElementById('neckStyle').value,
        sleeveStyle: document.getElementById('sleeveStyle').value,
        apptDate: document.getElementById('apptDate').value
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          name: currentUser.name,
          items: cart,
          total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          details: bookingDetails
        })
      });

      if (res.ok) {
        alert("Booking request placed! We will contact you shortly for measurements.");
        cart = [];
        localStorage.removeItem('ankita_cart');
        updateCartUI();
        closeCartFunc();
      } else {
        alert("Failed to place order. Please try again.");
      }
    } catch (err) {
      alert("Server error. Please try again.");
    } finally {
      checkoutBtn.disabled = false;
      checkoutBtn.innerText = "Secure Checkout";
    }
  });
}



// STATE MANAGEMENT
let cart = JSON.parse(localStorage.getItem('ankita_cart')) || [];
let isDarkMode = true;
let currentUser = JSON.parse(localStorage.getItem('ankita_user')) || null;

// DOM ELEMENTS
const productGrid = document.getElementById('productGrid');
const cartBtn = document.getElementById('cartBtn');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const closeCart = document.getElementById('closeCart');
const cartItemsList = document.getElementById('cartItemsList');
const cartCountBadge = document.querySelector('.cart-count');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartGrandTotal = document.getElementById('cartGrandTotal');
const cartItemCountLabel = document.getElementById('cartItemCount');
const themeToggle = document.getElementById('themeToggle');
const scrollTopBtn = document.getElementById('scrollTop');

// LOGIN MODAL ELEMENTS
const userBtn = document.getElementById('userBtn');
const loginModal = document.getElementById('loginModal');
const loginModalOverlay = document.getElementById('loginModalOverlay');
const closeLogin = document.getElementById('closeLogin');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const userNameDisplay = document.getElementById('userNameDisplay');

// REGISTER ELEMENTS
const registerForm = document.getElementById('registerForm');
const registerError = document.getElementById('registerError');
const loginContent = document.getElementById('loginContent');
const registerContent = document.getElementById('registerContent');
const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn = document.getElementById('showLogin');

// MOBILE MENU ELEMENTS
const menuTrigger = document.querySelector('.mobile-menu-trigger');
const mobileMenu = document.getElementById('mobileMenu');
const menuOverlay = document.getElementById('menuOverlay');
const closeMenuBtn = document.getElementById('closeMenu');

// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
  // Skeleton loader simulation & API fetch
  setTimeout(() => {
    fetchProducts();
  }, 1200);
  
  updateCartUI();

  updateAuthUI();
});

// AUTH UI UPDATE
function updateAuthUI() {
  if (currentUser) {
    userNameDisplay.textContent = currentUser.name;
    userNameDisplay.style.display = 'inline';
    userBtn.title = `Logged in as ${currentUser.name} (Click to Logout)`;
  } else {
    userNameDisplay.style.display = 'none';
    userBtn.title = "Account";
  }
}

// LOGIN LOGIC
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;
    
    const submitBtn = loginForm.querySelector('.btn-login');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Authenticating...';
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        currentUser = data;
        localStorage.setItem('ankita_user', JSON.stringify(currentUser));
        updateAuthUI();
        closeLoginFunc();
        loginError.style.display = 'none';
        loginForm.reset();
        alert(`Welcome back, ${data.name}!`);
      } else {
        loginError.textContent = data.error || "Invalid email or password.";
        loginError.style.display = 'block';
      }
    } catch (err) {
      loginError.textContent = "Server error. Please try again later.";
      loginError.style.display = 'block';
    } finally {
      submitBtn.textContent = originalText;
    }
  });
}

// REGISTER LOGIC
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = registerForm.querySelector('input[name="name"]').value;
    const email = registerForm.querySelector('input[name="email"]').value;
    const password = registerForm.querySelector('input[name="password"]').value;
    
    const submitBtn = registerForm.querySelector('.btn-login');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Creating...';
    
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        currentUser = data;
        localStorage.setItem('ankita_user', JSON.stringify(currentUser));
        updateAuthUI();
        closeLoginFunc();
        registerError.style.display = 'none';
        registerForm.reset();
        alert(`Account created successfully! Welcome, ${data.name}!`);
      } else {
        registerError.textContent = data.error || "Registration failed.";
        registerError.style.display = 'block';
      }
    } catch (err) {
      registerError.textContent = "Server error. Please try again later.";
      registerError.style.display = 'block';
    } finally {
      submitBtn.textContent = originalText;
    }
  });
}

// TOGGLE LOGIN/REGISTER VIEWS
if (showRegisterBtn) {
  showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginContent.style.display = 'none';
    registerContent.style.display = 'block';
    loginError.style.display = 'none';
  });
}

if (showLoginBtn) {
  showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerContent.style.display = 'none';
    loginContent.style.display = 'block';
    registerError.style.display = 'none';
  });
}

// LOGOUT LOGIC
userBtn.addEventListener('click', () => {
  if (currentUser) {
    if (confirm(`Do you want to logout, ${currentUser.name}?`)) {
      currentUser = null;
      localStorage.removeItem('ankita_user');
      updateAuthUI();
      alert("You have been logged out.");
    }
  } else {
    openLogin();
  }
});

// RENDER PRODUCTS
function renderProducts() {
  if (!productGrid) return;
  productGrid.innerHTML = '';
  
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = (e) => {
      if(e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
        openProductModal(product.id);
      }
    };
    
    card.innerHTML = `
      <div class="product-img-wrapper">
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        <button class="product-wishlist"><i class="ri-heart-line"></i></button>
        <img src="${product.image}" alt="${product.name}" loading="lazy">
      </div>
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <div class="product-price-row">
          <span class="price-current">₹${product.price.toLocaleString('en-IN')}</span>
          ${product.oldPrice ? `<span class="price-old">₹${product.oldPrice.toLocaleString('en-IN')}</span>` : ''}
        </div>
        <button class="btn-add-cart" onclick="addToCart(${product.id})">Add to Booking</button>
      </div>
    `;
    productGrid.appendChild(card);
  });
}

// CART LOGIC
function addToCart(productId) {
  const existingItem = cart.find(item => item.id === productId);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    const product = products.find(p => p.id === productId);
    cart.push({ ...product, quantity: 1 });
  }
  
  saveCart();
  updateCartUI();
  openCart();
}

function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartCountBadge) cartCountBadge.textContent = totalItems;
  if (cartItemCountLabel) cartItemCountLabel.textContent = totalItems;
  
  if (cartItemsList) {
    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div style="text-align:center; padding:100px 0; color:var(--text-secondary);">
          <i class="ri-shopping-bag-line" style="font-size:3rem; margin-bottom:20px; display:block;"></i>
          <p>Your shopping bag is empty.</p>
        </div>
      `;
    } else {
      cartItemsList.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.image}" class="cart-item-img" alt="${item.name}">
          <div class="cart-item-info">
            <div>
              <h4 class="cart-item-name">${item.name}</h4>
              <p class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</p>
            </div>
            <div class="cart-item-controls">
              <div class="qty-control">
                <button class="qty-btn" onclick="updateQty(${item.id}, -1)"><i class="ri-subtract-line"></i></button>
                <span class="qty-num">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQty(${item.id}, 1)"><i class="ri-add-line"></i></button>
              </div>
              <button class="remove-item" onclick="removeFromCart(${item.id})">Remove</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  if (cartSubtotal) cartSubtotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  if (cartGrandTotal) cartGrandTotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
}

function updateQty(productId, change) {
  const item = cart.find(i => i.id === productId);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      saveCart();
      updateCartUI();
    }
  }
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('ankita_cart', JSON.stringify(cart));
}

function openCart() {
  cartSidebar.classList.add('open');
  cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCartFunc() {
  cartSidebar.classList.remove('open');
  cartOverlay.classList.remove('open');
  document.body.style.overflow = 'auto';
}

// LOGIN MODAL LOGIC
function openLogin() {
  loginModal.classList.add('open');
  loginModalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLoginFunc() {
  loginModal.classList.remove('open');
  loginModalOverlay.classList.remove('open');
  document.body.style.overflow = 'auto';
}

// MOBILE MENU LOGIC
function openMenu() {
  mobileMenu.classList.add('open');
  menuOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  mobileMenu.classList.remove('open');
  menuOverlay.classList.remove('open');
  document.body.style.overflow = 'auto';
}

// SIMULATED BACKEND: CHECKOUT
const checkoutBtn = document.querySelector('.btn-checkout');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
      alert('Your bag is empty!');
      return;
    }
    checkoutBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Processing...';
    setTimeout(() => {
      alert('Order Placed Successfully! Simulated backend processed your request.');
      cart = [];
      saveCart();
      updateCartUI();
      closeCartFunc();
      checkoutBtn.innerHTML = 'Secure Checkout <i class="ri-lock-2-line"></i>';
    }, 2000);
  });
}

// EVENTS
if (cartBtn) cartBtn.addEventListener('click', openCart);
if (closeCart) closeCart.addEventListener('click', closeCartFunc);
if (cartOverlay) cartOverlay.addEventListener('click', closeCartFunc);

if (closeLogin) closeLogin.addEventListener('click', closeLoginFunc);
if (loginModalOverlay) loginModalOverlay.addEventListener('click', closeLoginFunc);

if (menuTrigger) menuTrigger.addEventListener('click', openMenu);
if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);
if (menuOverlay) menuOverlay.addEventListener('click', closeMenu);

document.querySelectorAll('.menu-link').forEach(link => {
  link.addEventListener('click', closeMenu);
});



// SCROLL TO TOP
window.addEventListener('scroll', () => {
  if (scrollTopBtn) {
    if (window.scrollY > 600) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }
});

if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// SEARCH SIMULATION
const searchInput = document.querySelector('.nav-search input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    if (term.length > 2) {
      const filtered = products.filter(p => p.name.toLowerCase().includes(term));
      productGrid.innerHTML = '';
      if (filtered.length > 0) {
        filtered.forEach(p => {
          const card = document.createElement('div');
          card.className = 'product-card';
          card.innerHTML = `<div class="product-img-wrapper"><img src="${p.image}"></div><div class="product-info"><h3 class="product-name">${p.name}</h3><div class="product-price-row"><span class="price-current">₹${p.price.toLocaleString()}</span></div><button class="btn-add-cart" onclick="addToCart(${p.id})">Add to Bag</button></div>`;
          productGrid.appendChild(card);
        });
      } else {
        productGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:100px 0;">No products found for "' + term + '"</div>';
      }
    } else if (term.length === 0) {
      renderProducts();
    }
  });
}
