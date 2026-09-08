import React, { useState, useEffect } from 'react';
import { Plus, CheckSquare, Clock, AlertTriangle, Trash2, CheckCircle, RefreshCw, Send, User, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';

const InstructorTaskManagement = () => {
  const [requests, setRequests] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch('/api/instructor-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Fetch requests error:', err);
      toast.error('Failed to load instructor requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const fitnessInstructors = data.filter(u => u.role === 'FitnessInstructor');
        setInstructors(fitnessInstructors);
      }
    } catch (err) {
      console.warn('Could not load instructor list:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchInstructors();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.warning('Task title is required');

    try {
      setSubmitting(true);
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch('/api/instructor-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          assignedTo: assignedTo || undefined,
          dueDate: dueDate || undefined
        })
      });

      if (res.ok) {
        toast.success('Instructor task dispatched successfully');
        setTitle('');
        setDescription('');
        setPriority('Medium');
        setAssignedTo('');
        setDueDate('');
        setShowCreateModal(false);
        fetchRequests();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || 'Failed to dispatch task');
      }
    } catch (err) {
      console.error('Dispatch task error:', err);
      toast.error('Network error creating task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch(`/api/instructor-requests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Task removed');
        setRequests(prev => prev.filter(r => r._id !== id));
      } else {
        toast.error('Failed to delete task');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  };

  const handleMarkCompleted = async (id) => {
    try {
      const token = localStorage.getItem('gymsync_token');
      const res = await fetch(`/api/instructor-requests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Completed' })
      });
      if (res.ok) {
        toast.success('Task marked as completed');
        fetchRequests();
      } else {
        toast.error('Failed to update status');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filterStatus === 'All') return true;
    return r.status === filterStatus;
  });

  const getPriorityBadgeStyle = (p) => {
    switch (p) {
      case 'Urgent': return { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444' };
      case 'High': return { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid #f59e0b' };
      case 'Low': return { background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', border: '1px solid #6b7280' };
      default: return { background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid #3b82f6' };
    }
  };

  const getStatusBadgeStyle = (s) => {
    switch (s) {
      case 'Completed': return { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' };
      case 'In Progress': return { background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' };
      case 'Dismissed': return { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' };
      default: return { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' };
    }
  };

  return (
    <div className="instructor-task-management" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', margin: 0 }}>
            <CheckSquare size={26} color="var(--primary-accent)" /> Fitness Instructor Tasks & Requests
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            Assign targeted content creation, curriculum reviews, or guideline requests to Fitness Instructors.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline btn-sm" onClick={fetchRequests}>
            <RefreshCw size={14} style={{ marginRight: '6px' }} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Create Instructor Task
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px' }}>
        {['All', 'Pending', 'In Progress', 'Completed'].map(status => (
          <button
            key={status}
            className={`btn btn-sm ${filterStatus === status ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus(status)}
            style={{ borderRadius: '20px', padding: '5px 14px' }}
          >
            {status} ({requests.filter(r => status === 'All' ? true : r.status === status).length})
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          Loading instructor requests...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--card-border)' }}>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>No instructor tasks matching this filter.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={14} style={{ marginRight: '6px' }} /> Dispatch New Task
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredRequests.map(task => (
            <div
              key={task._id}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '14px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ ...getPriorityBadgeStyle(task.priority), padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600 }}>
                    {task.priority || 'Normal'} Priority
                  </span>
                  <span style={{ ...getStatusBadgeStyle(task.status), padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {task.status}
                  </span>
                </div>

                <h4 style={{ color: 'var(--text-primary)', margin: '0 0 6px 0', fontSize: '1.05rem' }}>{task.title}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                  {task.description}
                </p>

                {task.responseNotes && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '8px 10px', fontSize: '0.82rem', color: '#93c5fd', marginTop: '8px' }}>
                    <strong>Instructor Note:</strong> {task.responseNotes}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <div>
                  {task.assignedTo ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <User size={13} /> {task.assignedTo}
                    </span>
                  ) : (
                    <span>All Instructors</span>
                  )}
                  {task.dueDate && (
                    <span style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {task.status !== 'Completed' && (
                    <button
                      className="btn btn-outline btn-sm"
                      title="Mark as Completed"
                      style={{ padding: '4px 8px' }}
                      onClick={() => handleMarkCompleted(task._id)}
                    >
                      <CheckCircle size={14} color="#10b981" />
                    </button>
                  )}
                  <button
                    className="btn btn-outline btn-sm"
                    title="Delete Task"
                    style={{ padding: '4px 8px', color: '#ef4444' }}
                    onClick={() => handleDeleteTask(task._id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg, #111827)',
            border: '1px solid var(--card-border)',
            borderRadius: '16px',
            maxWidth: '540px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 16px 0', fontSize: '1.3rem' }}>
              Dispatch Fitness Instructor Task
            </h3>

            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Create 4-Week Hypertrophy Program"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Detailed Objective / Instructions
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Specify targeted sports, exercise techniques, meal plans, or criteria to include..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Priority
                  </label>
                  <select
                    className="form-control"
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Assign To Specific Instructor (Optional)
                </label>
                <select
                  className="form-control"
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                >
                  <option value="">All Certified Instructors (Open Assignment)</option>
                  {instructors.map(inst => (
                    <option key={inst._id || inst.id} value={inst.name || inst.email}>
                      {inst.name || inst.email} ({inst.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting}
                >
                  {submitting ? 'Dispatching...' : 'Dispatch Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorTaskManagement;
