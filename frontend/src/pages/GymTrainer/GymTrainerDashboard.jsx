import React, { useState, useEffect } from 'react';
import { Users, Dumbbell, MessageSquare, Send, Search, Activity, User, Plus, CalendarDays, Utensils } from 'lucide-react';
import { toast } from 'react-toastify';
import './GymTrainerDashboard.css';

const GymTrainerDashboard = () => {
  const trainerName = localStorage.getItem('gymsync_user_name') || 'Gym Trainer';
  const [assignedGymName, setAssignedGymName] = useState('');
  const [activeTab, setActiveTab] = useState('members'); // 'members', 'assign', 'chat'

  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  // Exercise Assignment State
  const [exercises, setExercises] = useState([]);
  const [assignmentForm, setPlanAssignment] = useState({
    memberName: '',
    title: 'Custom Gym Routine',
    planType: 'Workout',
    description: '3 Sets of 12 Reps for each prescribed exercise. Maintain proper tempo and stay hydrated.'
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [customExercise, setCustomExercise] = useState('');
  const [dietInstructions, setDietInstructions] = useState('');

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    fetchTrainerInfo();
    fetchExerciseLibrary();
  }, []);

  const fetchTrainerInfo = async () => {
    try {
      const res = await fetch(`/api/users/${trainerName}`);
      if (res.ok) {
        const user = await res.json();
        const gymName = user.assignedGymName || localStorage.getItem('gymsync_user_gym') || 'PowerHouse Gym';
        setAssignedGymName(gymName);
        fetchGymMembers(gymName);
      }
    } catch (e) {
      console.error('Error fetching trainer info:', e);
    }
  };

  const fetchGymMembers = async (gymName) => {
    try {
      const res = await fetch(`/api/users/gym-members/${gymName}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching gym members:', e);
    }
  };

  const fetchExerciseLibrary = async () => {
    try {
      const res = await fetch('/api/exercises');
      if (res.ok) {
        setExercises(await res.json());
      }
    } catch (e) {
      console.error('Error fetching exercises:', e);
    }
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    if (!assignmentForm.memberName || !assignmentForm.title) {
      return toast.warn('Member name and title are required');
    }

    try {
      const res = await fetch('/api/gym-owner/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': trainerName,
          'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({
          gymId: assignedGymName,
          memberName: assignmentForm.memberName,
          planType: assignmentForm.planType,
          title: assignmentForm.title,
          description: assignmentForm.description,
          schedule: [{
            date: selectedDate,
            day: new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' }),
            routine: assignmentForm.description,
            exercises: selectedExercises.map(name => ({ name, sets: '3', reps: '12', notes: '' })),
            dietInstructions
          }]
        })
      });

      if (res.ok) {
        toast.success(`Workout assigned to ${assignmentForm.memberName}!`);
        setPlanAssignment({ memberName: '', title: 'Custom Gym Routine', planType: 'Workout', description: '' });
        setSelectedExercises([]);
        setCustomExercise('');
        setDietInstructions('');
      } else {
        toast.error('Failed to assign workout');
      }
    } catch (err) {
      toast.error('Error assigning workout to member');
    }
  };

  const loadConversation = async (member) => {
    setSelectedMember(member);
    try {
      const response = await fetch(`/api/chat/${trainerName}/${member.name}`);
      if (!response.ok) throw new Error('Unable to load messages');
      const data = await response.json();
      setChatMessages(data.map(message => ({ ...message, timestamp: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })));
    } catch (error) {
      toast.error('Could not load this chat history.');
    }
  };

  const monthDays = Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, index) => {
    const date = new Date(new Date().getFullYear(), new Date().getMonth(), index + 1);
    return date.toISOString().slice(0, 10);
  });

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedMember) return;
    
    const newMsg = {
      sender: trainerName,
      receiver: selectedMember.name,
      text: messageInput,
      timestamp: new Date().toLocaleTimeString()
    };
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: trainerName, receiver: selectedMember.name, text: messageInput.trim() })
      });
      if (!response.ok) throw new Error('Unable to send message.');
      setChatMessages(previous => [...previous, newMsg]);
      setMessageInput('');
      toast.success(`Message sent to ${selectedMember.name}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="gym-trainer-dashboard container" style={{ paddingTop: '100px', paddingBottom: '60px' }}>
      {/* Header Banner */}
      <div className="glass-panel trainer-header" style={{ padding: '30px', borderRadius: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Dumbbell size={32} color="var(--primary-accent)" />
            <h1 style={{ margin: 0, fontSize: '2rem' }}>Gym Trainer Portal</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Logged in as <strong>{trainerName}</strong> • Official Trainer for <span style={{ color: 'var(--primary-accent)', fontWeight: 600 }}>{assignedGymName || 'Assigned Gym'}</span></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="trainer-tabs" style={{ marginBottom: '30px' }}>
        <button className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          <Users size={18} /> Gym Members ({members.length})
        </button>
        <button className={`tab-btn ${activeTab === 'assign' ? 'active' : ''}`} onClick={() => setActiveTab('assign')}>
          <Activity size={18} /> Assign Exercises
        </button>
        <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          <MessageSquare size={18} /> Member Chat {selectedMember && `(With ${selectedMember.name})`}
        </button>
      </div>

      {/* TAB 1: MEMBERS ROSTER */}
      {activeTab === 'members' && (
        <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <h3 style={{ margin: 0 }}>Subscribed Members at {assignedGymName}</h3>
            <div className="search-bar" style={{ minWidth: '250px' }}>
              <Search size={18} color="var(--text-secondary)" />
              <input type="text" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Subscription Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.filter(m => m.name.toLowerCase().includes(search.toLowerCase())).map(m => (
                  <tr key={m._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <strong>{m.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="category-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>Active Member</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => {
                          setPlanAssignment({ ...assignmentForm, memberName: m.name });
                          setActiveTab('assign');
                        }}>
                          <Plus size={14} /> Assign Routine
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => {
                          loadConversation(m);
                          setActiveTab('chat');
                        }}>
                          <MessageSquare size={14} /> Chat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      No members currently subscribed to {assignedGymName}. Members who subscribe to this gym will automatically appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGN EXERCISES */}
      {activeTab === 'assign' && (
        <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Assign Workout & Exercise Routine</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Create custom exercise schedules for members subscribed to {assignedGymName}</p>

          <form onSubmit={handleAssignPlan} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '600px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Select Member</label>
              <select 
                className="search-input" 
                required 
                value={assignmentForm.memberName} 
                onChange={e => setPlanAssignment({ ...assignmentForm, memberName: e.target.value })}
              >
                <option value="">-- Choose Member --</option>
                {members.map(m => (
                  <option key={m._id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px' }}><CalendarDays size={15} style={{ verticalAlign: 'middle' }} /> Pick a date in this month</label>
              <div className="routine-calendar">
                {monthDays.map(date => (
                  <button type="button" key={date} className={selectedDate === date ? 'selected' : ''} onClick={() => setSelectedDate(date)}>
                    {new Date(`${date}T12:00:00`).getDate()}
                  </button>
                ))}
              </div>
              <small style={{ color: 'var(--text-secondary)' }}>Selected: {new Date(`${selectedDate}T12:00:00`).toLocaleDateString()}</small>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px' }}>Choose exercises from library</label>
              <div className="exercise-picker">
                {exercises.slice(0, 24).map(exercise => {
                  const name = exercise.name || exercise.title;
                  return <label key={exercise._id || name}><input type="checkbox" checked={selectedExercises.includes(name)} onChange={() => setSelectedExercises(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name])} /> {name}</label>;
                })}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input className="search-input" value={customExercise} onChange={event => setCustomExercise(event.target.value)} placeholder="Add a custom exercise" />
                <button type="button" className="btn btn-outline" onClick={() => { const item = customExercise.trim(); if (item && !selectedExercises.includes(item)) setSelectedExercises(current => [...current, item]); setCustomExercise(''); }}>Add</button>
              </div>
              {selectedExercises.length > 0 && <small style={{ color: 'var(--primary-accent)' }}>Assigned: {selectedExercises.join(', ')}</small>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Routine Title</label>
              <input 
                type="text" 
                required 
                className="search-input" 
                value={assignmentForm.title} 
                onChange={e => setPlanAssignment({ ...assignmentForm, title: e.target.value })} 
                placeholder="e.g. Chest & Triceps Hypertrophy Day 1" 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}><Utensils size={15} style={{ verticalAlign: 'middle' }} /> Diet guidance for this day (optional)</label>
              <textarea rows="3" className="search-input" value={dietInstructions} onChange={event => setDietInstructions(event.target.value)} placeholder="Meals, calories, protein target, or hydration guidance..." />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Prescribed Exercises & Instructions</label>
              <textarea 
                rows="5" 
                required 
                className="search-input" 
                value={assignmentForm.description} 
                onChange={e => setPlanAssignment({ ...assignmentForm, description: e.target.value })} 
                placeholder="List specific exercise names, sets, reps, and form instructions..." 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
              Assign Workout to {assignmentForm.memberName || 'Member'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: MEMBER CHAT */}
      {activeTab === 'chat' && (
        <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {/* Member Selection Sidebar */}
            <div style={{ flex: '1', minWidth: '220px', background: 'var(--card-bg)', padding: '15px', borderRadius: '14px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Members List</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map(m => (
                  <button 
                    key={m._id} 
                    className={`btn ${selectedMember?._id === m._id ? 'btn-primary' : 'btn-outline'}`} 
                    style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                    onClick={() => loadConversation(m)}
                  >
                    <User size={16} /> {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Conversation Panel */}
            <div style={{ flex: '2', minWidth: '300px', display: 'flex', flexDirection: 'column', height: '420px', background: 'var(--card-bg)', borderRadius: '14px', padding: '15px' }}>
              {selectedMember ? (
                <>
                  <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--card-border)', marginBottom: '15px' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary-accent)' }}>Chatting with {selectedMember.name}</h4>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
                    {chatMessages.filter(msg => msg.receiver === selectedMember.name || msg.sender === selectedMember.name).length > 0 ? (
                      chatMessages.filter(msg => msg.receiver === selectedMember.name || msg.sender === selectedMember.name).map((msg, idx) => (
                        <div key={idx} style={{ alignSelf: msg.sender === trainerName ? 'flex-end' : 'flex-start', background: msg.sender === trainerName ? '#3b82f6' : 'var(--card-border)', color: msg.sender === trainerName ? '#ffffff' : 'var(--text-primary)', padding: '10px 14px', borderRadius: '12px', maxWidth: '80%' }}>
                          <p style={{ margin: 0, fontSize: '0.9rem' }}>{msg.text}</p>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', display: 'block', textAlign: 'right', marginTop: '4px' }}>{msg.timestamp}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '40px' }}>No messages exchanged yet. Send a greeting to start coaching {selectedMember.name}!</p>
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <input 
                      type="text" 
                      className="search-input" 
                      placeholder={`Message ${selectedMember.name}...`} 
                      value={messageInput} 
                      onChange={e => setMessageInput(e.target.value)} 
                    />
                    <button type="submit" className="btn btn-primary">
                      <Send size={18} />
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                  Select a member from the left list to begin messaging.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GymTrainerDashboard;
