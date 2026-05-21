# Center Exam Portal (QuizFlow)

A comprehensive, highly-secure examination platform tailored for military and institutional training environments. Built with a specialized "Forest Green & Gold" military design system, it provides robust role-based access for Admins, Exam Officers, and Candidates.

Developed by **SLOG Solutions Pvt Ltd and 2STC**.

## 🚀 Features

- **Role-Based Architecture**:
  - **Super Admin**: System-wide control, user management, and global oversight.
  - **Exam Officer**: Create examinations, manage the question bank, enroll candidates, and monitor results.
  - **Candidate**: Secure exam-taking environment with a locked-in portal, live timers, question navigation, and immediate result feedback.
- **Specialized UI/UX**:
  - Deep "Forest Green" and "Gold" military aesthetic.
  - Completely responsive design with fixed navigation panels to prevent accidental scrolling during exams.
  - Dynamic question navigator (tracks answered vs. unanswered questions in real-time).
- **Core Systems**:
  - Comprehensive Question Bank with tagging (Subject, Topic, Difficulty, Bloom's Taxonomy).
  - Configurable exams (Duration, Passing Marks, Randomization, Allow Multiple Attempts).
  - Instant auto-grading and secure attempt tracking.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, React Router.
- **Backend**: Node.js, Express.js.
- **Database**: SQLite (via `better-sqlite3` for fast local performance).
- **ORM**: Prisma 7 (Custom generated client).
- **Authentication**: JWT & bcrypt with secure HTTP-only cookies.

## 📂 Project Structure

```
QUIZFLOW/
├── client/                 # Frontend React Application
│   ├── public/             # Static assets (backgrounds, icons)
│   └── src/
│       ├── components/     # Reusable UI components & Layouts
│       ├── context/        # React Context (Auth)
│       ├── pages/          # Full page views (Dashboards, ExamPortal, Login)
│       └── index.css       # Global Military Theme Variables
│
├── server/                 # Backend Node.js Application
│   ├── prisma/             # Prisma schema and migrations
│   └── src/
│       ├── config/         # Prisma configuration & Environment variables
│       ├── controllers/    # Route controllers (Auth, Exams, Questions, etc.)
│       ├── middleware/     # Auth and error handling middleware
│       ├── routes/         # Express routes
│       └── generated/      # Auto-generated Prisma client
└── README.md
```

## ⚙️ Quick Start

### 1. Setup the Backend
```bash
cd server
npm install

# Apply database migrations (SQLite)
npx prisma generate
npx prisma db push

# Start the server (runs on port 8000)
npm run dev
```

### 2. Setup the Frontend
```bash
cd client
npm install

# Start the Vite development server (runs on port 5173)
npm run dev
```

## 🔐 Default Test Credentials

Navigate to `http://localhost:5173` to access the portal.

**Admin Access:**
- Role: `Admin`
- ID: `IC-12345A`
- Password: `ChangeMe@123`

**Exam Officer Access:**
- Role: `Officer`
- ID: `EO0000001`
- Password: `ChangeMe@123`

**Candidate Access:**
- Role: `Candidate`
- ID: `CAND0003` or `CAND0004`
- Password: `Password@123`

---
*All Rights Reserved @ SLOG Solutions Pvt Ltd*
