import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Dumbbell, Utensils, MessageSquare, Send, Search, 
  Activity, User, Plus, Calendar, CheckCircle, RefreshCw, AlertCircle 
} from 'lucide-react';
import { toast } from 'react-toastify';
import DashboardShell from '../../components/layout/DashboardShell';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import Modal from '../../components/common/Modal';
import './GymTrainerDashboard.css';

const GymTrainerDashboard = () => {
  const trainerName = localStorage.getItem('gymsync_user_name') || 'Gym Trainer';
  const userRole = localStorage.getItem('gymsync_role') || 'GymTrainer';
  const [activeTab, setActiveTab] = useState('overview');

  const [assignedGymName, setAssignedGymName] = useState('');
  const [members, setMembers] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [assignedPlans, setAssignedPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search
  const [search, setSearch] = useState('');

  // Workout Plan Assignment State
  const [workoutForm, setWorkoutForm] = useState({
    memberName: '',
    title: 'Custom Strength & Conditioning Split',
    description: '3 Sets of 10-12 Reps. Focus on controlled eccentric tempo.'
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [customExercise, setCustomExercise] = useState('');
  const [isAssigningWorkout, setIsAssigningWorkout] = useState(false);

  // Dedicated Diet Plan Assignment State
  const [dietForm, setDietForm] = useState({
    memberName: '',
    title: 'High-Protein Muscle Gain Nutrition',
    targetCalories: 2600,
    proteinGrams: 180,
    carbsGrams: 280,
    fatGrams: 65,
    description: 'Meal 1: Oats & Whey. Meal 2: Chicken Breast & Jasmine Rice. Meal 3: Greek Yogurt & Berries. Meal 4: Salmon & Sweet Potato.'
  });
  const [isAssigningDiet, setIsAssigningDiet] = useState(false);

  // Chat State
  const [selectedMember, setSelectedMember] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
  });

  const fetchTrainerData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userRes = await fetch(`/api/users/${trainerName}`);
      let gymName = 'PowerHouse Gym';
      if (userRes.ok) {
        const user = await userRes.json();
        gymName = user.assignedGymName || localStorage.getItem('gymsync_user_gym') || 'PowerHouse Gym';
        setAssignedGymName(gymName);
      }

      const [membersRes, exRes, plansRes] = await Promise.all([
        fetch(`/api/users/gym-members/${gymName}`),
        fetch('/api/exercises'),
        fetch(`/api/gym-owner/plans`, { headers: getHeaders() })
      ]);

      if (membersRes.ok) setMembers(await membersRes.json());
      if (exRes.ok) setExercises(await exRes.json());
      if (plansRes.ok) setAssignedPlans(await plansRes.json());
    } catch (err) {
      console.error('Failed to load trainer data:', err);
      setError('Could not connect to facility database. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [trainerName]);

  useEffect(() => {
    fetchTrainerData();
  }, [fetchTrainerData]);

  // Handle Assigning Workout Plan
  const handleAssignWorkout = async (e) => {
    e.preventDefault();
    if (!workoutForm.memberName || !workoutForm.title) {
      return toast.warn('Please select a member and enter a routine title');
    }

    setIsAssigningWorkout(true);
    try {
      const res = await fetch('/api/gym-owner/plans', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          gymId: assignedGymName,
          memberName: workoutForm.memberName,
          planType: 'Workout',
          title: workoutForm.title,
          description: workoutForm.description,
          schedule: [{
            date: selectedDate,
            day: new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' }),
            routine: workoutForm.description,
            exercises: selectedExercises.map(name => ({ name, sets: '3', reps: '10', notes: '' }))
          }]
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to assign workout plan');
      }

      toast.success(`Workout plan assigned to ${workoutForm.memberName}!`);
      setWorkoutForm({ memberName: '', title: 'Custom Strength & Conditioning Split', description: '' });
      setSelectedExercises([]);
      fetchTrainerData();
    } catch (err) {
      toast.error(err.message || 'Error assigning workout');
    } finally {
      setIsAssigningWorkout(false);
    }
  };

  // Handle Dedicated Diet Plan Assignment
  const handleAssignDiet = async (e) => {
    e.preventDefault();
    if (!dietForm.memberName || !dietForm.title) {
      return toast.warn('Please select a member and enter a diet title');
    }

    setIsAssigningDiet(true);
    try {
      const res = await fetch('/api/gym-owner/plans', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          gymId: assignedGymName,
          memberName: dietForm.memberName,
          planType: 'Diet',
          title: dietForm.title,
          description: dietForm.description,
          nutritionMacros: {
            calories: Number(dietForm.targetCalories) || 2500,
            proteinGrams: Number(dietForm.proteinGrams) || 180,
            carbsGrams: Number(dietForm.carbsGrams) || 260,
            fatGrams: Number(dietForm.fatGrams) || 60
          },
          schedule: [{
            date: new Date(),
            day: 'Daily Meal Protocol',
            routine: `Target: ${dietForm.targetCalories} kcal (P: ${dietForm.proteinGrams}g, C: ${dietForm.carbsGrams}g, F: ${dietForm.fatGrams}g)`,
            dietInstructions: dietForm.description
          }]
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to assign diet plan');
      }

      toast.success(`Diet plan successfully assigned to ${dietForm.memberName}!`);
      setDietForm(prev => ({ ...prev, memberName: '', title: 'High-Protein Muscle Gain Nutrition', description: '' }));
      fetchTrainerData();
    } catch (err) {
      toast.error(err.message || 'Error assigning diet');
    } finally {
      setIsAssigningDiet(false);
    }
  };

  // Chat Handlers
  const handleSelectChatMember = (m) => {
    setSelectedMember(m);
    setActiveTab('chat');
    setChatMessages([
      { sender: 'Trainee', text: `Hi Coach ${trainerName}, what should I focus on for tomorrow's session?`, time: '10:15 AM' }
    ]);
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { sender: 'You', text: messageInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setMessageInput('');
  };

  const workoutPlansList = assignedPlans.filter(p => p.planType === 'Workout');
  const dietPlansList = assignedPlans.filter(p => p.planType === 'Diet');

  const filteredMembers = members.filter(m => 
    (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell
      userRole={userRole}
      userName={trainerName}
      title="Gym Trainer Portal"
      subtitle={`Assigned Facility: ${assignedGymName} — Guide and prescribe routines for trainees`}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="gym-trainer-page">
        {loading ? (
          <div style={{ padding: '30px' }}>
            <SkeletonLoader count={4} height="80px" />
          </div>
        ) : error ? (
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={40} style={{ marginBottom: '10px' }} />
            <p>{error}</p>
            <button className="btn btn-outline" onClick={fetchTrainerData}>
              <RefreshCw size={14} /> Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div>
                <div className="stats-grid">
                  <div className="stat-card glass-panel" onClick={() => setActiveTab('members')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon blue"><Users size={24} /></div>
                    <div>
                      <span className="stat-label">Assigned Trainees</span>
                      <h3 className="stat-value">{members.length}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel" onClick={() => setActiveTab('plans')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon purple"><Dumbbell size={24} /></div>
                    <div>
                      <span className="stat-label">Workout Plans Assigned</span>
                      <h3 className="stat-value">{workoutPlansList.length}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel" onClick={() => setActiveTab('diets')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon green"><Utensils size={24} /></div>
                    <div>
                      <span className="stat-label">Diet Plans Prescribed</span>
                      <h3 className="stat-value">{dietPlansList.length}</h3>
                    </div>
                  </div>

                  <div className="stat-card glass-panel" onClick={() => setActiveTab('chat')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon amber"><MessageSquare size={24} /></div>
                    <div>
                      <span className="stat-label">Active Chat Sessions</span>
                      <h3 className="stat-value">{members.length > 0 ? members.length : 0}</h3>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '24px' }}>
                  <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={18} color="var(--primary-accent)" /> Fast Assignment Workflow
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                      Assign tailored workout routines and meal plans directly to gym members. All plans appear instantly in the member's <strong>YourGym</strong> portal.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('plans')}>
                        <Plus size={14} /> Assign Workout Plan
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('diets')}>
                        <Plus size={14} /> Assign Diet Plan
                      </button>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={18} color="#10b981" /> Trainee Roster Quick Access
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {members.slice(0, 3).map(m => (
                        <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                          <span><strong>{m.name}</strong> ({m.gender || 'Member'})</span>
                          <button className="btn btn-outline btn-sm" onClick={() => handleSelectChatMember(m)}>
                            Message
                          </button>
                        </div>
                      ))}
                      {members.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No trainees currently enrolled in {assignedGymName}.</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TRAINEE MEMBERS */}
            {activeTab === 'members' && (
              <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Assigned Trainee Roster ({filteredMembers.length})</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Members subscribed to {assignedGymName}</p>
                  </div>
                  <div className="search-bar" style={{ minWidth: '240px' }}>
                    <Search size={18} color="var(--text-secondary)" />
                    <input type="text" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                </div>

                {filteredMembers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <Users size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No members match your search.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Trainee</th>
                          <th>Email</th>
                          <th>Gender</th>
                          <th>Membership</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map(m => (
                          <tr key={m._id}>
                            <td><strong>{m.name}</strong></td>
                            <td>{m.email}</td>
                            <td>{m.gender || 'Not specified'}</td>
                            <td><span className="status-pill approved">{m.gymMembershipType || 'Monthly'}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  className="btn btn-sm btn-outline" 
                                  onClick={() => {
                                    setWorkoutForm(prev => ({ ...prev, memberName: m.name }));
                                    setActiveTab('plans');
                                  }}
                                >
                                  Assign Workout
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline"
                                  onClick={() => {
                                    setDietForm(prev => ({ ...prev, memberName: m.name }));
                                    setActiveTab('diets');
                                  }}
                                >
                                  Assign Diet
                                </button>
                                <button 
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleSelectChatMember(m)}
                                >
                                  Chat
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

            {/* TAB 3: WORKOUT PLANS */}
            {activeTab === 'plans' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0' }}>Assign Workout Plan</h3>
                  <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)' }}>
                    Prescribe custom lifting exercises, sets, and rep targets for a specific member.
                  </p>

                  <form onSubmit={handleAssignWorkout} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '750px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Target Trainee</label>
                        <select 
                          required 
                          className="search-input" 
                          value={workoutForm.memberName} 
                          onChange={e => setWorkoutForm({ ...workoutForm, memberName: e.target.value })}
                        >
                          <option value="">Select Member...</option>
                          {members.map(m => (
                            <option key={m._id} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Scheduled Date</label>
                        <input 
                          type="date" 
                          required 
                          className="search-input" 
                          value={selectedDate} 
                          onChange={e => setSelectedDate(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Plan Title</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Chest & Triceps Hypertrophy Day" 
                        className="search-input" 
                        value={workoutForm.title} 
                        onChange={e => setWorkoutForm({ ...workoutForm, title: e.target.value })} 
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Prescribed Exercises</label>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <select 
                          className="search-input" 
                          onChange={e => {
                            if (e.target.value && !selectedExercises.includes(e.target.value)) {
                              setSelectedExercises([...selectedExercises, e.target.value]);
                            }
                          }}
                          value=""
                        >
                          <option value="">Add from Exercise Library...</option>
                          {exercises.map(ex => (
                            <option key={ex._id || ex.id} value={ex.name}>{ex.name} ({ex.targetMuscles?.[0] || 'General'})</option>
                          ))}
                        </select>
                      </div>

                      {selectedExercises.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                          {selectedExercises.map((name, i) => (
                            <span key={i} className="category-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary-accent)', color: '#fff' }}>
                              {name}
                              <button type="button" onClick={() => setSelectedExercises(selectedExercises.filter(x => x !== name))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Routine Instructions & Cues</label>
                      <textarea 
                        rows={3} 
                        className="search-input" 
                        placeholder="e.g. Rest 90 seconds between compound lifts. Focus on slow 3-second negative eccentric." 
                        value={workoutForm.description} 
                        onChange={e => setWorkoutForm({ ...workoutForm, description: e.target.value })} 
                      />
                    </div>

                    <div>
                      <button type="submit" className="btn btn-primary" disabled={isAssigningWorkout}>
                        <Dumbbell size={16} /> {isAssigningWorkout ? 'Assigning Plan...' : 'Assign Workout Routine'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Assigned Workout Plans List */}
                <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                  <h4 style={{ margin: '0 0 16px 0' }}>Assigned Workout Plans History ({workoutPlansList.length})</h4>
                  {workoutPlansList.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No workout plans currently logged.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      {workoutPlansList.map(p => (
                        <div key={p._id} className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                          <strong>{p.title}</strong>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0' }}>
                            Trainee: <strong>{p.memberName}</strong>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '6px 0' }}>{p.description}</p>
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary-accent)' }}>
                            {(p.schedule?.[0]?.exercises || []).length} Exercises Prescribed
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: DEDICATED DIET PLANS (PHASE 4) */}
            {activeTab === 'diets' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0' }}>Dedicated Diet Plan Assignment</h3>
                  <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)' }}>
                    Prescribe targeted caloric intakes, macronutrient distributions, and structured meal schedules.
                  </p>

                  <form onSubmit={handleAssignDiet} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '750px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Select Trainee</label>
                        <select 
                          required 
                          className="search-input" 
                          value={dietForm.memberName} 
                          onChange={e => setDietForm({ ...dietForm, memberName: e.target.value })}
                        >
                          <option value="">Select Member...</option>
                          {members.map(m => (
                            <option key={m._id} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Diet Plan Title</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. Lean Shred & High Protein Protocol" 
                          className="search-input" 
                          value={dietForm.title} 
                          onChange={e => setDietForm({ ...dietForm, title: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Daily Calories</label>
                        <input 
                          type="number" 
                          required 
                          className="search-input" 
                          value={dietForm.targetCalories} 
                          onChange={e => setDietForm({ ...dietForm, targetCalories: e.target.value })} 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Protein (g)</label>
                        <input 
                          type="number" 
                          className="search-input" 
                          value={dietForm.proteinGrams} 
                          onChange={e => setDietForm({ ...dietForm, proteinGrams: e.target.value })} 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Carbohydrates (g)</label>
                        <input 
                          type="number" 
                          className="search-input" 
                          value={dietForm.carbsGrams} 
                          onChange={e => setDietForm({ ...dietForm, carbsGrams: e.target.value })} 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Fats (g)</label>
                        <input 
                          type="number" 
                          className="search-input" 
                          value={dietForm.fatGrams} 
                          onChange={e => setDietForm({ ...dietForm, fatGrams: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px' }}>Daily Meal Breakdown & Guidelines</label>
                      <textarea 
                        rows={4} 
                        required 
                        className="search-input" 
                        placeholder="Detail Breakfast, Lunch, Post-workout meal, Dinner, hydration goals..." 
                        value={dietForm.description} 
                        onChange={e => setDietForm({ ...dietForm, description: e.target.value })} 
                      />
                    </div>

                    <div>
                      <button type="submit" className="btn btn-primary" disabled={isAssigningDiet} style={{ background: '#10b981', borderColor: '#10b981' }}>
                        <Utensils size={16} /> {isAssigningDiet ? 'Prescribing Diet...' : 'Prescribe Diet Plan'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Prescribed Diet Plans List */}
                <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#10b981' }}>Prescribed Diet Plans History ({dietPlansList.length})</h4>
                  {dietPlansList.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No diet plans assigned yet.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      {dietPlansList.map(d => (
                        <div key={d._id} className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                          <strong style={{ color: '#10b981' }}>{d.title}</strong>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0' }}>
                            Assigned to: <strong>{d.memberName}</strong>
                          </div>
                          {d.nutritionMacros && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '6px 0', fontSize: '0.78rem' }}>
                              <span className="category-badge">{d.nutritionMacros.calories} kcal</span>
                              <span className="category-badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>P: {d.nutritionMacros.proteinGrams}g</span>
                              <span className="category-badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>C: {d.nutritionMacros.carbsGrams}g</span>
                            </div>
                          )}
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '6px 0', lineHeight: 1.5 }}>
                            {d.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: CHAT */}
            {activeTab === 'chat' && (
              <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
                <h3 style={{ margin: '0 0 16px 0' }}>
                  Direct Trainee Communication {selectedMember ? `— Chatting with ${selectedMember.name}` : ''}
                </h3>

                {!selectedMember ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>Select a trainee from the Trainees tab to open a direct messaging session.</p>
                    <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('members')}>
                      Go to Trainees Roster
                    </button>
                  </div>
                ) : (
                  <div style={{ maxWidth: '700px' }}>
                    <div style={{ height: '320px', overflowY: 'auto', background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {chatMessages.map((msg, i) => (
                        <div key={i} style={{ alignSelf: msg.sender === 'You' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{msg.sender} • {msg.time}</span>
                          <div style={{ 
                            background: msg.sender === 'You' ? 'var(--primary-accent)' : 'rgba(255,255,255,0.06)', 
                            color: '#fff', 
                            padding: '10px 14px', 
                            borderRadius: '10px', 
                            marginTop: '2px' 
                          }}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        className="search-input" 
                        placeholder={`Message ${selectedMember.name}...`}
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                      />
                      <button type="submit" className="btn btn-primary" disabled={!messageInput.trim()}>
                        <Send size={16} /> Send
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
};

export default GymTrainerDashboard;
