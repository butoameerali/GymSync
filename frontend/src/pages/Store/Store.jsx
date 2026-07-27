import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Heart, Search, Filter, Plus, Minus, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { useDebounce } from '../../hooks/useDebounce';
import Modal from '../../components/common/Modal';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import './Store.css';

const CATEGORIES = ["All", "Proteins", "Supplements", "Gym Wear", "Accessories", "Equipment"];

const Store = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutFormOpen, setIsCheckoutFormOpen] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');

  const debouncedSearch = useDebounce(searchTerm, 300);
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest User';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/store/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Error fetching store products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = activeCategory === "All" || product.category === activeCategory;
      const matchesSearch = product.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, debouncedSearch]);

  const addToCart = (product) => {
    const id = product._id || product.id;
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) {
        return prev.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id, name: product.name, price: product.price, image: product.image, quantity: 1 }];
    });
    toast.success(`${product.name} added to cart!`);
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

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!shippingAddress.trim()) {
      toast.error('Please enter a valid shipping address');
      return;
    }

    try {
      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName,
          items: cart.map(i => ({ productId: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          totalAmount: cartTotal,
          shippingAddress: shippingAddress.trim()
        })
      });

      if (res.ok) {
        setIsCheckoutFormOpen(false);
        setIsOrderConfirmed(true);
        setCart([]);
        toast.success('Order placed successfully!');
      } else {
        toast.error('Failed to submit order');
      }
    } catch (err) {
      toast.error('Error processing order checkout');
    }
  };

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
        {loading ? (
          <div className="products-grid">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="glass-panel" style={{ padding: '20px' }}>
                <SkeletonLoader height="160px" borderRadius="12px" />
                <div style={{ marginTop: '15px' }}>
                  <SkeletonLoader height="18px" width="80%" />
                  <div style={{ marginTop: '10px' }}>
                    <SkeletonLoader height="14px" width="40%" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <div key={product._id || product.id} className="product-card glass-panel">
                  <div className="product-image-container">
                    <img src={product.image} alt={product.name} loading="lazy" className="product-image" />
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
        )}
      </div>

      {/* Shopping Cart Modal */}
      <Modal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} title={`Your Cart (${cartItemCount})`}>
        {cart.length === 0 ? (
          <div className="empty-cart" style={{ textAlign: 'center', padding: '20px' }}>
            <ShoppingCart size={48} color="var(--text-secondary)" style={{ marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Your cart is empty.</p>
            <button className="btn btn-outline" onClick={() => setIsCartOpen(false)}>Continue Shopping</button>
          </div>
        ) : (
          <div>
            <div className="cart-items" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {cart.map(item => (
                <div key={item.id} className="cart-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <img src={item.image} alt={item.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.95rem', margin: 0 }}>{item.name}</h4>
                    <span style={{ color: 'var(--primary-accent)', fontSize: '0.9rem', fontWeight: 600 }}>${item.price.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total: </span>
                <strong style={{ fontSize: '1.25rem', color: '#fff' }}>${cartTotal.toFixed(2)}</strong>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckoutFormOpen(true);
                }}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Checkout Form Modal */}
      <Modal isOpen={isCheckoutFormOpen} onClose={() => setIsCheckoutFormOpen(false)} title="Complete Your Order">
        <form onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Shipping Address</label>
            <input 
              type="text" 
              required 
              placeholder="123 Main St, City, Country" 
              className="search-input"
              value={shippingAddress}
              onChange={e => setShippingAddress(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Payment Card Number (Demo)</label>
            <input type="text" required placeholder="•••• •••• •••• 4242" className="search-input" />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Expiry</label>
              <input type="text" required placeholder="MM/YY" className="search-input" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>CVC</label>
              <input type="text" required placeholder="123" className="search-input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
            Pay ${cartTotal.toFixed(2)} & Place Order
          </button>
        </form>
      </Modal>

      {/* Order Confirmation Modal */}
      <Modal isOpen={isOrderConfirmed} onClose={() => setIsOrderConfirmed(false)} title="Order Confirmed!">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Check size={32} color="#10b981" />
          </div>
          <h3>Thank you for your order!</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '24px' }}>
            Your order has been recorded and will be processed by our Store Manager team.
          </p>
          <button className="btn btn-primary" onClick={() => setIsOrderConfirmed(false)}>
            Back to Store
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Store;
