// Role-specific navigation item configurations for GymSync DashboardShell

export const getNavigationForRole = (role) => {
  const normalized = (role || '').toLowerCase().replace(/_/g, '');

  switch (normalized) {
    case 'superadmin':
    case 'admin':
      return [
        { id: 'overview', label: 'System Metrics', icon: 'BarChart2' },
        { id: 'users', label: 'User & Role Management', icon: 'Users' },
        { id: 'gyms', label: 'Gym Facility Approvals', icon: 'Building' },
        { id: 'moderation', label: 'Post Moderation', icon: 'ShieldAlert' },
        { id: 'complaints', label: 'Complaints Queue', icon: 'MessageSquare' },
        { id: 'payments', label: 'Payment Verifications', icon: 'CreditCard' },
        { id: 'broadcast', label: 'Subscriber Broadcast', icon: 'Megaphone' },
        { id: 'audit', label: 'Senior Audit Logs', icon: 'FileText' }
      ];

    case 'complaintmoderator':
      return [
        { id: 'overview', label: 'Moderation Metrics', icon: 'BarChart2' },
        { id: 'moderation', label: 'Post Moderation', icon: 'ShieldAlert' },
        { id: 'complaints', label: 'Complaints Queue', icon: 'MessageSquare' }
      ];

    case 'gymowner':
      return [
        { id: 'overview', label: 'Facility Dashboard', icon: 'Activity' },
        { id: 'facility', label: 'Gym Info & Settings', icon: 'Building' },
        { id: 'members', label: 'Member Roster', icon: 'Users' },
        { id: 'attendance', label: 'Attendance Check-In/Out', icon: 'Clock' },
        { id: 'trainers', label: 'Gym Trainers', icon: 'UserCheck' },
        { id: 'plans', label: 'Assigned Workout Plans', icon: 'Dumbbell' }
      ];

    case 'gymtrainer':
      return [
        { id: 'overview', label: 'Trainer Overview', icon: 'Activity' },
        { id: 'members', label: 'Assigned Trainees', icon: 'Users' },
        { id: 'plans', label: 'Workout Plan Assignment', icon: 'Dumbbell' },
        { id: 'diets', label: 'Diet Plan Assignment', icon: 'Utensils' }
      ];

    case 'fitnessinstructor':
      return [
        { id: 'overview', label: 'Instructor Overview', icon: 'Activity' },
        { id: 'exercises', label: 'Exercise Library Management', icon: 'Dumbbell' },
        { id: 'plans', label: 'Pre-made Workout Plans', icon: 'Calendar' }
      ];

    case 'storemanager':
      return [
        { id: 'overview', label: 'Store Overview', icon: 'BarChart2' },
        { id: 'products', label: 'Product Inventory', icon: 'Package' },
        { id: 'orders', label: 'Order Processing', icon: 'ShoppingCart' }
      ];

    case 'user':
    default:
      return [
        { id: 'overview', label: 'Fitness Overview', icon: 'Activity' },
        { id: 'membership', label: 'Gym Membership', icon: 'Building' },
        { id: 'history', label: 'Workout History', icon: 'Calendar' },
        { id: 'complaints', label: 'Support & Complaints', icon: 'HelpCircle' }
      ];
  }
};
