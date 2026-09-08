import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Search, Star, Eye, Dumbbell, Loader2, Sparkles } from 'lucide-react';
import useDebounce from '../../hooks/useDebounce';
import useInfiniteScroll from '../../hooks/useInfiniteScroll';

const CATEGORIES = ['All', 'Favorites', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];

// Memoized individual exercise card to avoid re-rendering entire grid
const ExerciseCard = memo(({ ex, isFavorite, onToggleFavorite, onSelect }) => {
  const exId = ex._id || ex.id || ex.exerciseId;
  const muscles = Array.isArray(ex.targetMuscles) ? ex.targetMuscles.join(', ') : (ex.category || 'General');
  const equipment = ex.equipmentRequired || 'Bodyweight';

  return (
    <div className="exercise-card">
      <div className="ex-card-header">
        <h4>{ex.name}</h4>
        <button
          type="button"
          className="fav-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(exId);
          }}
          aria-label="Toggle favorite"
        >
          <Star
            size={20}
            color={isFavorite ? '#f59e0b' : 'var(--text-secondary)'}
            fill={isFavorite ? '#f59e0b' : 'none'}
          />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '4px 0 8px 0' }}>
        <span className="ex-category">{muscles}</span>
        {ex.difficulty && (
          <span className="category-badge" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.7rem' }}>
            {ex.difficulty}
          </span>
        )}
        {ex.isAiTrackable && (
          <span className="category-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Sparkles size={10} /> AI Vision
          </span>
        )}
      </div>

      <p className="ex-instructions">
        {(ex.description || ex.primaryPurpose || ex.instructions || `Equipment: ${equipment}. Focus on controlled tempo.`).substring(0, 75)}...
      </p>

      <button
        type="button"
        className="btn btn-primary btn-sm w-100 mt-10"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        onClick={() => onSelect(ex)}
      >
        <Eye size={16} /> View Exercise
      </button>
    </div>
  );
});

ExerciseCard.displayName = 'ExerciseCard';

const ExerciseLibrary = ({ onSelectExercise, favorites = [], onToggleFavorite = () => {} }) => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeEquipment, setActiveEquipment] = useState('All');

  const abortControllerRef = useRef(null);

  const fetchExercises = useCallback(async (isLoadMore = false, cursorParam = null) => {
    if (abortControllerRef.current && !isLoadMore) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams({
        paginate: 'true',
        limit: '24'
      });

      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (activeCategory !== 'All' && activeCategory !== 'Favorites') {
        params.append('category', activeCategory);
      }
      if (activeEquipment !== 'All') {
        params.append('equipment', activeEquipment);
      }
      if (cursorParam) {
        params.append('cursor', cursorParam);
      }

      const res = await fetch(`/api/exercises?${params.toString()}`, {
        signal: abortControllerRef.current.signal
      });

      if (res.ok) {
        const data = await res.json();
        const items = data.items || (Array.isArray(data) ? data : []);
        setExercises(prev => (isLoadMore ? [...prev, ...items] : items));
        setNextCursor(data.nextCursor || null);
        setHasMore(Boolean(data.hasMore));
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Fetch Exercises Error:', err);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, activeCategory, activeEquipment]);

  useEffect(() => {
    fetchExercises(false, null);
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchExercises]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore && nextCursor) {
      fetchExercises(true, nextCursor);
    }
  }, [hasMore, loading, loadingMore, nextCursor, fetchExercises]);

  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    hasMore,
    isLoading: loading || loadingMore
  });

  // Client-side favorite filter if 'Favorites' category selected
  const displayedExercises = activeCategory === 'Favorites'
    ? exercises.filter(ex => favorites.includes(ex._id || ex.id || ex.exerciseId))
    : exercises;

  return (
    <div className="library-view glass-panel">
      <div className="filter-controls">
        <div className="search-bar">
          <Search size={20} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search exercises by name, muscles, or movement..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="category-scroll">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`cat-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'Favorites' ? '★ Favorites' : cat}
            </button>
          ))}
        </div>

        <div className="category-scroll" style={{ marginTop: '10px' }}>
          {['All', 'No Equipment', 'With Equipment'].map(eq => (
            <button
              key={eq}
              className={`cat-pill ${activeEquipment === eq ? 'active' : ''}`}
              onClick={() => setActiveEquipment(eq)}
            >
              {eq === 'All' ? 'All Equipment' : eq}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Loading exercises from library...
        </div>
      ) : displayedExercises.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <Dumbbell size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>No exercises found matching your search and filter criteria.</p>
        </div>
      ) : (
        <>
          <div className="exercise-grid">
            {displayedExercises.map(ex => {
              const id = ex._id || ex.id || ex.exerciseId;
              return (
                <ExerciseCard
                  key={id}
                  ex={ex}
                  isFavorite={favorites.includes(id)}
                  onToggleFavorite={onToggleFavorite}
                  onSelect={onSelectExercise}
                />
              );
            })}
          </div>

          {/* Infinite Scroll Sentinel */}
          <div
            ref={sentinelRef}
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              minHeight: '40px'
            }}
          >
            {loadingMore && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <Loader2 size={16} className="animate-spin" /> Loading more exercises...
              </div>
            )}
            {!hasMore && displayedExercises.length > 0 && (
              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                All exercises loaded ({displayedExercises.length})
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ExerciseLibrary;
