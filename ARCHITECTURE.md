# GymSync System Architecture & Developer Reference

## 1. Overview & Core Tech Stack
GymSync is a multi-tenant hybrid fitness management platform built using:
- **Frontend:** React 18, Vite, React Router v6, Vanilla CSS (Design System Tokens).
- **Backend:** Node.js, Express.js (REST API), Serverless deployment via Vercel.
- **Database:** MongoDB Atlas (Mongoose ODM).
- **Authentication:** JWT Bearer tokens with database-backed Role-Based Access Control (RBAC).
- **Computer Vision & AI Tracking:** Dynamic modular AI Detector Registry (`pushup_v1` MoveNet pose estimation, `running_v1` HTML5 Geolocation Haversine tracker).
- **AI Coach Engine:** Local Ollama model integration with strict deterministic fallbacks, privacy guards, memory persistence, and content-only citation.

---

## 2. Non-Negotiable Product Rules (R1 – R6)

GymSync enforces 6 immutable architectural invariants across all frontend views, backend routes, and AI prompt pipelines:

| Rule | Statement | Architectural Enforcement |
| :--- | :--- | :--- |
| **R1** | **No AI-Authored Programs** | The AI NEVER creates or edits workout programs. Programs come exclusively from human-authored templates (`PreMadePlan` created by certified `FitnessInstructor`/`GymTrainer` roles). AI is strictly restricted to search, matching, and question answering. |
| **R2** | **No Diet Plan Generation** | NO diet plan is ever generated, prescribed, or assigned by the AI or the system under any circumstance. Diet is **TRACK + REPORT only** via the food log and daily energy aggregator. |
| **R3** | **One Active Program Limit** | A user can have exactly **ONE** active program at a time. Enforced server-side by `programGate.canJoin(userId)` across `UserWorkoutProgram`, `SavedAIPlan`, and `WeightLossEnrollment`. |
| **R4** | **Complete Bio Gate** | A user whose bio is incomplete (`isBioComplete(user)` returning false) cannot start the weight-loss program or access advanced planning. |
| **R5** | **Zero Medical History Collection** | GymSync NEVER collects, solicits, or persists personal medical history. High-visibility medical warning screens require explicit user acknowledgment metadata (`{ acknowledgedAt, version, seniorAcknowledgedAt }`) instead. |
| **R6** | **AI-Independent Reminders & Zero Offline Warnings** | Scheduled notifications, meal-tracking reminders, and workout prompts operate deterministically without Ollama. If the AI is offline, the system silently uses rule-based fallbacks. Users are **NEVER** shown "AI offline" warnings or asked to report AI downtime. |

---

## 3. Core Subsystems & Modular Architecture

### 3.1 Eligibility, Bio Validation & Program Gate
- **`backend/services/user/bioValidator.js`**: Enforces complete profile data requirement (height, weight, age/dob, gender, fitnessLevel, equipmentAccess, trainingDaysPerWeek).
- **`backend/services/workout/programGate.js`**: Unified gate checking active programs in `UserWorkoutProgram`, `SavedAIPlan`, and `WeightLossEnrollment`. Blocks secondary enrollment with clear guidance: *"Finish or leave your current program first"*.
- **`backend/services/safety/goalSafetyValidator.js`**: Evaluates weekly loss rates (0.25% - 0.75%/week safe planning band, 1.0%/week hard cap) and BMI bounds ($BMI \ge 18.5$).
- **`backend/services/safety/exerciseSafetyValidator.js`**: Pure heuristic equipment and intensity filter. Truthful user-facing reporting removes false claims of clinical orthopedic validation.

### 3.2 Human-Authored Weight Loss Program Engine
- **`backend/models/WeightLossEnrollment.js`**: Tracks enrollment metadata, starting weight, target date, and explicit medical warning acknowledgment timestamps. Never stores medical diagnoses.
- **`backend/services/weightLoss/weightLossEligibility.js`**: Multi-stage pre-flight checks: Profile completeness (R4), Age $\ge 18$, Senior (65+) physician acknowledgment, Current BMI $\ge 18.5$, Target BMI $\ge 18.5$, Program gate (R3), and Medical warning acknowledgment (R5).
- **`backend/services/weightLoss/weightLossCalculator.js`**: Calculates BMR (Mifflin-St Jeor), TDEE, realistic duration dates, and maximum safe loss bounds.
- **`backend/services/weightLoss/weightLossProjection.js`**: Projects weight trajectories using non-linear metabolic adaptation curves (preventing naive weekly $\times 52$ multiplication) and calculates dynamic confidence labels (`Low`, `Medium`, `High`) based on verified log volume.
- **`backend/services/weightLoss/weightLossTemplates.js`**: Pre-seeds certified human-authored weight loss templates authored by `FitnessInstructor`.

### 3.3 Offline Reminder Scheduler & Web Push Engine
- **`backend/services/notifications/reminderScheduler.js`**: Generates workout reminders, meal-tracking reminders (breakfast, lunch, snack, dinner), and weekly progress checks without AI dependency.
- **Idempotency Keys (`eventKey`)**: Format `{slot}_{type}_{userId}_{date}` guarantees at most 1 notification per slot per user per calendar day.
- **Quiet Hours & Mute**: Evaluates user-defined overnight windows (e.g. 22:00 to 07:00) and mute preferences before dispatching.
- **Deep Link Navigation**: All notifications embed target action URLs (e.g. `/ai-trainer?action=today_workout`, `/food-log`) handled by client routing and service worker push notification clicks.
- **`backend/routes/cronRoutes.js`**: Secure cron endpoint `/api/cron/reminders` protected by `CRON_SECRET` for serverless or daemon execution.

### 3.4 Food Logging & Pakistani Food Database (Rule R2)
- **`backend/data/pkFoods.json` & `backend/models/PkFood.js`**: Comprehensive database of 1,024 authentic Pakistani dishes across 13 categories (daal, sabzi, gosht, chawal, roti/paratha, nashta, drinks, etc.). Every record carries explicit `isEstimate: true`, estimate ranges ($\pm 15\%$), ingredient notes, Roman Urdu aliases, and dietary cautions as general info only.
- **`backend/models/FoodLog.js` & `backend/controllers/foodLogController.js`**: Intuitive post-meal logging ("*kal kya khaya*"), fractional portion pickers (0.5, 1, 1.5, 2...), glass counts for beverages, and yesterday/backfill date tracking.
- **`backend/services/nutrition/dailyEnergyAggregator.js`**: Aggregates intake vs. expenditure using real logged meals and activity logs (`eatenKcal`, `workoutKcal`, `walkingKcal`, `estimatedExpenditure`). Diet summary is presented purely as a retrospective report—never as prescribed calorie targets.

### 3.5 AI Coach Architecture & Integrity Guards
- **`backend/models/AICoachMemory.js` & `backend/services/ai/aiUserMemoryService.js`**: Server-side conversational memory. Implements the *Ask-Once Rule*: missing bio entities (weight, height, equipment, days) are solicited once, persisted, and never repeatedly asked.
- **`backend/services/ai/aiCoachTruthGuard.js`**: Assistant response sanitizer. Intercepts false claims of saving/modifying workout programs or prescribing meal diets, substituting factual guidance.
- **`backend/services/ai/workoutBuddyFinder.js`**: Searches public profiles and community posts only. Strictly whitelists public identifiers (`_id`, `name`, `username`, `city`, `subscribedGymName`, `fitnessGoal`, `profilePic`, `bio`) and strips all private metrics, health bio, weight, food logs, and private messages.
- **`backend/services/ai/gymSyncKnowledge.js`**: Defines the authoritative capability contract and product boundary rules fed to the system prompt.

---

## 4. Frontend Directory Structure

```text
frontend/src/
├── config/
│   ├── navigation.js             # Centralized role-based navigation menus
│   └── permissions.js            # Unified RBAC permission matrix
├── services/
│   ├── api.js                    # Core HTTP fetch wrapper with Bearer token insertion
│   ├── authService.js            # Auth & session management
│   ├── postService.js            # Social timeline posts, comments & replies
│   ├── gymService.js             # Gym facilities, member rosters & check-in/out
│   ├── adminService.js           # Admin stats, user role management & audit logs
│   ├── storeService.js           # E-commerce catalog & checkout payments
│   └── notificationService.js    # Push notifications, VAPID registration, bell dropdown
├── features/
│   ├── weightLoss/
│   │   ├── WeightLossPage.jsx    # Weight loss dashboard, projections, weigh-ins
│   │   ├── weightLossService.js  # Eligibility, calculator & enrollment API client
│   │   └── components/           # WeightLossMedicalWarningModal.jsx, WeighInModal.jsx
│   ├── foodLogging/
│   │   ├── FoodLogPage.jsx       # Food logging view, backfill selector, quantity picker
│   │   ├── FoodLogView.jsx       # Daily timeline, search Pakistani foods, diet report
│   │   └── foodLogService.js     # Food log API & Pakistani food search
│   ├── social/                   # PostCard, PostList, CreatePostModal
│   ├── exercises/                # ExerciseCard, ExerciseFilterBar
│   ├── gyms/                     # GymCard, MemberRosterTable
│   └── store/                    # ProductCard, PaymentModal
├── components/
│   ├── common/                   # Modal, ConfirmDialog, LoadingSpinner, MedicalDisclaimer
│   ├── layout/                   # Navbar, Footer, DashboardShell
│   └── ui/                       # StatCard, DataTable, SearchBar, Badge
├── dashboards/                   # Role views composed via DashboardShell
├── pages/                        # Page routers (Home, Profile, Admin, Store, etc.)
└── ai-detectors/                 # Modular MoveNet pose & GPS Haversine trackers
```

---

## 5. Supported User Roles & Responsibilities

| Role Name | Access Level | Primary Dashboard Capabilities |
| :--- | :--- | :--- |
| **Guest** | Unauthenticated | Explore gym catalog, public posts, read-only exercise library. |
| **User (Trainee)** | Normal Trainee | Personalized fitness overview, active workout program, food logging & Pakistani food DB, weight-loss program, running tracker, AI coach. |
| **GymOwner** | Partner Gym Owner | Gym profile management, member rosters, attendance check-in/out, trainer assignments. |
| **GymTrainer** | Trainer | Assigned member workout program authoring, progress tracking. |
| **FitnessInstructor** | Content Creator | Exercise library creation/editing, human-authored workout & weight-loss program template authoring. |
| **StoreManager** | E-commerce | Product inventory, order processing, stock updates. |
| **ComplaintModerator**| Moderation | Complaints queue resolution & post content moderation. |
| **Admin** | Administrator | System metrics, user role assignments, gym approvals, reported post removal. |
| **SuperAdmin** | Highest Authority | Full administrative control, senior audit log access, role elevation. |

---

## 6. Automated Verification & Regression Matrix

All backend capabilities and product safety gates are continuously tested via `npm test` (`backend/tests/runAllSuites.js`), executing **20 distinct automated test suites** with **100% pass rate**:

| # | Test Suite Script | Focus & Verified Invariants |
| :---: | :--- | :--- |
| 1 | `testRoleIsolationAndBranchVerification.js` | Role permission barriers, branch isolation, and route guards. |
| 2 | `testPhase7AuthoritativeSecurity.js` | Authoritative security, token integrity, and CSRF/header validation. |
| 3 | `testPhase6ComprehensiveHardening.js` | Input sanitization, projection boundaries, and injection defense. |
| 4 | `testPhase5SecurityAudit.js` | MongoDB IDOR prevention, session revocation, and data isolation. |
| 5 | `testPhase4Hardening.js` | Concurrency control, duplicate protection, and transaction safety. |
| 6 | `testExerciseBridge.js` | Modular AI detector linking and allowlist resolution. |
| 7 | `testPhase3Suites.js` | Role-based dashboard shell layout and navigation rendering. |
| 8 | `testPhase2Hardening.js` | Inventory concurrency, payment verification, and order gates. |
| 9 | `testFilterAndSecurityHardening.js` | Multi-field search filters and query parameter validation. |
| 10 | `aiTrainerDecisionEngine.test.js` | Decision engine evaluation for matching workouts to equipment. |
| 11 | `conversationalCoachAdaptive.test.js` | Conversational NLP prompt formatting and response generation. |
| 12 | `testPhase1HealthAndCalories.js` | Calorie calculation formulas and health bio field persistence. |
| 13 | `testPhase2GoalAndSafety.js` | Goal safety validator, weekly percentage caps, and rate limits. |
| 14 | `testPhase0Defects.js` | Defect fixes: energy computation, profile completeness, program gate. |
| 15 | `testPhase1R1R2Policy.js` | Rules R1 & R2 enforcement: human-authored plans only, no diet plans. |
| 16 | `testPhase2WeightLoss.js` | Weight loss eligibility matrix, non-linear projection, medical warnings. |
| 17 | `testPhase3Notifications.js` | Offline reminder scheduler, push subscriptions, quiet hours, deep links. |
| 18 | `testPhase4FoodLogging.js` | 1,024 Pakistani foods, backfill UX, range estimates, Track + Report. |
| 19 | `testPhase5AICoach.js` | Ask-Once rule, workout buddy privacy whitelist, truth guard. |
| 20 | `testPhase6RegressionQA.js` | Master regression matrix: eligibility, projections, program gate, leak audit. |
| **All** | **20 Suites Executed via `npm test`** | **100% Verification Rate — All Invariants Enforced** |
