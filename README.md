# BookNest

BookNest is a reading-tracker application for managing books, custom shelves, shared shelves with owner/editor/viewer roles, reading progress, lending, activity logs, and real-time updates.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma
- Authentication: JWT access/refresh tokens
- Real-time: Socket.io

## Current setup
This starter contains the backend foundation, Prisma data model, authentication, book CRUD/filter/pagination/sorting, shelf APIs, RBAC middleware, lending APIs, reading-progress validation, activity logging, Socket.io authentication, and seed data.

## Run
1. Install PostgreSQL and create a database named `booknest`.
2. Copy `server/.env.example` to `server/.env` and update the database credentials/secrets.
3. In `server/`: `npm install`
4. Run `npx prisma migrate dev --name init`
5. Run `npm run seed`
6. Run `npm run dev`
7. In `client/`: `npm install`
8. Run `npm run dev`

Frontend: http://localhost:5173
Backend: http://localhost:5000

## Authentication design
The access token is short-lived and used for protected API requests. The refresh token is longer-lived and stored server-side in the database as a hash. The client sends the refresh token as an HttpOnly cookie and can call `/api/auth/refresh` after an access-token expiry.

## Important
This is an assessment starter rather than a claimed finished submission. Before submission, complete the remaining frontend screens, transparent refresh/retry handling, full socket event broadcasting/scoping, critical tests, clean-clone verification, and the final README details.
