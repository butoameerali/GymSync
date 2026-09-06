import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, ShoppingCart, DollarSign, Plus, Edit2, Trash2, 
  Search, CheckCircle, Truck, RefreshCw, AlertCircle, Eye, Box 
} from 'lucide-react';
import { toast } from 'react-toastify';
import DashboardShell from '../../components/layout/DashboardShell';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import './StoreManagerDashboard.css';

const StoreManagerDashboard = () => {
  const managerName = localStorage.getItem('gymsync_user_name') || 'Store Manager';
  const userRole = localStorage.getItem('gymsync_role') || 'StoreManager';
  const [activeTab, setActiveTab] = useState('overview');

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');

  // Product Add/Edit Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Proteins',
    price: 49.99,
    stock: 50,
    image: '',
    badge: 'New'
  });

  // Order Fulfillment Modal State
  const [fulfillingOrder, setFulfillingOrder] = useState(null);
  const [fulfillmentForm, setFulfillmentForm] = useState({
    orderStatus: 'Processing',
    courierName: '',
    trackingNumber: '',
    estimatedDeliveryDate: '',
    refundStatus: 'None'
  });

  // Delete Product Confirmation State
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
  });

  const fetchStoreData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getHeaders();
      const [prodRes, ordRes] = await Promise.all([
        fetch('/api/store/products?status=Approved'),
        fetch('/api/store/orders', { headers })
      ]);

      if (prodRes.ok) setProducts(await prodRes.json());
      if (ordRes.ok) setOrders(await ordRes.json());
    } catch (err) {
      console.error('Failed to load store data:', err);
      setError('Could not connect to store services. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  // ==========================================
  // PRODUCT MANAGEMENT
  // ==========================================
  const handleOpenProductModal = (prod = null) => {
    if (prod) {
      setEditingProduct(prod);
      setProductForm({
        name: prod.name || '',
        category: prod.category || 'Proteins',
        price: prod.price || 29.99,
        stock: prod.stock !== undefined ? prod.stock : 50,
        image: prod.image || '',
        badge: prod.badge || ''
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        category: 'Proteins',
        price: 29.99,
        stock: 50,
        image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=600',
        badge: 'New'
      });
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.image.trim()) {
      return toast.warn('Product name and image URL are required');
    }

    try {
      const payload = {
        name: productForm.name.trim(),
        category: productForm.category,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        image: productForm.image.trim(),
        badge: productForm.badge
      };

      const url = editingProduct ? `/api/store/products/${editingProduct._id || editingProduct.id}` : '/api/store/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to save product');
      }

      toast.success(editingProduct ? 'Product details updated!' : 'Product added to store catalog!');
      setShowProductModal(false);
      setEditingProduct(null);
      fetchStoreData();
    } catch (err) {
      toast.error(err.message || 'Error saving product');
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/store/products/${deletingProduct._id || deletingProduct.id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!res.ok) throw new Error('Failed to delete product');

      toast.success(`${deletingProduct.name} removed from inventory`);
      setDeletingProduct(null);
      fetchStoreData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Stock Adjustment
  const handleQuickStockUpdate = async (productId, delta) => {
    const prod = products.find(p => (p._id || p.id) === productId);
    if (!prod) return;
    const newStock = Math.max(0, (prod.stock || 0) + delta);

    try {
      const res = await fetch(`/api/store/products/${productId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ stock: newStock })
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => (p._id || p.id) === productId ? { ...p, stock: newStock } : p));
        toast.info(`Stock updated to ${newStock}`);
      }
    } catch (err) {
      toast.error('Failed to update stock');
    }
  };

  // ==========================================
  // ORDER FULFILLMENT
  // ==========================================
  const handleOpenFulfillmentModal = (order) => {
    setFulfillingOrder(order);
    setFulfillmentForm({
      orderStatus: order.orderStatus || 'Processing',
      courierName: order.courierName || '',
      trackingNumber: order.trackingNumber || '',
      estimatedDeliveryDate: order.estimatedDeliveryDate ? order.estimatedDeliveryDate.slice(0, 10) : '',
      refundStatus: order.refundStatus || 'None'
    });
  };

  const handleSaveOrderFulfillment = async (e) => {
    e.preventDefault();
    if (!fulfillingOrder) return;

    try {
      const res = await fetch(`/api/store/orders/${fulfillingOrder._id}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          orderStatus: fulfillmentForm.orderStatus,
          courierName: fulfillmentForm.courierName,
          trackingNumber: fulfillmentForm.trackingNumber,
          estimatedDeliveryDate: fulfillmentForm.estimatedDeliveryDate,
          refundStatus: fulfillmentForm.refundStatus !== 'None' ? fulfillmentForm.refundStatus : undefined,
          handledBy: managerName
        })
      });

      if (!res.ok) throw new Error('Failed to update order');

      toast.success(`Order ${fulfillingOrder.orderId} status updated!`);
      setFulfillingOrder(null);
      fetchStoreData();
    } catch (err) {
      toast.error(err.message || 'Error updating order');
    }
  };

  // Metrics
  const totalStockCount = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const pendingOrdersCount = orders.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Processing').length;
  const totalStoreRevenue = orders.filter(o => o.paymentStatus === 'Paid' || o.orderStatus === 'Delivered')
    .reduce((acc, o) => acc + (o.totalAmount || 0), 0);

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter === 'All') return true;
    return o.orderStatus === orderStatusFilter;
  });

  return (
    <DashboardShell
      userRole={userRole}
      userName={managerName}
      title="Store Manager Portal"
      subtitle="Inventory management, order dispatching, and product fulfillment"
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="store-manager-page">
        {loading ? (
          <div style={{ padding: '30px' }}>
            <SkeletonLoader count={4} height="80px" />
          </div>
        ) : error ? (
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={40} style={{ marginBottom: '10px' }} />
            <p>{error}</p>
            <button className="btn btn-outline" onClick={fetchStoreData}>
              <RefreshCw size={14} /> Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div>
                <div className="stats-grid">
                  <div className="stat-card glass-panel" onClick={() => setActiveTab('products')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon blue"><Package size={24} /></div>
                    <div>
                      <span className="stat-label">Total Catalog Products</span>
                      <h3 className="stat-value">{products.length}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel" onClick={() => setActiveTab('products')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon purple"><Box size={24} /></div>
                    <div>
                      <span className="stat-label">Total Stock Units</span>
                      <h3 className="stat-value">{totalStockCount}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel" onClick={() => setActiveTab('orders')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon amber"><ShoppingCart size={24} /></div>
                    <div>
                      <span className="stat-label">Pending Orders</span>
                      <h3 className="stat-value">{pendingOrdersCount}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel">
                    <div className="stat-icon green"><DollarSign size={24} /></div>
                    <div>
                      <span className="stat-label">Fulfilled Store Revenue</span>
                      <h3 className="stat-value">${totalStoreRevenue.toLocaleString()}</h3>
                    </div>
                  </div>
                </div>

                {/* Quick Action Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '24px' }}>
                  <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShoppingCart size={18} color="var(--primary-accent)" /> Urgent Orders to Fulfill ({pendingOrdersCount})
                    </h4>
                    {orders.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Processing').length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>No orders currently awaiting shipment. All clear!</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {orders.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Processing').slice(0, 3).map(o => (
                          <div key={o._id} style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong>{o.orderId}</strong> • ${o.totalAmount}
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{o.userName} ({o.items?.length || 1} items)</div>
                            </div>
                            <button className="btn btn-sm btn-primary" onClick={() => handleOpenFulfillmentModal(o)}>
                              Fulfill
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={18} color="#10b981" /> Quick Store Operations
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                      Add new supplements, official workout apparel, or gym gear to the public store. Update inventory levels instantly.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleOpenProductModal()}>
                        <Plus size={14} /> Add Product to Catalog
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('orders')}>
                        <Truck size={14} /> View All Orders
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PRODUCT INVENTORY */}
            {activeTab === 'products' && (
              <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Product Inventory & Stock Management</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Control pricing, stock quantities, and availability for store merchandise</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => handleOpenProductModal()}>
                    <Plus size={18} /> Add Product
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div className="search-bar" style={{ flex: 1, minWidth: '220px' }}>
                    <Search size={18} color="var(--text-secondary)" />
                    <input type="text" placeholder="Search catalog by name..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <select 
                    className="search-input" 
                    style={{ width: 'auto', minWidth: '160px' }}
                    value={categoryFilter} 
                    onChange={e => setCategoryFilter(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    <option value="Proteins">Proteins</option>
                    <option value="Supplements">Supplements</option>
                    <option value="Gym Wear">Gym Wear</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>

                {filteredProducts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No products match your search.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Stock Level</th>
                          <th>Quick Adjust</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map(p => (
                          <tr key={p._id || p.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                                <div>
                                  <strong>{p.name}</strong>
                                  {p.badge && <span className="category-badge" style={{ marginLeft: '6px' }}>{p.badge}</span>}
                                </div>
                              </div>
                            </td>
                            <td>{p.category}</td>
                            <td><strong>${p.price}</strong></td>
                            <td>
                              <span style={{ 
                                fontWeight: 'bold', 
                                color: (p.stock || 0) <= 5 ? '#ef4444' : (p.stock || 0) < 20 ? '#f59e0b' : '#10b981' 
                              }}>
                                {p.stock || 0} units
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-outline btn-sm" onClick={() => handleQuickStockUpdate(p._id || p.id, -5)} title="Deduct 5 units">-5</button>
                                <button className="btn btn-outline btn-sm" onClick={() => handleQuickStockUpdate(p._id || p.id, 10)} title="Add 10 units">+10</button>
                                <button className="btn btn-outline btn-sm" onClick={() => handleQuickStockUpdate(p._id || p.id, 50)} title="Add 50 units">+50</button>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-outline btn-sm" onClick={() => handleOpenProductModal(p)} title="Edit details">
                                  <Edit2 size={14} /> Edit
                                </button>
                                <button 
                                  className="btn btn-outline btn-sm" 
                                  style={{ color: '#ef4444', borderColor: '#ef4444' }} 
                                  onClick={() => setDeletingProduct(p)} 
                                  title="Delete product"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ORDER PROCESSING */}
            {activeTab === 'orders' && (
              <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Customer Order Processing & Dispatch</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Track purchases, attach shipping couriers, and handle return/refund requests</p>
                  </div>
                  <select 
                    className="search-input" 
                    style={{ width: 'auto', minWidth: '160px' }}
                    value={orderStatusFilter} 
                    onChange={e => setOrderStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {filteredOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <ShoppingCart size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No orders found matching status: {orderStatusFilter}</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Items</th>
                          <th>Total</th>
                          <th>Payment</th>
                          <th>Fulfillment Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map(o => (
                          <tr key={o._id}>
                            <td><strong>{o.orderId}</strong></td>
                            <td>
                              <strong>{o.userName}</strong>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{o.shippingAddress}</div>
                            </td>
                            <td>
                              <span title={(o.items || []).map(i => `${i.name} x${i.quantity}`).join(', ')}>
                                {o.items?.length || 1} item{(o.items?.length || 1) === 1 ? '' : 's'}
                              </span>
                            </td>
                            <td><strong>${o.totalAmount}</strong></td>
                            <td>
                              <span className={`status-pill ${o.paymentStatus === 'Paid' ? 'approved' : 'pending'}`}>
                                {o.paymentStatus}
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill ${o.orderStatus === 'Delivered' ? 'approved' : o.orderStatus === 'Cancelled' ? 'rejected' : 'pending'}`}>
                                {o.orderStatus}
                              </span>
                              {o.trackingNumber && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {o.courierName}: {o.trackingNumber}
                                </div>
                              )}
                            </td>
                            <td>
                              <button 
                                className="btn btn-sm btn-primary" 
                                onClick={() => handleOpenFulfillmentModal(o)}
                              >
                                Manage Order
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* MODAL: PRODUCT CREATE / EDIT */}
        <Modal isOpen={showProductModal} onClose={() => setShowProductModal(false)} title={editingProduct ? 'Edit Catalog Product' : 'Add New Product to Store'}>
          <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Product Name</label>
              <input type="text" required placeholder="e.g. Optimum Gold Whey 5lbs" className="search-input" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Category</label>
                <select className="search-input" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })}>
                  <option value="Proteins">Proteins</option>
                  <option value="Supplements">Supplements</option>
                  <option value="Gym Wear">Gym Wear</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Equipment">Equipment</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Promotional Badge</label>
                <input type="text" placeholder="e.g. Best Seller, Sale, New" className="search-input" value={productForm.badge} onChange={e => setProductForm({ ...productForm, badge: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Price ($ USD)</label>
                <input type="number" step="0.01" min="1" required className="search-input" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Inventory Stock Units</label>
                <input type="number" min="0" required className="search-input" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Image URL</label>
              <input type="text" required placeholder="https://images.unsplash.com/..." className="search-input" value={productForm.image} onChange={e => setProductForm({ ...productForm, image: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowProductModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingProduct ? 'Save Changes' : 'Add to Catalog'}</button>
            </div>
          </form>
        </Modal>

        {/* MODAL: ORDER FULFILLMENT & DISPATCH (Replaces window.prompt) */}
        <Modal isOpen={Boolean(fulfillingOrder)} onClose={() => setFulfillingOrder(null)} title={`Fulfill Order: ${fulfillingOrder?.orderId}`}>
          <form onSubmit={handleSaveOrderFulfillment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Fulfillment Status</label>
              <select className="search-input" value={fulfillmentForm.orderStatus} onChange={e => setFulfillmentForm({ ...fulfillmentForm, orderStatus: e.target.value })}>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Courier Name</label>
                <input type="text" placeholder="e.g. DHL, FedEx, TCS" className="search-input" value={fulfillmentForm.courierName} onChange={e => setFulfillmentForm({ ...fulfillmentForm, courierName: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Tracking Number</label>
                <input type="text" placeholder="e.g. TCS-98234123" className="search-input" value={fulfillmentForm.trackingNumber} onChange={e => setFulfillmentForm({ ...fulfillmentForm, trackingNumber: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Estimated Delivery Date</label>
              <input type="date" className="search-input" value={fulfillmentForm.estimatedDeliveryDate} onChange={e => setFulfillmentForm({ ...fulfillmentForm, estimatedDeliveryDate: e.target.value })} />
            </div>

            {fulfillingOrder?.refundStatus === 'Requested' && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '12px', borderRadius: '8px' }}>
                <strong style={{ color: '#ef4444' }}>Refund Requested by Trainee:</strong>
                <p style={{ margin: '4px 0 8px 0', fontSize: '0.85rem' }}>Reason: "{fulfillingOrder.refundReason || 'No reason provided'}"</p>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Refund Decision</label>
                <select className="search-input" value={fulfillmentForm.refundStatus} onChange={e => setFulfillmentForm({ ...fulfillmentForm, refundStatus: e.target.value })}>
                  <option value="Requested">Keep Requested (Under Review)</option>
                  <option value="Approved">Approve Refund</option>
                  <option value="Rejected">Reject Refund</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setFulfillingOrder(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Update Order</button>
            </div>
          </form>
        </Modal>

        {/* DELETE PRODUCT CONFIRMATION MODAL */}
        <ConfirmDialog
          isOpen={Boolean(deletingProduct)}
          onClose={() => setDeletingProduct(null)}
          onConfirm={handleConfirmDeleteProduct}
          title={`Remove ${deletingProduct?.name}`}
          message={`Are you sure you want to remove "${deletingProduct?.name}" from the store catalog? Customers will no longer be able to purchase it.`}
          confirmText="Remove Product"
          isDanger={true}
          loading={isDeleting}
        />
      </div>
    </DashboardShell>
  );
};

export default StoreManagerDashboard;
