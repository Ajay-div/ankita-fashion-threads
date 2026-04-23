// REAL PRODUCT DATA
const products = [
  {
    id: 1,
    name: "Banarasi Silk Saree",
    price: 3499,
    oldPrice: 4999,
    badge: "New",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 2,
    name: "Bridal Lehenga Set",
    price: 12999,
    oldPrice: 15999,
    badge: "Bestseller",
    image: "lehenga-cat.png"
  },
  {
    id: 3,
    name: "Pure Cotton Fabric",
    price: 450,
    oldPrice: 600,
    badge: "Sale",
    image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 4,
    name: "Bridal Aari Work Blouse",
    price: 2499,
    oldPrice: 3200,
    badge: "Handcrafted",
    image: "arri-work/aari-blouse-1.jpg"
  },
  {
    id: 5,
    name: "Kanjivaram Silk Saree",
    price: 6999,
    oldPrice: 8500,
    badge: "Trending",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 6,
    name: "Designer Aari Work Blouse",
    price: 2199,
    oldPrice: 2800,
    badge: "Elegant",
    image: "arri-work/aari-blouse-1.png.jpg"
  },
  {
    id: 7,
    name: "Chanderi Silk Kurta Set",
    price: 4299,
    oldPrice: 5500,
    badge: "Premium",
    image: "https://images.unsplash.com/photo-1605462863863-10d9e47e15ee?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 8,
    name: "Organza Floral Saree",
    price: 2899,
    oldPrice: 3800,
    badge: "Limited",
    image: "https://images.unsplash.com/photo-1621012430307-b088bb92dc0e?auto=format&fit=crop&q=80&w=600"
  }
];

// STATE MANAGEMENT
let cart = JSON.parse(localStorage.getItem('ankita_cart')) || [];
let isDarkMode = localStorage.getItem('ankita_theme') === 'dark';

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

// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
  // Skeleton loader simulation
  setTimeout(() => {
    renderProducts();
  }, 1200);
  
  updateCartUI();
  applyTheme();
});

// RENDER PRODUCTS
function renderProducts() {
  if (!productGrid) return;
  productGrid.innerHTML = '';
  
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
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
        <button class="btn-add-cart" onclick="addToCart(${product.id})">Add to Bag</button>
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
  // Update badges
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCountBadge.textContent = totalItems;
  cartItemCountLabel.textContent = totalItems;
  
  // Render items
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
  
  // Update totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  cartSubtotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  cartGrandTotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
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

function closeCart() {
  cartSidebar.classList.remove('open');
  cartOverlay.classList.remove('open');
  document.body.style.overflow = 'auto';
}

// EVENTS
cartBtn.addEventListener('click', openCart);
closeCart.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

// THEME TOGGLE
themeToggle.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  applyTheme();
  localStorage.setItem('ankita_theme', isDarkMode ? 'dark' : 'light');
});

function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  themeToggle.querySelector('i').className = isDarkMode ? 'ri-sun-line' : 'ri-moon-line';
}

// SCROLL TO TOP
window.addEventListener('scroll', () => {
  if (window.scrollY > 600) {
    scrollTopBtn.classList.add('visible');
  } else {
    scrollTopBtn.classList.remove('visible');
  }
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

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
          // Re-using the card creation logic (simplified here)
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
