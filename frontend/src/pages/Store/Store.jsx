import React, { useState } from 'react';
import { ShoppingCart, Heart, Search, Filter, Plus, Minus, X, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import './Store.css';

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Optimum Nutrition Gold Standard 100% Whey",
    category: "Proteins",
    price: 64.99,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=1470&auto=format&fit=crop",
    badge: "Best Seller"
  },
  {
    id: 2,
    name: "GymSync Premium Performance T-Shirt",
    category: "Gym Wear",
    price: 24.99,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1374&auto=format&fit=crop",
    badge: "New"
  },
  {
    id: 3,
    name: "Pro-Grip Lifting Straps",
    category: "Accessories",
    price: 14.99,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=1471&auto=format&fit=crop"
  },
  {
    id: 4,
    name: "C4 Original Pre-Workout",
    category: "Supplements",
    price: 29.99,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?q=80&w=1470&auto=format&fit=crop",
    badge: "Sale"
  },
  {
    id: 5,
    name: "Adjustable Dumbbell Set (50lbs)",
    category: "Equipment",
    price: 199.99,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1638202993928-7267aad84c31?q=80&w=1374&auto=format&fit=crop"
  },
  {
    id: 6,
    name: "GymSync Resistance Bands (Set of 5)",
    category: "Accessories",
    price: 19.99,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1598289431512-b97b0917affc?q=80&w=1474&auto=format&fit=crop"
  }
];

const CATEGORIES = ["All", "Proteins", "Supplements", "Gym Wear", "Accessories", "Equipment"];

const Store = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutFormOpen, setIsCheckoutFormOpen] = useState(false);

  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';

  const filteredProducts = MOCK_PRODUCTS.filter(product => {
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} added to cart!`);
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="store-page">
      {/* Store Header */}
      <div className="store-header glass-panel">
        <div className="container header-content">
          <div className="title-section">
            <h2>GymSync Store</h2>
            <p>Premium supplements, gear, and equipment.</p>
          </div>
          
          <div className="header-actions">
            <div className="search-box">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button className="cart-toggle-btn" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart size={24} />
              {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="container">
        <div className="categories-scroll">
          {CATEGORIES.map(cat => (
            <button 
              key={cat} 
              className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="products-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <div key={product.id} className="product-card glass-panel">
                <div className="product-image-container">
                  <img src={product.image} alt={product.name} className="product-image" />
                  {product.badge && <span className="product-badge">{product.badge}</span>}
                  <button className="wishlist-btn"><Heart size={18} /></button>
                </div>
                
                <div className="product-info">
                  <span className="product-category">{product.category}</span>
                  <h3 className="product-name">{product.name}</h3>
                  <div className="product-footer">
                    <span className="product-price">${product.price.toFixed(2)}</span>
                    <button className="btn btn-primary btn-sm add-to-cart-btn" onClick={() => addToCart(product)}>
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-products">
              <Filter size={48} color="var(--text-secondary)" />
              <h3>No products found</h3>
              <p>Try adjusting your search or category filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Shopping Cart Sidebar Overlay */}
      {isCartOpen && (
        <div className="cart-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-sidebar glass-panel" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h3>Your Cart ({cartItemCount})</h3>
              <button className="close-btn" onClick={() => setIsCartOpen(false)}><X size={24} /></button>
            </div>
            
            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <ShoppingCart size={48} color="var(--text-secondary)" />
                  <p>Your cart is empty.</p>
                  <button className="btn btn-outline" onClick={() => setIsCartOpen(false)}>Continue Shopping</button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <img src={item.image} alt={item.name} className="cart-item-img" />
                    <div className="cart-item-details">
                      <h4>{item.name}</h4>
                      <span className="cart-item-price">${item.price.toFixed(2)}</span>
                      <div className="quantity-controls">
                        <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14}/></button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14}/></button>
                      </div>
                    </div>
                    <button className="remove-item-btn" onClick={() => removeFromCart(item.id)}><X size={18} /></button>
                  </div>
                ))
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="cart-footer">
                <div className="cart-total">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <button className="btn btn-primary w-100 checkout-btn" onClick={() => { setIsCartOpen(false); setIsCheckoutFormOpen(true); }}>
                  Proceed to Checkout <Check size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guest Checkout Modal */}
      {isCheckoutFormOpen && (
        <div className="cart-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '30px', width: '100%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3>{isGuest ? 'Guest Checkout' : 'Secure Checkout'}</h3>
              <button className="close-btn" onClick={() => setIsCheckoutFormOpen(false)}><X size={24} /></button>
            </div>
            
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              toast.success("Order Placed Successfully!"); 
              setCart([]); 
              setIsCheckoutFormOpen(false); 
            }}>
              {isGuest && <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>You are checking out as a Guest. Please provide your shipping details.</p>}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input type="text" placeholder="Full Name" required style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                <input type="email" placeholder="Email Address" required style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                <input type="text" placeholder="Shipping Address" required style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                
                <div style={{ marginTop: '10px' }}>
                  <p style={{ marginBottom: '10px', color: 'var(--text-secondary)' }}>Payment Method</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                    <input type="radio" name="payment" value="cod" defaultChecked onClick={() => document.getElementById('stripe-demo').style.display = 'none'} /> Cash on Delivery (COD)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="radio" name="payment" value="stripe" onClick={() => document.getElementById('stripe-demo').style.display = 'block'} /> Credit Card (Stripe Demo)
                  </label>
                </div>

                {/* Stripe Demo UI Mockup */}
                <div id="stripe-demo" style={{ display: 'none', background: 'white', padding: '15px', borderRadius: '8px', color: 'black', marginTop: '10px', border: '1px solid #e6e6e6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#635bff' }}>stripe</span>
                    <span style={{ fontSize: '0.7rem', background: '#fef0c7', color: '#b54708', padding: '2px 6px', borderRadius: '10px' }}>TEST MODE</span>
                  </div>
                  <input type="text" placeholder="Card number (4242 4242 4242 4242)" style={{ width: '100%', padding: '10px', border: '1px solid #e6e6e6', borderRadius: '5px', marginBottom: '10px', color: 'black', background: 'white' }} />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="MM / YY" style={{ flex: 1, padding: '10px', border: '1px solid #e6e6e6', borderRadius: '5px', color: 'black', background: 'white' }} />
                    <input type="text" placeholder="CVC" style={{ width: '80px', padding: '10px', border: '1px solid #e6e6e6', borderRadius: '5px', color: 'black', background: 'white' }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total: ${cartTotal.toFixed(2)}</span>
                <button type="submit" className="btn btn-success">Pay & Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Store;
