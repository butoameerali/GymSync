import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  CheckCircle,
  XCircle,
  RefreshCw,
  Building2,
  Dumbbell,
  ShoppingBag,
  Megaphone,
  Eye,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';

const SUGGESTION_TYPES = [
  { value: 'Ad', label: '📢 Sponsored Ad / Campaign', icon: Megaphone, defaultBadge: 'Sponsored Ad', defaultCta: 'Explore Offer' },
  { value: 'Gym', label: '🏢 Featured Gym / Facility', icon: Building2, defaultBadge: 'Featured Gym', defaultCta: 'View Gym Details' },
  { value: 'Exercise', label: '🏋️ Workout Tip / Exercise Guide', icon: Dumbbell, defaultBadge: 'Exercise Spotlight', defaultCta: 'View Form Guide' },
  { value: 'Product', label: '🛍️ Store Product / Gear', icon: ShoppingBag, defaultBadge: 'Recommended Gear', defaultCta: 'Shop in Store' }
];

const SuggestionManagement = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: 'Ad',
    title: '',
    description: '',
    imageUrl: '',
    badge: 'Sponsored Ad',
    meta: '',
    linkUrl: '/explore',
    ctaText: 'Explore Offer',
    priority: 5,
    isActive: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suggestions?all=true', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } else {
        toast.error('Failed to load suggestions from server');
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      toast.error('Network error loading suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      type: 'Ad',
      title: '',
      description: '',
      imageUrl: '',
      badge: 'Sponsored Ad',
      meta: '',
      linkUrl: '/explore',
      ctaText: 'Explore Offer',
      priority: 5,
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item._id);
    setFormData({
      type: item.type || 'Ad',
      title: item.title || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      badge: item.badge || '',
      meta: item.meta || '',
      linkUrl: item.linkUrl || '',
      ctaText: item.ctaText || 'Learn More',
      priority: item.priority !== undefined ? item.priority : 5,
      isActive: item.isActive !== false
    });
    setIsModalOpen(true);
  };

  const handleTypeChange = (newType) => {
    const config = SUGGESTION_TYPES.find(t => t.value === newType);
    setFormData(prev => ({
      ...prev,
      type: newType,
      badge: config ? config.defaultBadge : prev.badge,
      ctaText: config ? config.defaultCta : prev.ctaText,
      linkUrl: newType === 'Gym' ? '/explore' : newType === 'Exercise' ? '/ai-trainer' : newType === 'Product' ? '/store' : prev.linkUrl
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.warning('Please enter a title for this suggestion');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const url = editingId ? `/api/suggestions/${editingId}` : '/api/suggestions';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Operation failed');
      }

      toast.success(editingId ? 'Suggestion updated successfully!' : 'New suggestion published!');
      setIsModalOpen(false);
      fetchSuggestions();
    } catch (err) {
      toast.error(err.message || 'Error saving suggestion');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch(`/api/suggestions/${item._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !item.isActive })
      });

      if (res.ok) {
        setSuggestions(prev => prev.map(s => s._id === item._id ? { ...s, isActive: !s.isActive } : s));
        toast.info(`Suggestion marked as ${!item.isActive ? 'Active' : 'Inactive'}`);
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete suggestion "${title}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch(`/api/suggestions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s._id !== id));
        toast.success('Suggestion removed');
      } else {
        toast.error('Failed to delete suggestion');
      }
    } catch (err) {
      toast.error('Network error during deletion');
    }
  };

  // Metrics
  const totalCount = suggestions.length;
  const activeCount = suggestions.filter(s => s.isActive).length;
  const adCount = suggestions.filter(s => s.type === 'Ad').length;
  const gymCount = suggestions.filter(s => s.type === 'Gym').length;
  const exerciseCount = suggestions.filter(s => s.type === 'Exercise').length;
  const productCount = suggestions.filter(s => s.type === 'Product').length;

  const filteredSuggestions = filterType === 'ALL'
    ? suggestions
    : suggestions.filter(s => s.type === filterType);

  return (
    <div className="suggestion-management-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Control Actions */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={24} color="var(--primary-accent)" />
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                Suggestions & Discover Spotlight
              </h2>
            </div>
            <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Manage dynamic sponsored ads, featured gyms, exercise guides, and store recommendations shown across user feeds.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={fetchSuggestions}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Refresh list"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              type="button"
              className="btn-glow"
              onClick={handleOpenCreate}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={18} /> Add New Suggestion / Ad
            </button>
          </div>
        </div>

        {/* Metric Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '20px' }}>
          <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Items</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{totalCount}</div>
          </div>
          <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <span style={{ fontSize: '0.78rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 600 }}>Active in Feed</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>{activeCount}</div>
          </div>
          <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <span style={{ fontSize: '0.78rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 600 }}>Sponsored Ads</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>{adCount}</div>
          </div>
          <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <span style={{ fontSize: '0.78rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 600 }}>Featured Gyms</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>{gymCount}</div>
          </div>
          <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <span style={{ fontSize: '0.78rem', color: '#8b5cf6', textTransform: 'uppercase', fontWeight: 600 }}>Exercise Guides</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6', marginTop: '4px' }}>{exerciseCount}</div>
          </div>
          <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <span style={{ fontSize: '0.78rem', color: '#06b6d4', textTransform: 'uppercase', fontWeight: 600 }}>Store Products</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#06b6d4', marginTop: '4px' }}>{productCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: `All Types (${totalCount})` },
          { key: 'Ad', label: `📢 Sponsored Ads (${adCount})` },
          { key: 'Gym', label: `🏢 Gyms (${gymCount})` },
          { key: 'Exercise', label: `🏋️ Exercises (${exerciseCount})` },
          { key: 'Product', label: `🛍️ Products (${productCount})` }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`btn btn-sm ${filterType === tab.key ? 'btn-glow' : 'btn-outline'}`}
            onClick={() => setFilterType(tab.key)}
            style={{ borderRadius: '9999px', padding: '6px 16px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Loading suggestions & spotlight items...
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '16px' }}>
          <Sparkles size={48} color="var(--primary-accent)" style={{ marginBottom: '12px', opacity: 0.8 }} />
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>No Suggestions Found</h3>
          <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)' }}>
            Create your first sponsored ad, gym feature, exercise guide, or product recommendation.
          </p>
          <button type="button" className="btn-glow" onClick={handleOpenCreate}>
            <Plus size={16} /> Create Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredSuggestions.map((item) => {
            const isAd = item.type === 'Ad';
            const isGym = item.type === 'Gym';
            const isExercise = item.type === 'Exercise';
            const isProduct = item.type === 'Product';

            const badgeBg = isAd ? 'rgba(245, 158, 11, 0.15)' : isGym ? 'rgba(59, 130, 246, 0.15)' : isExercise ? 'rgba(139, 92, 246, 0.15)' : 'rgba(6, 182, 212, 0.15)';
            const badgeColor = isAd ? '#f59e0b' : isGym ? '#3b82f6' : isExercise ? '#8b5cf6' : '#06b6d4';

            return (
              <div
                key={item._id}
                className="glass-panel"
                style={{
                  borderRadius: '16px',
                  border: `1px solid ${item.isActive ? 'var(--card-border)' : 'rgba(239, 68, 68, 0.3)'}`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  opacity: item.isActive ? 1 : 0.65
                }}
              >
                {/* Image Header with Badge Overlay */}
                <div style={{ position: 'relative', width: '100%', height: '140px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                      {isAd ? <Megaphone size={32} /> : isGym ? <Building2 size={32} /> : isExercise ? <Dumbbell size={32} /> : <ShoppingBag size={32} />}
                    </div>
                  )}

                  <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background: badgeBg,
                        color: badgeColor,
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${badgeColor}40`
                      }}
                    >
                      {item.badge || item.type}
                    </span>
                  </div>

                  <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      title={item.isActive ? 'Click to Deactivate' : 'Click to Activate'}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        background: item.isActive ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {item.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {item.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                {/* Body Details */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                      {item.title}
                    </h4>
                    {item.meta && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary-accent)', fontWeight: 600 }}>
                        {item.meta}
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45, flex: 1 }}>
                      {item.description}
                    </p>
                  )}

                  {/* Destination & Action */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--card-border)', marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      🔗 {item.linkUrl || 'No Link'}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '6px' }}>
                      CTA: {item.ctaText || 'Learn More'}
                    </span>
                  </div>

                  {/* Card Controls */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={() => handleOpenEdit(item)}
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', padding: '6px 12px' }}
                      onClick={() => handleDelete(item._id, item.title)}
                      title="Delete Suggestion"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? 'Edit Suggestion / Ad' : 'Create New Suggestion / Ad'}
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
            {/* Category / Type Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Suggestion Category / Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="search-input"
                style={{ width: '100%' }}
              >
                {SUGGESTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Headline / Title *
              </label>
              <input
                type="text"
                placeholder={formData.type === 'Ad' ? 'e.g. 50% Off Annual Membership Flash Sale' : formData.type === 'Gym' ? 'e.g. Iron Core Fitness Arena' : formData.type === 'Exercise' ? 'e.g. Incline Barbell Bench Press' : 'e.g. Premium Hydrolyzed Whey 2kg'}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="search-input"
                style={{ width: '100%' }}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Description / Highlights
              </label>
              <textarea
                placeholder="Brief highlights or workout cues shown on the card..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="search-input"
                style={{ width: '100%', minHeight: '75px', resize: 'vertical' }}
              />
            </div>

            {/* Image URL with live preview */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Image / Photo URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/... or uploaded photo link"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="search-input"
                style={{ width: '100%' }}
              />
              {formData.imageUrl && (
                <div style={{ marginTop: '8px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            {/* Badge Tag & Meta Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Badge Tag Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sponsored Ad, Featured Gym, Workout Tip"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  className="search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Meta / Price / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Johar Town • Rs. 5,500/mo or Rs. 8,900"
                  value={formData.meta}
                  onChange={(e) => setFormData({ ...formData, meta: e.target.value })}
                  className="search-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Destination Link URL & CTA Button Text */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Target Link / Route URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. /explore, /store, /gym/:id, or https://..."
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  className="search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  CTA Button Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. View Gym Details, Shop Now"
                  value={formData.ctaText}
                  onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                  className="search-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Priority & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Display Priority (Higher = First)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ paddingTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary-accent)' }}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Active (Visible to users)</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-glow"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : editingId ? 'Update Suggestion' : 'Publish Suggestion'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SuggestionManagement;
