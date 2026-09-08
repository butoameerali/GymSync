import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Utensils, Search, CheckCircle, ArrowRight, Apple, Flame, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import useDebounce from '../../hooks/useDebounce';
import useInfiniteScroll from '../../hooks/useInfiniteScroll';

// Memoized individual diet card
const DietCard = memo(({ diet, onPreview, onAdopt }) => {
  const calories = diet.calories || parseInt(diet.details?.calories) || 2400;
  const protein = diet.protein || parseInt(diet.details?.protein) || 160;
  const carbs = diet.carbs || parseInt(diet.details?.carbs) || 220;
  const fat = diet.fat || parseInt(diet.details?.fat) || 60;
  const mealCount = diet.totalMeals || (diet.meals || []).length || 4;

  return (
    <div
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span className="category-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            {diet.dietaryType || 'Balanced'}
          </span>
          <span className="category-badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
            {diet.goal || diet.category || 'General'}
          </span>
        </div>

        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
          {diet.title}
        </h3>

        <p style={{ fontSize: '0.8rem', color: '#10b981', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle size={14} /> Formulated by {diet.createdBy || 'Fitness Instructor'}
        </p>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
          {diet.description || 'Nutrient-dense macronutrient protocol.'}
        </p>

        {/* Macro Pills Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
          background: 'rgba(255,255,255,0.03)',
          padding: '10px 8px',
          borderRadius: '10px',
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>CALORIES</span>
            <strong style={{ fontSize: '0.88rem', color: '#10b981' }}>{calories}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>PROTEIN</span>
            <strong style={{ fontSize: '0.88rem', color: '#3b82f6' }}>{protein}g</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>CARBS</span>
            <strong style={{ fontSize: '0.88rem', color: '#f59e0b' }}>{carbs}g</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>FATS</span>
            <strong style={{ fontSize: '0.88rem', color: '#ec4899' }}>{fat}g</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ flex: 1 }}
          onClick={() => onPreview(diet)}
        >
          View Meals ({mealCount})
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          onClick={() => onAdopt(diet)}
        >
          Adopt Diet <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
});

DietCard.displayName = 'DietCard';

const DietCatalogue = ({ onDietAdopted }) => {
  const [diets, setDiets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Search & Filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [goalFilter, setGoalFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Preview Modal
  const [previewDiet, setPreviewDiet] = useState(null);
  const [loadingPreviewDetails, setLoadingPreviewDetails] = useState(false);

  const abortControllerRef = useRef(null);

  const fetchDiets = useCallback(async (isLoadMore = false, cursorParam = null) => {
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
        type: 'Diet',
        paginate: 'true',
        limit: '12'
      });

      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (goalFilter !== 'All') params.append('goal', goalFilter);
      if (typeFilter !== 'All') params.append('difficulty', typeFilter); // or dietaryType
      if (cursorParam) params.append('cursor', cursorParam);

      const res = await fetch(`/api/plans/premade?${params.toString()}`, {
        signal: abortControllerRef.current.signal
      });

      if (res.ok) {
        const data = await res.json();
        const items = data.items || (Array.isArray(data) ? data : []);
        setDiets(prev => (isLoadMore ? [...prev, ...items] : items));
        setNextCursor(data.nextCursor || null);
        setHasMore(Boolean(data.hasMore));
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Fetch Diets Error:', err);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, goalFilter, typeFilter]);

  useEffect(() => {
    fetchDiets(false, null);
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchDiets]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore && nextCursor) {
      fetchDiets(true, nextCursor);
    }
  }, [hasMore, loading, loadingMore, nextCursor, fetchDiets]);

  const sentinelRef = useInfiniteScroll({
    onIntersect: loadMore,
    hasMore,
    isLoading: loading || loadingMore
  });

  const handlePreview = async (diet) => {
    setPreviewDiet(diet);
    if (!diet.meals || diet.meals.length === 0) {
      setLoadingPreviewDetails(true);
      try {
        const res = await fetch(`/api/plans/premade/${diet._id}`);
        if (res.ok) {
          const fullDiet = await res.json();
          setPreviewDiet(fullDiet);
        }
      } catch (err) {
        console.warn('Failed to load full diet details:', err);
      } finally {
        setLoadingPreviewDetails(false);
      }
    }
  };

  const handleAdopt = (diet) => {
    const userKey = (localStorage.getItem('gymsync_user_name') || 'Guest User').replace(/\s+/g, '_');
    localStorage.setItem(`gymsync_${userKey}_active_diet`, JSON.stringify(diet));
    toast.success(`Adopted "${diet.title}" as your active nutritional protocol!`);
    if (setPreviewDiet) setPreviewDiet(null);
    if (onDietAdopted) onDietAdopted(diet);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search and Filters Bar */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '240px' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search diet templates by title or keywords..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="search-input"
          style={{ width: 'auto', minWidth: '160px' }}
          value={goalFilter}
          onChange={e => setGoalFilter(e.target.value)}
        >
          <option value="All">All Nutritional Goals</option>
          <option value="Muscle Gain">Muscle Gain</option>
          <option value="Fat Loss">Fat Loss</option>
          <option value="Maintenance">Maintenance</option>
        </select>

        <select
          className="search-input"
          style={{ width: 'auto', minWidth: '160px' }}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="All">All Dietary Types</option>
          <option value="High-Protein">High-Protein</option>
          <option value="Keto">Keto / Low-Carb</option>
          <option value="Vegetarian">Vegetarian</option>
          <option value="Vegan">Vegan</option>
          <option value="Mediterranean">Mediterranean</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Loading instructor nutrition templates...
        </div>
      ) : diets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <Utensils size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>No diet templates found matching your filters.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {diets.map(diet => (
              <DietCard
                key={diet._id}
                diet={diet}
                onPreview={handlePreview}
                onAdopt={handleAdopt}
              />
            ))}
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
                <Loader2 size={16} className="animate-spin" /> Loading more diet protocols...
              </div>
            )}
            {!hasMore && diets.length > 0 && (
              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                All certified nutrition protocols loaded ({diets.length})
              </span>
            )}
          </div>
        </>
      )}

      {/* Diet Preview Modal */}
      {previewDiet && (
        <Modal
          isOpen={Boolean(previewDiet)}
          onClose={() => setPreviewDiet(null)}
          title={previewDiet.title}
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span className="category-badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', marginRight: '8px' }}>
                Formulated by {previewDiet.createdBy}
              </span>
              <span className="category-badge">
                {previewDiet.dietaryType || 'Balanced'} • {previewDiet.goal}
              </span>
            </div>

            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {previewDiet.description}
            </p>

            {loadingPreviewDetails ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading meal items and recipes...
              </div>
            ) : (
              /* Meals Listing */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
                {(previewDiet.meals || []).map((meal, mIdx) => (
                  <div key={mIdx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#10b981' }}>
                        {meal.mealType}: {meal.name}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{meal.timing}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(meal.foodItems || []).map((food, fIdx) => (
                        <div key={fIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '6px' }}>
                          <span>{food.name} ({food.quantity} {food.unit})</span>
                          <span style={{ color: 'var(--text-primary)' }}>{food.calories} kcal • {food.protein}g P</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setPreviewDiet(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleAdopt(previewDiet)}
              >
                Adopt This Plan
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DietCatalogue;
