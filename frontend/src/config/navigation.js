// Role-specific navigation item configurations for GymSync DashboardShell

export const getNavigationForRole = (role) => {
  const normalized = (role || '').toLowerCase().replace(/_/g, '');

  switch (normalized) {
    case 'superadmin':
    case 'admin':
      return [
        { id: 'overview', label: 'System Metrics', icon: 'BarChart2' },
        { id: 'users', label: 'User & Role Management', icon: 'Users' },
        { id: 'instructor_tasks', label: 'Instructor Tasks', icon: 'CheckSquare' },
        { id: 'gyms', label: 'Gym Facility Approvals', icon: 'Building' },
        { id: 'store_oversight', label: 'Store & Product Oversight', icon: 'ShoppingBag' },
        { id: 'suggestions', label: 'Discover & Ads Spotlight', icon: 'Sparkles' },
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
        { id: 'branches', label: 'My Gyms / Branches', icon: 'Building' },
        { id: 'members', label: 'Members & Payments', icon: 'CreditCard' },
        { id: 'attendance', label: 'Attendance Check-In', icon: 'Clock' },
        { id: 'plans', label: 'Member Plans', icon: 'FileText' },
        { id: 'tours', label: 'Tour Requests', icon: 'Calendar' },
        { id: 'trainers', label: 'Gym Trainers', icon: 'Users' },
        { id: 'settings', label: 'Facility Info & Settings', icon: 'Edit' },
        { id: 'equipment', label: 'Equipment Inventory', icon: 'Dumbbell' },
        { id: 'offers', label: 'My Offers', icon: 'DollarSign' }
      ];

    case 'gymtrainer':
      return [
        { id: 'overview', label: 'Trainer Overview', icon: 'Activity' },
        { id: 'members', label: 'Assigned Trainees', icon: 'Users' },
        { id: 'plans', label: 'Workout Plan Assignment', icon: 'Dumbbell' },
        { id: 'diets', label: 'Diet Plan Assignment', icon: 'Utensils' },
        { id: 'chat', label: 'Trainee Messages', icon: 'MessageSquare' }
      ];

    case 'fitnessinstructor':
      return [
        { id: 'overview', label: 'Instructor Overview', icon: 'Activity' },
        { id: 'exercises', label: 'Exercise Library Management', icon: 'Dumbbell' },
        { id: 'programs', label: 'Workout Programs', icon: 'Calendar' },
        { id: 'diet', label: 'Diet Plans', icon: 'Utensils' },
        { id: 'articles', label: 'Educational Articles', icon: 'FileText' },
        { id: 'requests', label: 'Admin Requests', icon: 'MessageSquare' }
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
