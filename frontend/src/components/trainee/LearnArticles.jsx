import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Clock, CheckCircle, ArrowRight, Tag, Dumbbell } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Modal from '../common/Modal';

const LearnArticles = ({ onSelectExercise }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [readingArticle, setReadingArticle] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/articles');
      if (res.ok) {
        const data = await res.json();
        setArticles(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Fetch Articles Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(a => {
    const matchSearch = (a.title || '').toLowerCase().includes(search.toLowerCase()) ||
                        (a.content || '').toLowerCase().includes(search.toLowerCase()) ||
                        (Array.isArray(a.tags) && a.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));
    const matchCategory = categoryFilter === 'All' || a.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search and Category Filter Bar */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '240px' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search guides by title, biomechanics, exercise or keywords..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="search-input"
          style={{ width: 'auto', minWidth: '160px' }}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="All">All Categories</option>
          <option value="Training">Training & Hypertrophy</option>
          <option value="Biomechanics">Biomechanics & Safety</option>
          <option value="Technique">Technique & Form</option>
          <option value="Nutrition">Nutrition & Fuel</option>
          <option value="Recovery">Recovery & Sleep</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Loading instructor educational articles & guides...
        </div>
      ) : filteredArticles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <BookOpen size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>No guides found matching your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredArticles.map(art => (
            <div
              key={art._id}
              className="glass-panel"
              style={{
                padding: '22px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--card-border)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="category-badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                    {art.category || 'Training'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {art.readTime || '5 min'}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                  {art.title}
                </h3>

                <p style={{ fontSize: '0.8rem', color: '#10b981', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={14} /> Written by {art.author || 'Fitness Instructor'}
                </p>

                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                  {(art.content || '').substring(0, 140)}...
                </p>

                {/* Tags */}
                {Array.isArray(art.tags) && art.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {art.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '12px' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setReadingArticle(art)}
              >
                Read Full Guide <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Reading Modal */}
      {readingArticle && (
        <Modal
          isOpen={Boolean(readingArticle)}
          onClose={() => setReadingArticle(null)}
          title={readingArticle.title}
          maxWidth="760px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="category-badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                  Author: {readingArticle.author} ({readingArticle.authorRole || 'Fitness Instructor'})
                </span>
                <span className="category-badge">
                  {readingArticle.category}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} /> {readingArticle.readTime || '5 min'} read
              </span>
            </div>

            {/* Related Exercises Links */}
            {Array.isArray(readingArticle.relatedExerciseIds) && readingArticle.relatedExerciseIds.length > 0 && (
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Dumbbell size={14} /> Related Movement Standards from Library:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {readingArticle.relatedExerciseIds.map((exId, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.74rem', padding: '2px 8px' }}
                      onClick={() => {
                        setReadingArticle(null);
                        if (onSelectExercise) onSelectExercise(exId);
                      }}
                    >
                      View Exercise: {exId}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-primary)', maxHeight: '420px', overflowY: 'auto', whiteSpace: 'pre-line' }}>
              <ReactMarkdown>{readingArticle.content}</ReactMarkdown>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setReadingArticle(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LearnArticles;
