# GymSync System Architecture & Developer Reference

## 1. Overview & Core Tech Stack
GymSync is a multi-tenant hybrid fitness management platform built using:
- **Frontend:** React 18, Vite, React Router v6, Vanilla CSS (Design System Tokens).
- **Backend:** Node.js, Express.js (REST API), Serverless deployment via Vercel.
- **Database:** MongoDB Atlas (Mongoose ODM).
- **Authentication:** JWT Bearer tokens with database-backed Role-Based Access Control (RBAC).
- **Computer Vision & AI Tracking:** Dynamic modular AI Detector Registry (`pushup_v1` MoveNet pose estimation, `running_v1` HTML5 Geolocation Haversine tracker).

---

## 2. Frontend Directory Structure

```text
frontend/src/
├── config/
│   └── navigation.js             # Centralized role-based navigation menus
├── services/
│   ├── api.js                    # Core HTTP fetch wrapper with Bearer token insertion
│   ├── authService.js            # Auth & session management
│   ├── postService.js            # Social timeline posts, comments & replies
│   ├── gymService.js             # Gym facilities, member rosters & check-in/out
│   ├── adminService.js           # Admin stats, user role management & audit logs
│   └── storeService.js           # E-commerce catalog & checkout payments
├── features/
│   ├── social/
│   │   ├── components/           # PostCard, PostList, CreatePostModal
│   │   └── utils/                # feedRanking.js (deterministic scoring)
│   ├── exercises/
│   │   └── components/           # ExerciseCard, ExerciseFilterBar
│   ├── gyms/
│   │   └── components/           # GymCard, MemberRosterTable
│   └── store/
│       └── components/           # ProductCard, PaymentModal
├── components/
│   ├── common/                   # Modal, ConfirmDialog, LoadingSpinner, EmptyState
│   ├── layout/                   # Navbar, Footer, DashboardShell
│   └── ui/                       # StatCard, DataTable, SearchBar, Badge
├── dashboards/                   # Role views composed via DashboardShell
├── pages/                        # Page routers (Home, Profile, Admin, Store, etc.)
└── ai-detectors/
    ├── registry.js               # Safe detector allowlist metadata
    ├── pushup-v1.js              # TensorFlow/MoveNet pose estimator
    └── running-v1.js             # GPS Haversine tracker
```

---

## 3. Supported User Roles & Responsibilities

| Role Name | Access Level | Primary Dashboard Capabilities |
| :--- | :--- | :--- |
| **Guest** | Unauthenticated | Explore gym catalog, public posts (read-only). |
| **User (Trainee)** | Normal Trainee | Personalized fitness overview, assigned plans, timeline posts, running tracker, AI workout generator. |
| **GymOwner** | Partner Gym Owner | Gym profile management, member rosters, attendance check-in/out, trainer assignments. |
| **GymTrainer** | Trainer | Assigned member workout/diet plan creation & progress tracking. |
| **FitnessInstructor** | Content Creator | Exercise library creation/editing, AI detector configuration. |
| **StoreManager** | E-commerce | Product inventory, order processing, stock updates. |
| **ComplaintModerator**| Moderation | Complaints queue resolution & post content moderation. |
| **Admin** | Administrator | System metrics, user role assignments, gym approvals, reported post removal. |
| **SuperAdmin** | Highest Authority | Full administrative control, senior audit log access, role elevation. |

---

## 4. Social Feed Ranking Algorithm (`feedRanking.js`)

Posts on the GymSync timeline are scored deterministically based on four signals:
$$\text{Score} = \text{RecencyScore} + \text{RelationshipScore} + \text{EngagementScore} + \text{FreshnessBonus} - \text{SeenPenalty}$$

- **Recency:** Decay of 2.5 points per hour past creation.
- **Relationship:** Friend (+50 pts), Following (+30 pts), Self (+40 pts).
- **Engagement:** Likes $\times 3$ + Comments $\times 5$ (Capped at 50 pts).
- **Freshness:** Unseen (+15 pts), Already seen (-25 pts).

---

## 5. Modular AI Exercise Architecture & Allowlisting

GymSync isolates AI detector logic from MongoDB persistence:
1. **MongoDB:** Stores only metadata (`aiDetection: { enabled: true, detectorId: "running_v1", detectorVersion: "1.0" }`).
2. **Backend Validation:** Express controller verifies `detectorId` against server allowlist (`SAFE_DETECTORS`).
3. **Lazy Bundle Loading:** Frontend dynamic imports (`import()`) download AI scripts ONLY when user clicks `[ DO WITH AI ]`.
4. **Graceful Fallback:** If camera or GPS permissions are denied, users seamlessly proceed with manual workout recording (`[ DO WITHOUT AI ]`).
