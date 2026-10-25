# GymSync - Smart Fitness & Enterprise Gym Platform

GymSync is a full-stack gym management, fitness tracking, and multi-tenant fitness platform featuring authentic 3D Athlete Trading Cards, periodized workout planning, meal tracking, an AI Workout Coach & Nutritionist powered by Qwen 2.5 on Ollama, multi-branch gym management, and strict role isolation.

---

## 🏛️ System Architecture & Port Allocation

GymSync operates with genuine physical separation between public operations and privileged administration:

| Component | Port | Technology | Target Roles & Purpose |
| :--- | :--- | :--- | :--- |
| **Backend API** | `http://localhost:5000` | Node.js, Express, MongoDB, Supabase | REST APIs, AES-256-GCM crypto, session tracking, auth & role guards |
| **Public Web App** | `http://localhost:5173` | React (Vite), TailwindCSS, Lucide | `User`, `GymOwner`, `GymTrainer`, `StoreManager` |
| **Admin Portal** | `http://localhost:5174` | React (Vite), TailwindCSS, Dedicated Entry | `Admin`, `SuperAdmin`, `ComplaintModerator`, `FitnessInstructor` |

---

## 🛡️ Role-Based Portals & Strict Isolation

### 1. Public Web Application (`http://localhost:5173`)
- **Public Roles**: `User`, `GymOwner`, `GymTrainer`, `StoreManager`.
- **Session Token**: `gymsync_token` stored in browser localStorage.
- **StoreManager Access**: StoreManagers are provisioned exclusively by authorized admins through the Admin Portal. StoreManagers log in through the public website login portal and are redirected automatically to their dedicated Store Manager dashboard. Self-registration for StoreManager is strictly blocked.
- **Privileged Access Protection**: Public registration payloads attempting to claim privileged roles (`Admin`, `SuperAdmin`, etc.) are rejected with HTTP 403 Forbidden. Privileged users attempting to access `/admin` on port 5173 are presented with an explicit isolation notice redirecting them to the Admin Portal on port 5174.

### 2. Admin Operational Portal (`http://localhost:5174`)
- **Privileged Roles**: `SuperAdmin`, `Admin`, `ComplaintModerator`, `FitnessInstructor`.
- **Session Token**: Dedicated `gymsync_admin_token` (isolated from public tokens to prevent cross-session bleeding).
- **Core Capabilities**:
  - **Gym Verification Queue**: Review submitted branch verification applications, inspect decrypted evidence files on-the-fly, and execute `APPROVE`, `REQUEST_INFO`, `REJECT`, or `SUSPEND` actions.
  - **Store Manager Oversight**: Authorized admins invite and provision Store Managers with assigned store permissions.
  - **Moderation & User Oversight**: Manage complaints, review instructor programs, inspect audit trails, and oversee platform users.
  - **Enforced Security**: Privileged roles must have two-factor authentication enabled; privileged accounts are prevented from disabling mandatory 2FA.

---

## 🏢 Multi-Branch Management & AES-256-GCM Verification

### Multi-Branch Architecture
- A single `GymOwner` account can manage an entire company/organization with multiple physical branches (e.g., Branch 1: Downtown, Branch 2: Uptown).
- Each branch maintains independent coordinates, addresses, facilities, operating hours, and verification review lifecycles.
- **Branch Statuses**: `Draft`, `Pending Review`, `Under Review`, `More Information Required`, `Approved`, `Rejected`, `Suspended`.
- **Public Discovery Isolation**: Only branches with status `Approved` are returned by public gym listing APIs. Unapproved branches are strictly hidden from public discovery and blocked from unauthorized direct access (HTTP 404/403).

### 4-Step Verification Application
1. **Step 1: Branch Profile & Location**: Gym name, branch name, contact details, physical address, city, country, Google Maps coordinates (`lat`, `lng`), facilities, and operating hours.
2. **Step 2: Legal Representative**: Legal business name, owner/applicant full name, CNIC/national ID number, official role, phone, and verification email.
3. **Step 3: Document Uploads & Encryption**:
   - Business Registration Certificate (`BusinessRegistration`)
   - CNIC / National ID Card (`CNIC`)
   - Gym Entrance & Signboard Photo (`EntranceSignboard`)
   - Premises Proof / Lease Agreement (`PremisesProof`)
   - Interior & Facility Photos (`FacilityPhotos`)
   - **AES-256-GCM Encryption at Rest**: All private verification documents are encrypted buffer-by-buffer before writing to disk (`backend/uploads/private_docs/`). Cryptographic IV (12 bytes) and authentication tags (16 bytes) are verified during on-the-fly decryption streams.
4. **Step 4: Review & Final Submission**: Summary checklist and legal declarations. Once submitted, status transitions to `Pending Review` with an audit record and official reference code (`GS-APP-...`).

---

## 🔒 Account Security & Session Management

- **Signup Email Verification OTP**:
  - New user and gym owner registrations require 6-digit cryptographic OTP verification.
  - OTP codes are hashed with SHA-256 at rest.
  - **Attempt Lockout**: 3 failed OTP attempts immediately invalidate the security code and trigger an HTTP 429 rate-limit lockout.
  - **Resend Cooldown**: 60-second cooldown period enforced between OTP resends.
- **Recognized Devices & Session Management**:
  - All logins register tracked sessions in MongoDB with device metadata, browser information, IP, and SHA-256 token hashes.
  - Users can inspect all active sessions under Profile Settings, identify their current device, remotely revoke individual devices (`DELETE /api/auth/sessions/:id`), or revoke all other sessions (`POST /api/auth/sessions/revoke-others`).
- **Two-Factor Authentication (2FA)**:
  - Users can enable/disable 2FA via their profile settings.
  - 2FA is mandatory for privileged operational roles.

---

## 🚀 Quick Start & Development

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Supabase account (for media storage)

### 2. Environment Configuration
Copy and configure environment files:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin-frontend/.env.example admin-frontend/.env
```

Ensure `backend/.env` has `MONGO_URI`, `JWT_SECRET`, and `ENCRYPTION_MASTER_KEY` (64-character hex string).

### 3. Installation
Install all dependencies across the workspace:
```bash
# Install root, backend, frontend, and admin-frontend packages
npm install
npm run install:all
```

### 4. Running the Development Environment
Run all services concurrently, or start individual services:
```bash
# Start Backend (5000), Public Frontend (5173), and Admin Portal (5174) concurrently:
npm run dev:all

# Or start services individually:
npm run dev:backend   # Port 5000
npm run dev:frontend  # Port 5173
npm run dev:admin     # Port 5174
```

### 5. Production Builds
```bash
# Build both Public Frontend and Admin Portal
npm run build:all

# Or build individually:
npm run build:frontend
npm run build:admin
```

### 6. Automated Verification & Test Suites
```bash
# Run the complete Role Isolation, Verification & Security Test Suite (44 tests):
npm run test:isolation

# Run all automated test suites across the application:
npm run test:all
```

---

## 🤖 AI Workout Coach (Ollama / Qwen 2.5)
GymSync supports running **Ollama (Qwen 2.5 7B)** locally or on Google Colab's Free T4 GPU.
👉 **Full Setup Guide:** [OLLAMA_COLAB_SETUP_GUIDE.md](./OLLAMA_COLAB_SETUP_GUIDE.md)
