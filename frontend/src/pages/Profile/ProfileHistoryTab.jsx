import React from 'react';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import WorkoutCalendar from '../../components/common/WorkoutCalendar';

const ProfileHistoryTab = ({ upcoming, todayHistory, safeHistory, aiPlan, workoutProgress }) => {
  return (
    <div className="history-grid">
      {/* Upcoming / AI Schedule */}
      <div className="glass-panel section-panel">
        <h3 className="section-title"><Calendar size={20}/> Upcoming AI Schedule</h3>
        {upcoming.length > 0 ? (
          upcoming.map(up => (
            <div key={up.id} className="history-item upcoming">
              <Clock size={16} color="var(--primary-accent)"/>
              <div style={{flex: 1}}>
                <h4>{up.name}</h4>
                <span className="time">{up.date}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-text">Complete your Bio Data to generate your AI Schedule.</p>
        )}
      </div>

      {/* Today's Exercises */}
      <div className="glass-panel section-panel">
        <h3 className="section-title"><CheckCircle size={20} color="#10b981"/> Today's Exercises</h3>
        {todayHistory.length > 0 ? (
          todayHistory.map((h, i) => (
            <div key={i} className="history-item completed">
              <div>
                <h4>{h.name}</h4>
                <span className="time">+{h.pointsEarned} Points • {h.trackedViaAI ? 'AI Tracked' : 'Manual'}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-text">No exercises completed today. Head to the Workout Hub!</p>
        )}
      </div>

      {/* Past Workouts Calendar */}
      <div className="glass-panel section-panel" style={{gridColumn: '1/-1'}}>
        <h3 className="section-title"><Calendar size={20}/> Past Workouts</h3>
        <WorkoutCalendar history={safeHistory} aiPlan={aiPlan} workoutProgress={workoutProgress} />
      </div>
    </div>
  );
};

export default ProfileHistoryTab;
