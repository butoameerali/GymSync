import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Tag, Layers } from 'lucide-react';
import Modal from '../common/Modal';

const ArticleBuilderModal = ({
  isOpen,
  onClose,
  onSave,
  editingArticle = null,
  availableExercises = []
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Training');
  const [readTime, setReadTime] = useState('5 min');
  const [tags, setTags] = useState('Hypertrophy, Form, Health');
  const [topics, setTopics] = useState('');
  const [relatedExerciseIds, setRelatedExerciseIds] = useState([]);
  const [status, setStatus] = useState('published');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (editingArticle) {
      setTitle(editingArticle.title || '');
      setCategory(editingArticle.category || 'Training');
      setReadTime(editingArticle.readTime || '5 min');
      setTags(Array.isArray(editingArticle.tags) ? editingArticle.tags.join(', ') : (editingArticle.tags || ''));
      setTopics(Array.isArray(editingArticle.topics) ? editingArticle.topics.join(', ') : (editingArticle.topics || ''));
      setRelatedExerciseIds(Array.isArray(editingArticle.relatedExerciseIds) ? editingArticle.relatedExerciseIds : []);
      setStatus(editingArticle.status || 'published');
      setContent(editingArticle.content || '');
    } else {
      setTitle('');
      setCategory('Training');
      setReadTime('5 min');
      setTags('Hypertrophy, Biomechanics, Technique');
      setTopics('Form Cues, Injury Prevention');
      setRelatedExerciseIds([]);
      setStatus('published');
      setContent('');
    }
  }, [editingArticle, isOpen]);

  const toggleExerciseLink = (exId) => {
    if (relatedExerciseIds.includes(exId)) {
      setRelatedExerciseIds(relatedExerciseIds.filter(id => id !== exId));
    } else {
      setRelatedExerciseIds([...relatedExerciseIds, exId]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const payload = {
      title: title.trim(),
      category,
      readTime,
      tags: tags.split(',').map(s => s.trim()).filter(Boolean),
      topics: topics.split(',').map(s => s.trim()).filter(Boolean),
      relatedExerciseIds,
      status,
      content: content.trim()
    };

    onSave(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingArticle ? 'Edit Educational Guide' : 'Publish Educational Article & Guide'}
      maxWidth="800px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
            Article / Guide Title *
          </label>
          <input
            type="text"
            required
            className="search-input"
            placeholder="e.g. Deadlift Biomechanics: Neutral Spine & Hip Hinge Masterclass"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
              Category
            </label>
            <select className="search-input" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="Training">Training</option>
              <option value="Nutrition">Nutrition</option>
              <option value="Biomechanics">Biomechanics</option>
              <option value="Recovery">Recovery</option>
              <option value="Technique">Technique</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
              Read Time
            </label>
            <input
              type="text"
              className="search-input"
              value={readTime}
              onChange={e => setReadTime(e.target.value)}
              placeholder="5 min"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
              Publication Status
            </label>
            <select className="search-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="published">Published (Visible to Users & AI)</option>
              <option value="draft">Draft (Private)</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
              Keywords / Tags (comma separated)
            </label>
            <input
              type="text"
              className="search-input"
              placeholder="Deadlift, Lower Back, Form, Safety"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
              Key Topics / Concepts
            </label>
            <input
              type="text"
              className="search-input"
              placeholder="Spinal Neutrality, Hip Hinge Mechanics"
              value={topics}
              onChange={e => setTopics(e.target.value)}
            />
          </div>
        </div>

        {/* Link with Real Database Exercises */}
        {availableExercises.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', fontWeight: 600 }}>
              Link Related Exercises from Library (Connects to AI Knowledge Graph)
            </label>
            <div style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              maxHeight: '100px',
              overflowY: 'auto',
              padding: '8px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '8px',
              border: '1px solid var(--card-border)'
            }}>
              {availableExercises.map(ex => {
                const exId = ex.exerciseId || ex.id || ex._id;
                const isSelected = relatedExerciseIds.includes(exId);
                return (
                  <button
                    key={exId}
                    type="button"
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                    onClick={() => toggleExerciseLink(exId)}
                  >
                    {isSelected ? '✓ ' : '+ '} {ex.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '4px', fontWeight: 600 }}>
            Full Educational Guide Content (Markdown supported) *
          </label>
          <textarea
            rows="8"
            required
            className="search-input"
            placeholder="Write clear, biomechanically sound instructions, coaching cues, anatomy breakdown, and form correction tips..."
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Status: <strong style={{ color: status === 'published' ? '#10b981' : '#f59e0b' }}>{status.toUpperCase()}</strong>
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingArticle ? 'Save Article Changes' : 'Save & Publish Article'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ArticleBuilderModal;
