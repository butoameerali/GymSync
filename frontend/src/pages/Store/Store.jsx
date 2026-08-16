import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Heart, Search, Filter, Plus, Minus, Check, Trash2, PlusCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useDebounce } from '../../hooks/useDebounce';
import Modal from '../../components/common/Modal';
import PaymentModal from '../../components/common/PaymentModal';
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
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderPayment, setLastOrderPayment] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [adminOrders, setAdminOrders] = useState([]);
  const [isAdminOrdersOpen, setIsAdminOrdersOpen] = useState(false);

  // Admin / Store Manager Controls
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', category: 'Proteins', price: 29.99, stock: 50, image: '' });

  const debouncedSearch = useDebounce(searchTerm, 300);
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const userRole = localStorage.getItem('gymsync_role') || 'User';
  const authToken = localStorage.getItem('gymsync_token');
  const isAdmin = userRole === 'Admin' || userRole === 'SuperAdmin' || userRole === 'StoreManager';

  useEffect(() => {
    fetchProducts();
    if (authToken) fetchMyOrders();
    if (isAdmin && authToken) fetchAdminOrders();
  }, []);

  const fetchMyOrders = async () => {
    try {
      const res = await fetch('/api/store/orders/mine', { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) setMyOrders(await res.json());
    } catch (err) { console.error('Unable to load orders', err); }
  };

  const fetchAdminOrders = async () => {
    try {
      const res = await fetch('/api/store/orders', { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) setAdminOrders(await res.json());
    } catch (err) { console.error('Unable to load store orders', err); }
  };

  const manageOrder = async (order) => {
    const orderStatus = window.prompt('Order status: Pending, Processing, Shipped, Delivered, Cancelled', order.orderStatus);
    if (orderStatus === null) return;
    const courierName = window.prompt('Courier name', order.courierName || '');
    if (courierName === null) return;
    const trackingNumber = window.prompt('Tracking number', order.trackingNumber || '');
    if (trackingNumber === null) return;
    const estimatedDeliveryDate = window.prompt('Estimated delivery date (YYYY-MM-DD)', order.estimatedDeliveryDate ? order.estimatedDeliveryDate.slice(0, 10) : '');
    if (estimatedDeliveryDate === null) return;
    try {
      const res = await fetch(`/api/store/orders/${order._id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ orderStatus, courierName, trackingNumber, estimatedDeliveryDate, handledBy: userName }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.message);
      toast.success('Delivery details updated'); fetchAdminOrders();
    } catch (error) { toast.error(error.message || 'Could not update order'); }
  };

  const reviewRefund = async (order, refundStatus) => {
    try {
      const res = await fetch(`/api/store/orders/${order._id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ orderStatus: order.orderStatus, refundStatus, handledBy: userName }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.message);
      toast.success(`Refund ${refundStatus.toLowerCase()}`); fetchAdminOrders();
    } catch (error) { toast.error(error.message || 'Could not review refund'); }
  };

  const cancelOrder = async (order) => {
    if (!window.confirm(`Cancel order ${order.orderId}?`)) return;
    try {
      const res = await fetch(`/api/store/orders/${order._id}/cancel`, { method: 'PUT', headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Order cancelled');
      fetchMyOrders();
    } catch (error) { toast.error(error.message || 'Could not cancel order'); }
  };

  const requestRefund = async (order) => {
    const reason = window.prompt('Why are you requesting a refund?');
    if (reason === null) return;
    try {
      const res = await fetch(`/api/store/orders/${order._id}/refund`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ reason }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Refund request submitted');
      fetchMyOrders();
    } catch (error) { toast.error(error.message || 'Could not request refund'); }
  };

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
    if (!authToken) {
      toast.error('Please log in before placing an order.');
      return;
    }
    if (!shippingAddress.trim()) {
      toast.error('Please enter a valid shipping address');
      return;
    }

    setIsCheckoutFormOpen(false);
    setIsPaymentModalOpen(true);
  };

  const handleOrderFromPayment = async (paymentData) => {
    if (!paymentData) return;

    setLastOrderPayment(paymentData);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          totalAmount: cartTotal,
          shippingAddress: shippingAddress.trim(),
          paymentId: paymentData._id || paymentData.paymentId
        })
      });

      if (res.ok) {
        await res.json();
        setCart([]);
        setShippingAddress('');
        setIsCartOpen(false);
        setIsOrderConfirmed(true);
        fetchMyOrders();
        // The confirmation modal below is the only success/status message for checkout.
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || 'Failed to place order. Please try again.');
      }
    } catch (err) {
      toast.error('Error submitting order. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Add Product Handler
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/store/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken || ''}` },
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
        headers: { 'Authorization': `Bearer ${authToken || ''}` }
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
            {isAdmin && <button className="btn btn-outline" onClick={() => { fetchAdminOrders(); setIsAdminOrdersOpen(true); }}>Manage Orders</button>}

            {authToken && <button className="btn btn-outline" onClick={() => { fetchMyOrders(); setIsOrdersOpen(true); }}>My Orders</button>}
            
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
      <Modal isOpen={isAdminOrdersOpen} onClose={() => setIsAdminOrdersOpen(false)} title="Manage Store Orders">
        <div style={{ display: 'grid', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
          {adminOrders.map(order => <div key={order._id} className="glass-panel" style={{ padding: '14px' }}>
            <strong>{order.orderId} · {order.userName}</strong><p style={{ margin: '6px 0', fontSize: '.85rem' }}>{order.orderStatus} · {order.refundStatus === 'Requested' ? `Refund requested: ${order.refundReason || 'No reason given'}` : `Refund: ${order.refundStatus}`}</p>
            <button className="btn btn-outline btn-sm" onClick={() => manageOrder(order)}>Delivery / Status</button>
            {order.refundStatus === 'Requested' && <span style={{ marginLeft: '8px' }}><button className="btn btn-primary btn-sm" onClick={() => reviewRefund(order, 'Approved')}>Approve refund</button> <button className="btn btn-outline btn-sm" onClick={() => reviewRefund(order, 'Rejected')}>Reject</button></span>}
          </div>)}
          {adminOrders.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No orders.</p>}
        </div>
      </Modal>

      <Modal isOpen={isOrdersOpen} onClose={() => setIsOrdersOpen(false)} title="My Orders">
        {myOrders.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No orders yet.</p> : (
          <div style={{ display: 'grid', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
            {myOrders.map(order => <div key={order._id} className="glass-panel" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}><strong>{order.orderId}</strong><span>{order.orderStatus}</span></div>
              <p style={{ margin: '8px 0', fontSize: '.9rem', color: 'var(--text-secondary)' }}>{order.items.map(item => `${item.name} × ${item.quantity}`).join(', ')}</p>
              <small>Payment: {order.paymentStatus} · {new Date(order.createdAt).toLocaleDateString()}</small>
              {(order.courierName || order.trackingNumber || order.estimatedDeliveryDate) && <p style={{ margin: '8px 0 0', fontSize: '.85rem' }}>Delivery: {order.courierName || 'Courier pending'}{order.trackingNumber && ` · Tracking: ${order.trackingNumber}`}{order.estimatedDeliveryDate && ` · ETA: ${new Date(order.estimatedDeliveryDate).toLocaleDateString()}`}</p>}
              {order.refundStatus !== 'None' && <p style={{ margin: '8px 0 0', fontSize: '.85rem' }}>Refund: {order.refundStatus}</p>}
              {['Pending', 'Processing'].includes(order.orderStatus) && <button className="btn btn-outline btn-sm" style={{ display: 'block', marginTop: '10px', color: '#ef4444' }} onClick={() => cancelOrder(order)}>Cancel Order</button>}
              {order.refundStatus === 'None' && order.orderStatus !== 'Cancelled' && <button className="btn btn-outline btn-sm" style={{ display: 'block', marginTop: '8px' }} onClick={() => requestRefund(order)}>Request Refund</button>}
            </div>)}
          </div>
        )}
      </Modal>

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
                <div key={item.id} className="cart-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--card-bg)' }}>
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
            
            <div className="cart-summary" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
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
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
            />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="checkout-spinner" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} /> Processing...
              </span>
            ) : (
              `Continue to Payment ($${cartTotal.toFixed(2)})`
            )}
          </button>
        </form>
      </Modal>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        amount={cartTotal}
        title="Select Payment Method"
        gymName="GymSync Store"
        paymentType="StoreOrder"
        onPaymentRecorded={handleOrderFromPayment}
      />

      {/* Order Confirmation Modal */}
      <Modal
        isOpen={isOrderConfirmed}
        onClose={() => setIsOrderConfirmed(false)}
        title={lastOrderPayment?.status === 'Completed' ? 'Order Confirmed!' : 'Payment Submitted'}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Check size={56} color="#10b981" style={{ marginBottom: '16px' }} />
          <h3>{lastOrderPayment?.status === 'Completed' ? 'Thank you for your order!' : 'Your payment is awaiting approval.'}</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            {lastOrderPayment?.status === 'Completed'
              ? 'Your payment has been completed and the order is being prepared for delivery.'
              : 'Your payment proof has been received and your order is pending approval.'}
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
