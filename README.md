# Center Exam Portal (QuizFlow)

A secure, high-performance examination platform tailored for military and institutional training environments. Built with a specialized **"Forest Green & Gold"** military aesthetic, it provides robust role-based access control, question bank management, and real-time exam execution with locked-in navigation.


## 🚀 Key Features

### 👤 Role-Based Portals & Access Control
- **Super Admin**: System-wide oversight, user account management (creating, deactivating, and managing Admin and Exam Officer accounts).
- **Exam Officer**: Full command over examinations. Create/manage exam configurations, handle the global Question Bank, register candidates, and view grading results.
- **Candidate**: A secure, locked-down examination interface with live timers, dynamic question navigation, and real-time status tracking.

### 📚 Global Question Bank
- Supports multiple question types: **Multiple Choice (MCQ)**, **True/False (T/F)**, and **Fill in the Blanks**.
- Question metadata tags including **Subject**, **Topic**, **Difficulty Level** (Easy, Medium, Hard), **Bloom's Taxonomy classification**, and **Marks allocation**.
- Bulk-upload questions instantly using Excel/CSV templates.

### 📝 Flexible Exam Management
- Configurable settings: passing marks, total duration (minutes), allowed attempt counts, and target units (e.g., `A Coy, B Coy`).
- Randomized question order and shuffled options to prevent cheating.
- Automatic exam timer termination and submission.

### 📊 Performance Tracking & Auto-Grading
- Instantly auto-grades MCQs, True/False, and Fill-in-the-Blanks.
- Allows additional manual grading inputs for practical, viva, and subjective marks.
- Complete audit logging of exam attempts and scores.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS | Modular, highly responsive client dashboard |
| **Routing** | React Router Dom v7 | Secured client-side paths based on user roles |
| **Backend** | Node.js, Express.js | Secure RESTful API Gateway |
| **Database** | SQLite | Serverless, ultra-fast relational database |
| **ORM** | Prisma 7 | Custom-generated database client |
| **Authentication** | JWT, bcryptjs, HTTP-only Cookies | Stateless secure sessions & encrypted passwords |
| **Security** | Helmet, CORS, Express Rate Limit | Hardened backend protection |

---

## 📂 Project Structure

```text
QUIZFLOW/
├── client/                     # Frontend React Application (Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI Components & Layouts
│   │   ├── context/            # React Context (Auth State & API configs)
│   │   ├── pages/              # Application Views / Screens
│   │   │   ├── AdminLogin.jsx      # Portal for Super Admins
│   │   │   ├── CandidateLogin.jsx  # Portal for Candidates
│   │   │   ├── Candidates.jsx      # Candidate Roster & Management
│   │   │   ├── Dashboard.jsx       # Main Analytics Overview
│   │   │   ├── ExamPortal.jsx      # Live Exam Sandbox
│   │   │   ├── Exams.jsx           # Exam Configuration Panel
│   │   │   ├── MyExams.jsx         # Candidate Exam List
│   │   │   ├── Questions.jsx       # Question Bank Management
│   │   │   ├── Results.jsx         # Grading & Attempt Archives
│   │   │   └── UserAccounts.jsx    # Super Admin Accounts Manager
│   │   └── index.css           # Global Theme & Color Tokens
│   └── package.json
│
├── server/                     # Backend API & Database
│   ├── prisma/
│   │   ├── schema.prisma       # Database design
│   │   └── data/               # SQLite database store (.db file)
│   ├── src/
│   │   ├── config/             # Environment configs & Prisma initialization
│   │   ├── controllers/        # Request routers execution logic
│   │   ├── middlewares/        # Authentication, Authorization, & Rate-limiting
│   │   ├── routes/             # REST route bindings
│   │   ├── seeders/            # Database initialization scripts
│   │   └── server.js           # Server application startup
│   └── package.json
│
├── template/                   # Excel / CSV Templates
│   └── quizflow_question_template.csv  # Base upload layout
└── README.md
```

---

## 🗄️ Database Schema (Prisma Models)

The core relational structure is managed through the following Prisma models:
- **`User`**: Stores user identity, military rank, army number, unit, trade, password hash, and access role (`super_admin`, `exam_officer`, `candidate`).
- **`Question`**: Holds questions (text, options A/B/C/D, correct answers, category, subject, marks, difficulty, and Bloom's taxonomy).
- **`Exam`**: Configures exam details, durations, constraints, instructions, and target units.
- **`ExamQuestion`**: Many-to-many relationship mapping questions into specific exams.
- **`Attempt`**: Tracks candidate exam attempts, startTime, submitTime, status (`started`, `submitted`), auto-graded marks, and manual practical/viva/subjective grades.
- **`Response`**: Logs the exact selected option and marks awarded for every question answered during a candidate's attempt.

---

## ⚙️ Quick Start Installation Guide

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

---

### Step 1: Backend Setup

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Install backend dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Adjust any environment variables if required (e.g., `PORT`, `CORS_ORIGIN`, or `SUPER_ADMIN_PASSWORD`).*

4. **Initialize database schema & client:**
   ```bash
   npm run prisma:generate   # Generates Prisma client
   npm run prisma:push       # Creates database and syncs schema
   ```

5. **Seed default users:**
   Populate the database with the Super Admin, Exam Officer, and Candidate test profiles:
   ```bash
   npm run seed:admin
   ```

6. **Start the development backend:**
   ```bash
   npm run dev
   ```
   *The server runs on [http://localhost:8000](http://localhost:8000).*

---

### Step 2: Frontend Setup

1. **Navigate to the client directory:**
   ```bash
   cd ../client
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Verify that `VITE_API_URL` is pointing correctly to the backend server (default: `http://localhost:8000/api/v1`).*

4. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   *The client application launches at [http://localhost:5173](http://localhost:5173).*

---

## 📥 Bulk Upload Templates

Officers can bulk-upload candidates and questions using Excel or CSV formats. Ensure your sheets strictly match the column formats below.

### 1. Questions CSV / Excel Template
A template file is provided at [`template/quizflow_question_template.csv`](file:///d:/Slog/QUIZFLOW/template/quizflow_question_template.csv).

| Column Header | Allowed Values | Description |
| :--- | :--- | :--- |
| `type` | `mcq`, `truefalse`, `fillblank` | The format of the question |
| `text` | Any text | The question text itself |
| `option_A` | Any text (or empty) | Answer Option A (Required for mcq) |
| `option_B` | Any text (or empty) | Answer Option B (Required for mcq) |
| `option_C` | Any text (or empty) | Answer Option C (Optional for mcq) |
| `option_D` | Any text (or empty) | Answer Option D (Optional for mcq) |
| `correct_options` | `A`, `B`, `C`, `D`, `TRUE`, `FALSE`, or text | The correct answer code/text |
| `category` | `Must Know`, `May Know`, `Could Know` | Difficulty priority tags |
| `subject` | Any text | Category groupings |
| `marks` | Number | Integer value of the question (e.g. `1`, `2`) |

### 2. Candidates CSV / Excel Template
For registering candidates in bulk:

| Column Header | Default Value | Description |
| :--- | :--- | :--- |
| `army_number` | **(Required)** | Unique Army Identifier (e.g. `CAND0001`) |
| `name` | **(Required)** | Candidate's Full Name |
| `rank` | `Spr` | Military Rank (e.g., `Spr`, `Hav`, `Capt`) |
| `unit` | `21 Engr Regt` | Assigned Regiment / Unit |
| `trade` | `Field Engineer` | Trade specialization |
| `password` | `Password@123` | Default candidate portal login password |

---

## 🔐 Default Test Credentials

Use these credentials to log in and test different user interfaces:

| Portal URL | Default Role | Army Number (ID) | Password | Portal Permissions |
| :--- | :--- | :--- | :--- | :--- |
| [http://localhost:5173/admin-login](http://localhost:5173/admin-login) | **Super Admin** | `SA0000001` or `IC-12345A` | `ChangeMe@123` | Control Super Admin settings and manage Officer accounts |
| [http://localhost:5173/officer-login](http://localhost:5173/officer-login) | **Exam Officer** | `EO0000001` | `ChangeMe@123` | Setup exams, upload question papers, and grade students |
| [http://localhost:5173/candidate-login](http://localhost:5173/candidate-login) | **Candidate 1** | `CAND0001` | `Password@123` | Attend designated exam sessions |
| [http://localhost:5173/candidate-login](http://localhost:5173/candidate-login) | **Candidate 2** | `CAND0002` | `Password@123` | Attend designated exam sessions |
