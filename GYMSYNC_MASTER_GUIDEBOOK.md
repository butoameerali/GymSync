# 📖 GymSync Complete Master Guidebook & Architecture Blueprint

> **System Version**: GymSync 2.0  
> **Document Purpose**: Complete, unfiltered functional documentation of every role, dashboard, tab, button, API endpoint, database model, and background engine across the entire GymSync ecosystem.

---

## 📑 Table of Contents
1. [User Roles & Authorization Matrix](#1-user-roles--authorization-matrix)
2. [Role-by-Role Complete Feature Breakdown](#2-role-by-role-complete-feature-breakdown)
   - [2.1 SuperAdmin & Admin](#21-superadmin--admin)
   - [2.2 Gym Owner (`GymOwner`)](#22-gym-owner-gymowner)
   - [2.3 Gym Trainer (`GymTrainer`)](#23-gym-trainer-gymtrainer)
   - [2.4 Fitness Instructor (`FitnessInstructor`)](#24-fitness-instructor-fitnessinstructor)
   - [2.5 Store Manager (`StoreManager`)](#25-store-manager-storemanager)
   - [2.6 Complaint Moderator (`ComplaintModerator`)](#26-complaint-moderator-complaintmoderator)
   - [2.7 Regular Trainee / Member (`User`)](#27-regular-trainee--member-user)
   - [2.8 Public Visitor / Unauthenticated Guest](#28-public-visitor--unauthenticated-guest)
3. [Universal System Modules & Subsystems](#3-universal-system-modules--subsystems)
   - [3.1 AI Workout Hub & Dynamic 28-Day Periodized Calendar](#31-ai-workout-hub--dynamic-28-day-periodized-calendar)
   - [3.2 Computer Vision Pose Tracking (AI Pushup Counter)](#32-computer-vision-pose-tracking-ai-pushup-counter)
   - [3.3 GPS Outdoor Running Tracker](#33-gps-outdoor-running-tracker)
   - [3.4 Health & Medical Bio Calibration (Onboarding Wizard)](#34-health--medical-bio-calibration-onboarding-wizard)
   - [3.5 Goal Engine, Milestone Planner & Safety Screening](#35-goal-engine-milestone-planner--safety-screening)
   - [3.6 Home Community Feed & Social Network](#36-home-community-feed--social-network)
   - [3.7 Explore Gyms & Virtual Gym Details](#37-explore-gyms--virtual-gym-details)
   - [3.8 Your Gym & Real-Time QR Check-in](#38-your-gym--real-time-qr-check-in)
   - [3.9 GymSync Ecommerce Store & Checkout](#39-gymsync-ecommerce-store--checkout)
   - [3.10 Support Tickets & Moderated Complaint Chat](#310-support-tickets--moderated-complaint-chat)
   - [3.11 Real-Time Notifications & Direct Messages](#311-real-time-notifications--direct-messages)
4. [Security Architecture & Defensive Hardening](#4-security-architecture--defensive-hardening)
5. [Database Models Reference (MongoDB)](#5-database-models-reference-mongodb)

---

## 1. User Roles & Authorization Matrix

GymSync supports **8 distinct user roles** + Guest access. Every route is protected by `authMiddleware.js` on the backend and `ProtectedRoute` / `ConsumerRoute` on the frontend.

| Role Name | Access Level | Primary Dashboard Path | Navbar Scope |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** | Full system governance, audit logs, DB control | `/admin` | Admin, Social, Messages, Notifications, Profile |
| **Admin** | Platform operations, approvals, moderation | `/admin` | Admin, Social, Messages, Notifications, Profile |
| **GymOwner** | Gym business management, attendance, plans | `/gym-owner` | Gym Owner Hub, Community, Profile |
| **GymTrainer** | On-premise trainees, review queue, workout/diet | `/gym-trainer` | Trainer Hub, Community, Profile |
| **FitnessInstructor** | Content Creator: AI-verified exercises, articles | `/fitness-instructor` | Instructor Studio, Community, Profile |
| **StoreManager** | Inventory, catalog, order fulfillment | `/store-manager` | Store Manager Hub, Profile |
| **ComplaintModerator** | Content moderation, complaint ticket resolution | `/moderator` | Moderator Hub, Community, Profile |
| **User** | Trainee: AI Workouts, Gyms, Store, Feed | `/dashboard`, `/ai-trainer` | Home, Gyms, Workout Hub, Store, Profile |
| **Guest** | Public preview, gym directory, store browsing | `/`, `/explore`, `/store` | Landing Page, Explore Gyms, Store, Login/Register |

---

## 2. Role-by-Role Complete Feature Breakdown

---

### 2.1 SuperAdmin & Admin
* **Dashboard Route**: `/admin`
* **Access Guard**: `allowedRoles: ['Admin', 'SuperAdmin']`
* **Tiers**: `Senior` (Full Audit & DB access) vs `Junior` (Operations only).

#### Tabs & Capabilities:
1. **Overview Tab (`overview`)**:
   - **Metrics Visualized**: Total registered users, active gym memberships, verified gyms, pending gym submissions, reported community posts, and open complaint tickets.
   - **Quick Action**: Direct jump buttons to user management or urgent moderation queues.
2. **Users Management Tab (`users`)**:
   - **View All Accounts**: Filter by role (`User`, `GymOwner`, `GymTrainer`, `FitnessInstructor`, etc.) and account status (`Active`, `Suspended`, `PendingDeletion`).
   - **Role Assignment**: Elevate regular users to Trainers, Store Managers, or Junior Admins.
   - **Account Actions**:
     - *Ban / Unban User*: Updates `isBanned` in MongoDB; revokes live authentication sessions.
     - *Edit User Modal*: Modify user name, email, or assign custom permissions.
     - *Pending Deletions Queue*: Review GDPR/self-requested account deletions with a 30-day grace cancellation option.
3. **Gym Approvals Tab (`gym_approvals` & `gyms`)**:
   - **Pending Submissions**: Review new gyms submitted by `GymOwner`s (verifies business license, address, photos, subscription fees).
   - **Action**: *Approve* (makes gym visible on `/explore`) or *Reject* (returns reason to owner).
4. **Moderation & Reported Posts Tab (`moderation`, `reported_posts`)**:
   - Lists community posts flagged by users for hate speech, harassment, or spam.
   - **Action**: *Dismiss Report* (keeps post live) or *Delete Post* (permanently purges post, comments, and media from Supabase storage).
5. **Complaints & Dispute Resolution Tab (`complaints`, `complaint_chats`)**:
   - Lists escalated customer disputes regarding gym refunds, trainer misconduct, or store order issues.
   - **Action**: Open two-way moderated chat room with user and gym owner to mediate and mark ticket `Resolved`.
6. **Payments & Cashback Tab (`payments`, `cashback`)**:
   - Monitor platform revenue split between gym memberships and store transactions.
   - Trigger manual credit refunds or promotional loyalty points.
7. **System Broadcast Tab (`broadcast`)**:
   - Send platform-wide push notification to all online/offline users simultaneously.
8. **Audit Trail Tab (`audit_logs`)** *(Senior/SuperAdmin only)*:
   - Cryptographic log of every administrative action: IP address, timestamp, admin user ID, targeted document, and prior/post modification state.
9. **Database Control Center Tab (`db_control`)** *(Senior/SuperAdmin only)*:
   - System health metrics: MongoDB ping latency, cache hit ratios, collection document counts.
   - Clean maintenance tools (archive expired OTPs, clean orphaned storage files).

---

### 2.2 Gym Owner (`GymOwner`)
* **Dashboard Route**: `/gym-owner`
* **Access Guard**: `allowedRoles: ['GymOwner', 'gym_owner']`

#### Tabs & Capabilities:
1. **Overview Tab (`overview`)**:
   - Real-time attendance meter (current active members inside the facility).
   - Total monthly revenue, active subscriptions, and renewal retention rates.
2. **Attendance & Live Check-in Tab (`attendance`)**:
   - **Camera / USB Barcode Scanner**: Scan member QR codes at the turnstile or front desk.
   - **Manual Check-in Search**: Look up members by name/email and mark entry/exit timestamps.
   - **Logs Table**: Real-time log of members currently checked in and duration spent in gym.
3. **Membership Plans Tab (`plans`)**:
   - Create and price membership tiers: *Monthly*, *Quarterly*, *Annual*, *Day Pass*.
   - Define plan perks (e.g. Free Locker, Steam Room Access, Free 1-on-1 Trainer Session).
4. **Trainers Management Tab (`trainers`)**:
   - Invite or register on-premise `GymTrainer` staff.
   - Assign trainers to specific shifts or link them to incoming gym members.
5. **Gym Virtual Tour & Media Tab (`tours`)**:
   - Upload facility photos, virtual 360-degree tour URLs, amenities checklist (Free Weights, Showers, Parking, AC).
6. **Equipment Inventory Tab (`equipment`)**:
   - Track gym equipment: machine name, condition (`Operational`, `Needs Maintenance`, `Out of Service`), last inspected date.
7. **Special Offers & Discounts Tab (`offers`)**:
   - Launch limited-time discount coupons for prospective members exploring the gym on the app.
8. **Gym Profile & Settings Tab (`settings`)**:
   - Update gym name, operating hours (e.g., 06:00 AM - 11:00 PM), GPS coordinates, contact phone, and auto-renew bank deposit details.

---

### 2.3 Gym Trainer (`GymTrainer`)
* **Dashboard Route**: `/gym-trainer`
* **Access Guard**: `allowedRoles: ['GymTrainer', 'GymOwner']`

#### Tabs & Capabilities:
1. **Overview Tab (`overview`)**:
   - Daily schedule, roster of assigned trainees, pending goal safety reviews.
2. **Trainee Members Roster (`members`)**:
   - View assigned gym members, their attendance frequency, current workout streak, and goal progress.
   - View trainee medical contraindications (e.g. Lower Back Herniation, Asthma) before assigning exercises.
3. **Custom Workout Builder (`plans`)**:
   - Assign curated day-by-day workout routines to trainees.
   - Pull from the 100+ verified exercise database with custom sets, reps, and target rest timers.
4. **Custom Diet & Nutrition Builder (`diets`)**:
   - Build daily calorie and macro-nutrient meal targets (Protein, Carbs, Fats).
   - Filter out trainee food allergies (Lactose, Gluten, Vegetarian, Halal).
5. **Trainee Direct Chat (`chat`)**:
   - Direct 1-on-1 messaging channel with assigned gym trainees for technique feedback and coaching check-ins.
6. **Goal Safety Escalation Queue**:
   - Whenever an AI trainee sets an aggressive or unsafe goal (e.g., BMI < 16.5 or > 1.5 kg/week loss), it appears in this queue.
   - **Action**: Trainer inspects user justification, then clicks **Approve** (with disclaimer) or **Reject** (suggests safe alternative).

---

### 2.4 Fitness Instructor (`FitnessInstructor`)
* **Dashboard Route**: `/fitness-instructor`
* **Access Guard**: `allowedRoles: ['FitnessInstructor', 'Admin', 'SuperAdmin']`
* **Focus**: Content creation, verified sports-science exercise entries, and public programs.

#### Tabs & Capabilities:
1. **Overview Tab (`overview`)**:
   - Content metrics: Total published exercises, article views, program downloads, and trainee ratings.
2. **Exercise Database Studio (`exercises`)**:
   - **Add New Exercise**: Enter Exercise Name, Target Muscle Group, Equipment Needed, Execution Instructions, and Video Demonstration URL.
   - **AI Sports Science Auto-Annotation (Qwen Integration)**: Generates biomechanical movement pattern, primary/secondary muscle activation, and injury contraindication tags automatically.
   - **Synchronize to AI Trainer**: Click button to push new exercises immediately into the AI decision engine registry.
3. **Workout Programs Studio (`programs`)**:
   - Multi-week public program builder (e.g. *Hypertrophy 8-Week Split*, *Couch to 5K*).
   - Assign difficulty (`Beginner`, `Intermediate`, `Advanced`).
4. **Diet Templates Studio (`diet`)**:
   - Publish structured nutrition guides (e.g., *Clean Bulking 3000 kcal*, *Keto Cut Plan*).
5. **Educational Articles Studio (`articles`)**:
   - Rich-text blog editor with markdown formatting for health guides, recovery techniques, and scientific hydration guides.
6. **Trainee Program Requests (`requests`)**:
   - View community requests for specific workout regimes and respond with specialized programs.

---

### 2.5 Store Manager (`StoreManager`)
* **Dashboard Route**: `/store-manager`
* **Access Guard**: `allowedRoles: ['StoreManager', 'Admin', 'SuperAdmin']`

#### Tabs & Capabilities:
1. **Overview Tab (`overview`)**:
   - Sales revenue metrics, low stock warnings, daily order count, average order value.
2. **Product Catalog Management (`products`)**:
   - **Add Product Modal**: Name, Category (`Supplements`, `Apparel`, `Equipment`, `Accessories`), Price, Discount Price, Description, Images.
   - **Inventory Tracker**: Set available quantity. Automatic status updates to `In Stock`, `Low Stock`, or `Out of Stock`.
   - **Edit / Archive Product**: Modify product listings or soft-delete retired merchandise.
3. **Order Fulfillment & Shipping (`orders`)**:
   - View customer orders with customer delivery address, contact phone, and purchased item breakdown.
   - **Status Dropdown**: Transition order lifecycle: `Pending` ➔ `Processing` ➔ `Shipped` ➔ `Delivered` ➔ `Cancelled`.
   - **Order Dispatch Details**: Enter courier tracking numbers for automated trainee email/notification alerts.

---

### 2.6 Complaint Moderator (`ComplaintModerator`)
* **Dashboard Route**: `/moderator`
* **Access Guard**: `allowedRoles: ['ComplaintModerator', 'Admin', 'SuperAdmin']`

#### Tabs & Capabilities:
1. **Overview Tab (`overview`)**:
   - Open ticket queue counter, average response time, resolution rate metrics.
2. **Community Moderation Queue (`moderation`)**:
   - Review reported community posts, abusive comments, and flagged user profiles.
   - Apply user strikes or 7-day community posting mutes.
3. **Ticket Support Center (`complaints`)**:
   - Filter tickets by category: *Gym Facility Issue*, *Billing & Subscription Dispute*, *Trainer Professionalism*, *Store Delivery Bug*.
   - **Ticket Lifecycle**: `Open` ➔ `Investigating` ➔ `Resolved` ➔ `Closed`.
   - **Live Dispute Chat**: Chat directly on the ticket with encrypted audit visibility.

---

### 2.7 Regular Trainee / Member (`User`)
* **Core Routes**: `/dashboard`, `/ai-trainer`, `/your-gym`, `/running`, `/home`, `/explore`, `/store`, `/profile`
* **Access Guard**: `allowedRoles: ['User', 'Admin', 'SuperAdmin']`

#### Trainee Hub & Dashboard Tabs (`/dashboard`):
1. **Overview Tab (`overview`)**:
   - Daily calorie consumption vs burn estimate.
   - Current active workout streak counter & gamification XP points.
   - Today's assigned workout from the active AI plan.
2. **Active Plans Tab (`plans`)**:
   - View active 28-day AI workout plan details.
   - Browse saved historical AI plans or activate previously generated routines.
3. **My Complaints Tab (`complaints`)**:
   - Submit new support ticket with category, priority, and issue description.
   - Track progress and chat with moderators to resolve disputes.

---

### 2.8 Public Visitor / Unauthenticated Guest
* **Landing Page (`/`)**: Highlighting AI computer vision, nearby gym directory, and community testimonials.
* **Explore Gyms (`/explore`)**: Search and filter gyms by city, amenities, and price. (Can view details, but clicking "Join Gym" prompts login).
* **Store (`/store`)**: Browse fitness apparel and supplements. (Adding to cart or checkout prompts login).
* **Auth Portal (`/login`, `/register`, `/forgot-password`, `/recover-account`)**: Login via email/password or Google OAuth, complete password reset via SHA-256 OTP.

---

## 3. Universal System Modules & Subsystems

---

### 3.1 AI Workout Hub & Dynamic 28-Day Periodized Calendar
* **Page Path**: `/ai-trainer`
* **Engine Core**: `recommendationEngine.js` + `planMergeEngine.js`

#### Features & Behavior:
* **Interactive 28-Day Grid**: Visual calendar dividing a 4-week cycle into training days and active rest days.
* **Strict Daily Schedule Lock**:
  - Today's workout is marked **ACTIVE** and can be logged.
  - Future workouts are marked **LOCKED** (cannot be preview-completed out of sequence).
  - Past missed sessions are flagged as **MISSED**.
* **AI Coach Missed Session Auto-Adjustment**:
  - Clicking on a missed workout day opens an interactive AI recommendation:
    - *Option A*: Compress and roll key volume into today's session.
    - *Option B*: Shift the entire calendar forward by 1 day.
    - *Option C*: Mark as Rest Day without penalty.
* **Build Your Workout Modal (MiniCoach)**:
  - If a user lacks a specific goal (`Lose Weight`, `Build Muscle`, `Gain Strength`, `Stamina`), the modal prompts for their current target and duration.
  - Answers are permanently saved to MongoDB (`PUT /api/users/bio`) so it never loops repeatedly.

---

### 3.2 Computer Vision Pose Tracking (AI Pushup Counter)
* **Subsystem**: `frontend/src/ai-detectors/`
* **Technologies**: TensorFlow.js + Pose Detection (MoveNet / BlazePose)

#### Execution Flow:
1. User clicks **"Start Exercise with AI Camera"** on a supported exercise (e.g. Pushups).
2. Browser requests camera permissions (`getUserMedia`).
3. Real-time keypoint extraction tracks:
   - Shoulder angle, Elbow flexion, Spine neutral alignment.
4. **Rep Validation State Machine**:
   - *State 0 (Ready)*: User in high plank position.
   - *State 1 (Down)*: Elbow flexion drops below 90 degrees with straight back.
   - *State 2 (Rep Counted)*: User pushes back up to full lockout. Voice audio chime triggers and rep counter increments.
5. On set completion, rep data and accuracy percentage are logged into session history.

---

### 3.3 GPS Outdoor Running Tracker
* **Page Path**: `/running`
* **Subsystem**: `RunningTracker.jsx` + `running-v1/index.js`

#### Execution Flow:
1. Accesses device Geolocation API (`navigator.geolocation.watchPosition`).
2. Calculates real-time metrics:
   - **Distance (km)**: Haversine formula calculation across coordinate intervals.
   - **Pace (min/km)**: Moving average speed.
   - **Calories Burned**: ACSM metabolic formula calculated using user's weight from Health Bio.
   - **Live Route Polyline**: Plotted on interactive OpenStreetMap / Leaflet canvas.
3. On finish, saves running workout to user activity log and awards +50 XP.

---

### 3.4 Health & Medical Bio Calibration (Onboarding Wizard)
* **Trigger**: Automatic on first user login, or manually via `Profile ➔ Edit Bio`.
* **Subsystem**: `OnboardingWizard.jsx` ➔ `/api/users/bio`

#### Bio Categories Captured:
1. **Physical Metrics**: Gender, Date of Birth, Height (cm/ft), Weight (kg/lbs), Units preference.
2. **Frequency & Gear**: Training days per week (2 to 6), Equipment access (*Full Gym*, *Dumbbells Only*, *Bodyweight/Calisthenics*), Pushup baseline benchmark.
3. **Medical & Joint Screening**:
   - Joint Pain: Knee, Lower Back, Shoulder, Wrist, Ankle, Neck, Hip, or None.
   - Pre-existing Injuries: Rotator Cuff, Herniated Disc, ACL/Meniscus, Tennis Elbow, or None.
   - Medical Conditions: Asthma, Hypertension, Diabetes, Heart Condition, or None.
   - Contraindications: No Heavy Overhead Press, No Deep Squats, No Spinal Loading.
4. **Dietary Preferences**: Halal, Vegetarian, Vegan, High Protein, Lactose Intolerant, Gluten Free.

---

### 3.5 Goal Engine, Milestone Planner & Safety Screening
* **Subsystem**: `backend/services/ai/goalSafetyEngine.js` ➔ `/api/goals`

#### Deterministic Safety Rules:
1. **BMI Check**:
   - Target weight resulting in BMI < 16.5 is flagged as `severe_underweight_target`.
2. **Aggressive Timeline Screening**:
   - Weight loss exceeding 0.8 kg/week or weight gain exceeding 0.5 kg/week triggers safety warning.
3. **Automatic Milestone Generation**:
   - Safely approved goals generate 4 intermediate milestones across the target timeline.
4. **Trainer Review Gate**:
   - If user overrides a safety warning, goal status is locked to `PendingReview` and forwarded to the GymTrainer queue.

---

### 3.6 Home Community Feed & Social Network
* **Page Path**: `/home`
* **Subsystem**: `postRoutes.js`, `Home.jsx`

#### Features:
* **Create Post**: Share text, workout achievements, and photos (uploaded to Supabase bucket).
* **Interactive Engagement**:
  - *Likes*: Atomic `$addToSet` prevents duplicate likes.
  - *Comments*: Real-time conversation thread under each post.
  - *Report Button*: Flags offensive posts for moderator review.
* **Stories Bar**: 24-hour disappearing photo/video stories from followed gym buddies.
* **Public Profiles**: Click on any author avatar to view their public stats, workout count, streak, and posts.

---

### 3.7 Explore Gyms & Virtual Gym Details
* **Page Paths**: `/explore`, `/gym/:id`
* **Subsystem**: `gymRoutes.js`

#### Features:
* **Search & Filter**: Search by gym name, location, price range, or amenities (Swimming Pool, Sauna, 24/7 Access).
* **Gym Details Page**:
  - Photo gallery, virtual tour embed, certified trainer roster.
  - Operating hours and interactive Google Maps pin.
  - Subscription cards (Monthly/Yearly) with instant digital enrollment.

---

### 3.8 Your Gym & Real-Time QR Check-in
* **Page Path**: `/your-gym`
* **Subsystem**: `YourGym.jsx`

#### Features:
* **Digital Membership ID Card**: Shows Gym Name, Member Tier, Expiration Date, and status (`Active` / `Expired`).
* **Dynamic Entry QR Code**: Rotates token every 60 seconds to prevent screenshot sharing. Scanned at front desk.
* **Auto-Renew Subscription Toggle**:
  - Member can turn off recurring billing without forfeiting current paid cycle access.
* **Attendance History**: Calendar log of days attended this month.

---

### 3.9 GymSync Ecommerce Store & Checkout
* **Page Path**: `/store`
* **Subsystem**: `storeRoutes.js`, `paymentRoutes.js`

#### Features:
* **Catalog Grid**: Filter products by supplements, apparel, accessories, or equipment.
* **Interactive Cart Drawer**: Adjust item quantities, apply promo coupon codes, calculate subtotal and tax.
* **Checkout Pipeline**:
  - Shipping address form.
  - Payment method: Stripe / Card or Cash on Delivery.
  - Stock validation (prevents ordering items that ran out during checkout).
* **Order Tracking**: Trainees can track live fulfillment status in their Profile.

---

### 3.10 Support Tickets & Moderated Complaint Chat
* **Page Path**: `/dashboard` (User) and `/moderator` (Staff)
* **Subsystem**: `complaintRoutes.js`

#### Features:
* **Collision-Free Ticket IDs**: Formatted as `TKT-XXXXXXXX-XXXX` with SHA-256 entropy.
* **Strict Reporter Binding**: Users can only view and chat on tickets they personally filed.
* **Two-Way Moderated Chat**: Trainees and staff exchange messages and image attachments directly within the ticket.

---

### 3.11 Real-Time Notifications & Direct Messages
* **Page Paths**: `/notifications`, `/messages`
* **Subsystem**: `notificationRoutes.js`, `chatRoutes.js`

#### Features:
* **Notifications**: Alerts for workout milestones, post likes/comments, trainer goal approvals, and store order shipments.
* **Direct Messages**: 1-on-1 private messaging between users, trainers, and friends.

---

## 4. Security Architecture & Defensive Hardening

1. **Centralized Password Hashing**:
   - Handled strictly in `User.js` via `User.hashPassword()` using `bcryptjs` with salt round 10.
2. **Data Transfer Object (DTO) Protection**:
   - `User.schema.set('toJSON')` automatically strips `password`, `otpCode`, `resetPasswordToken`, and secret credentials from every API response.
3. **Atomic OTP Consumption & Verification**:
   - OTPs stored as 64-character SHA-256 hashes.
   - Verified atomically using `$inc` on attempts and `$set` on consumption to prevent race-condition replays.
4. **Brute-Force & Rate Limiting**:
   - Multi-tier MongoDB-backed rate limiters on `/login`, `/register`, `/forgot-password`, `/verify-otp`, and `/generate-plan`.
   - Fails-closed with HTTP 503 during database disruptions to prevent credential stuffing.
5. **IDOR Prevention (Insecure Direct Object References)**:
   - Strict ownership checks on workouts, complaints, and media deletion (`req.user._id.toString() === resource.ownerId.toString()`).

---

## 5. Database Models Reference (MongoDB)

| Model Name | Primary Purpose | Key Fields |
| :--- | :--- | :--- |
| `User` | Accounts, auth, roles, bio data | `name`, `email`, `password`, `role`, `bioData`, `gymMembership` |
| `Gym` | Gym entities and facilities | `name`, `ownerId`, `address`, `amenities`, `plans`, `isVerified` |
| `SavedAIPlan`| Persisted 28-day AI workout plans | `userId`, `title`, `goal`, `workout`, `interactive_calendar` |
| `GoalGroup` | Trainee target goals & milestones | `userId`, `targetWeight`, `timelineWeeks`, `status`, `milestones` |
| `TrainerReview`| Safety escalation review queue | `userId`, `goalGroupId`, `trainerId`, `status`, `flagReason` |
| `WorkoutProgress`| Completed workout logs & reps | `userId`, `completedDays`, `exerciseRecords`, `totalCaloriesBurned`|
| `Post` | Community feed publications | `authorId`, `content`, `mediaUrl`, `likes`, `comments`, `reports` |
| `Product` | Store inventory merchandise | `name`, `price`, `category`, `stockQuantity`, `images` |
| `Order` | Ecommerce purchases | `userId`, `items`, `totalAmount`, `shippingAddress`, `status` |
| `Complaint` | Support dispute tickets & chats | `complaintId`, `reporterId`, `category`, `status`, `chatMessages` |
| `RateLimit` | Distributed DDoS & brute-force limits | `key`, `count`, `resetAt` |
| `AuditLog` | Cryptographic administrative audit logs | `user`, `role`, `action`, `targetEntity`, `ipAddress` |
