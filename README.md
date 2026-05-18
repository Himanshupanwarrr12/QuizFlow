# QuizFlow

PERN stack (PostgreSQL, Express, React, Node.js) with **Prisma 7**.

## Structure

```
QUIZFLOW/
├── client/             # React + Vite
│   └── src/
├── server/             # Express + TypeScript
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── config/prisma.ts          # Prisma 7 singleton
│       ├── controllers/auth.controller.ts
│       ├── middleware/auth.middleware.ts
│       ├── routes/auth.routes.ts
│       ├── generated/prisma/         # Auto-generated
│       └── index.ts
└── README.md
```

## Quick Start

```bash
# Server
cd server
# Update DATABASE_URL in .env
npm run prisma:migrate
npm run dev              # http://localhost:5000

# Client
cd client
npm run dev              # http://localhost:5173
```

## API

| Method | Route               | Auth   | Description    |
|--------|---------------------|--------|----------------|
| POST   | /api/auth/register  | Public | Register       |
| POST   | /api/auth/login     | Public | Login          |
| POST   | /api/auth/logout    | Public | Logout         |
| GET    | /api/auth/profile   | User   | Get profile    |
| GET    | /api/health         | Public | Health check   |
