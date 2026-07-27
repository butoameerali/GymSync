import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Heart, Search, Filter, Plus, Minus, Check, Trash2, PlusCircle } from 'lucide-react';
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

  // Admin / Store Manager Controls
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', category: 'Proteins', price: 29.99, stock: 50, image: '' });

  const debouncedSearch = useDebounce(searchTerm, 300);
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const userRole = localStorage.getItem('gymsync_role') || 'User';
  const isAdmin = userRole === 'Admin' || userRole === 'SuperAdmin' || userRole === 'StoreManager';

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
      }
    } catch (err) {
      toast.error('Error submitting order');
    }
  };

  // Admin Add Product Handler
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/store/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-name': userName },
        body: JSON.stringify({ ...productForm, createdBy: userName })
      });
      if (res.ok) {
        const newP = await res.json();
        setProducts(prev => [newP, ...prev]);
        setIsAddModalOpen(false);
        toast.success('Product added to Store inventory!');
      }
    } catch (err) {
      toast.error('Failed to add product');
    }
  };

  // Admin Remove Product Handler
  const handleRemoveProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to remove ${productName} from the store?`)) return;
    try {
      const res = await fetch(`/api/store/products/${productId}`, {
        method: 'DELETE',
        headers: { 'x-user-name': userName }
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => (p._id || p.id) !== productId));
        toast.info(`${productName} removed from Store.`);
      }
    } catch (err) {
      toast.error('Failed to remove product');
    }
  };

  return (
    <div className="store-page">
      {/* Store Header */}
      <div className="store-header glass-panel">
        <div className="container header-flex">
          <div>
            <h1>GymSync Fitness Store</h1>
            <p>Premium supplements, official gym gear, and high-performance equipment</p>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="search-box">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {isAdmin && (
              <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusCircle size={18} /> Add Product
              </button>
            )}
            
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
              filteredProducts.map(product => {
                const productId = product._id || product.id;
                return (
                  <div key={productId} className="product-card glass-panel">
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
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-primary btn-sm add-to-cart-btn" onClick={() => addToCart(product)}>
                            Add to Cart
                          </button>
                          {isAdmin && (
                            <button 
                              className="btn btn-outline btn-sm" 
                              style={{ color: '#ef4444', borderColor: '#ef4444', padding: '6px' }}
                              title="Remove Product (Admin)"
                              onClick={() => handleRemoveProduct(productId, product.name)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
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

      {/* Admin Add Product Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Store Inventory Product (Admin)">
        <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 600 }}>Product Name</label>
            <input type="text" required className="search-input" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 600 }}>Category</label>
            <select className="search-input" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })}>
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 600 }}>Price ($)</label>
              <input type="number" step="0.01" required className="search-input" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 600 }}>Stock Quantity</label>
              <input type="number" required className="search-input" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', fontWeight: 600 }}>Product Image URL</label>
            <input type="url" required placeholder="https://..." className="search-input" value={productForm.image} onChange={e => setProductForm({ ...productForm, image: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
            Save Product to Store Inventory
          </button>
        </form>
      </Modal>

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
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem' }}>{item.name}</h4>
                    <span style={{ color: 'var(--primary-accent)', fontWeight: 'bold' }}>${item.price.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="btn btn-sm btn-outline" onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button className="btn btn-sm btn-outline" onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="cart-summary" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                <span>Total:</span>
                <span style={{ color: 'var(--primary-accent)' }}>${cartTotal.toFixed(2)}</span>
              </div>
              <button className="btn btn-primary w-100" onClick={() => { setIsCartOpen(false); setIsCheckoutFormOpen(true); }}>
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
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: '600' }}>Shipping Address</label>
            <textarea 
              rows={3} 
              required
              placeholder="Enter full street address, city, state, zip code..." 
              value={shippingAddress} 
              onChange={e => setShippingAddress(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">
            Confirm & Place Order (${cartTotal.toFixed(2)})
          </button>
        </form>
      </Modal>

      {/* Order Confirmation Modal */}
      <Modal isOpen={isOrderConfirmed} onClose={() => setIsOrderConfirmed(false)} title="Order Confirmed!">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Check size={56} color="#10b981" style={{ marginBottom: '16px' }} />
          <h3>Thank you for your order!</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Your fitness items have been reserved and dispatched for delivery.
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
