# BookNest 

**BookNest** is a full-stack reading tracker where users can manage their books, organize them into custom shelves, share shelves with other users, track their reading progress, and lend books to each other.

I built BookNest with a focus on the parts that make a multi-user application work properly behind the UI — authentication, permissions, database relationships, validation, lending rules, activity tracking, and real-time updates.

---

# What can you do with BookNest?

## Manage your library

Users can add and manage their own books with:

* Title and author
* Reading status
* Total pages
* Current reading progress
* Rating
* Notes
* Finished date

The library also supports searching by title or author, filtering by reading status, sorting, and server-side pagination. Search and filters can be used together.

## Organize books into shelves

Users can create their own shelves and add books to them.

Books and shelves have a **many-to-many relationship**, so the same book can appear on multiple shelves.

Deleting a shelf does not delete the books inside it, and deleting a book removes its shelf relationships cleanly.

## Share shelves

Shelves can be shared with other registered users by email.

There are three roles:

| Role       | What they can do             |
| ---------- | ---------------------------- |
| **Owner**  | Full control of the shelf    |
| **Editor** | Add and remove books         |
| **Viewer** | View the shelf and its books |

The owner is the only person who can manage collaborators, change roles, or delete the shelf.

There is also a **Shared With Me** section where users can see shelves that other people have shared with them.

The important part here is that these permissions are enforced by the **backend**. The frontend does not simply hide buttons and assume that is enough. If a Viewer tries to call an Editor-only API directly, the backend rejects the request.

## Track reading progress

For books that are currently being read, users can update their current page and see their progress as a percentage.

The backend prevents invalid progress such as:

* Negative page numbers
* Current page greater than total pages
* Progress updates when total pages are not set

When a reader reaches the last page, the book automatically changes to **Finished** and its finished date is recorded.

## Lend books to other users

Users can lend their books to another registered user using their email.

The borrower can see the book in **Borrowed From Others**, but cannot edit the owner's book.

The backend also handles the important edge cases:

* You cannot lend a book to yourself.
* You cannot lend someone else's book.
* You cannot lend a book that does not exist.
* A book that is already lent cannot be lent to someone else at the same time.

The owner can mark the book as returned, which clears the active lending relationship.

## Activity feed

BookNest keeps a record of important actions such as:

* Adding a book
* Changing a book's status
* Lending a book
* Returning a book
* Sharing a shelf
* Changing a collaborator's role
* Removing a collaborator

Recent activity is shown on the dashboard.

## Real-time updates

BookNest uses **Socket.IO** for real-time updates.

For example, if Alice lends a book to Bob, Bob's **Borrowed From Others** view updates without Bob having to refresh the page.

The same idea is used for:

* Returned books
* Changes to shared shelves
* Dashboard activity

The socket connection is authenticated, and events are scoped to the users who are actually allowed to receive them. It is not a global broadcast where every connected user receives every event.

If the socket disconnects, the rest of the application continues to work normally. The client attempts to reconnect, and the API remains the source of truth if an event was missed.

---

# Dashboard

The dashboard gives the user a quick overview of their library.

It shows:

* Total books
* Reading books
* Finished books
* Want-to-read books
* Books finished this year
* Average rating
* Shelf with the most books
* Books currently lent out
* Shelves shared with the user
* Recent activity

---

# How it is built

```text
                  ┌─────────────────────┐
                  │   React + Vite      │
                  │      Frontend       │
                  └──────────┬──────────┘
                             │
                       HTTP / Socket.IO
                             │
                  ┌──────────▼──────────┐
                  │   Node + Express    │
                  │       Backend       │
                  └──────────┬──────────┘
                             │
                           Prisma
                             │
                  ┌──────────▼──────────┐
                  │     PostgreSQL      │
                  └─────────────────────┘
```

## Stack

* **React + Vite** :frontend
* **Node.js + Express**: backend API
* **PostgreSQL**:  database
* **Prisma**: database ORM
* **JWT**: authentication
* **bcrypt**: password hashing
* **Socket.IO**: real-time communication
* **CSS**: styling and responsive layouts

I chose PostgreSQL because the application has several relationships between users, books, shelves, sharing, and lending. Prisma makes those relationships easier to define and query.

Socket.IO was used because the assessment requires actual WebSocket-based updates rather than polling.

---

# Data Model

The main relationships in BookNest is: 

## User → Books

A user owns their books.

## User → Shelves

A user can create multiple shelves.

## Book ↔ Shelf

Books and shelves have a many-to-many relationship through `ShelfBook`.

This means a book can be on multiple shelves without creating duplicate book records.

## Shelf → ShelfShare → User

`ShelfShare` represents another user's access to a shelf and stores their role as either `EDITOR` or `VIEWER`.

## Book → Lending → User

`Lending` connects the book owner with the user currently borrowing the book.

An active lending record prevents the same book from being lent to another user at the same time.

## ActivityLog

`ActivityLog` stores the important events that appear in the dashboard activity feed.

---

# Authentication

BookNest uses a JWT access/refresh-token setup.

The basic flow is:

```text
Login
  ↓
Credentials verified
  ↓
Access token + refresh token
  ↓
Access token used for API requests
  ↓
Access token expires
  ↓
API returns 401
  ↓
Frontend requests a new access token
  ↓
Original request is retried
```

The access token is short-lived and is used for normal protected API requests.

The refresh token lasts longer and is sent using an **HttpOnly cookie**, so normal frontend JavaScript cannot directly access it.

Refresh-token state is also represented in the database through the `RefreshToken` model.

Passwords are hashed with **bcrypt** before they are stored.

This keeps the authentication flow separate from normal application authorization and allows expired access tokens to be refreshed without forcing the user to log in again.

---

# Backend Authorization

One of the important design decisions in BookNest was keeping authorization on the backend.

For a shared-shelf request, the backend checks:

1. Who is making the request.
2. Which shelf they are accessing.
3. Whether they own it.
4. If not, whether they have a valid shelf share.
5. What role they have.
6. Whether that role allows the requested action.

For example:

```text
Viewer
   │
   ▼
Add book to shared shelf API
   │
   ▼
Backend checks role
   │
   ▼
VIEWER → rejected
```

This is important because a user should not gain permissions simply by bypassing the frontend and sending their own API request.

The same ownership checks are used for private books and lending operations.

---

# Real-Time Security

Socket.IO connections are authenticated so that the backend knows which user is connected.

Events are then scoped instead of being broadcast to everyone.

A user can receive events relevant to:

* Their own activity
* Books being lent to or returned from them
* Shelves they are authorized to access

For shared shelves, the server checks the user's access before sending the shelf update.

If the socket disconnects, the application does not depend on the socket to function. API requests continue to work, the client attempts to reconnect, and the latest state can always be retrieved from the backend.

---

# Validation & UI Feedback

I also wanted the application to handle failures properly instead of leaving the user with a blank screen or an unexplained error.

Data-loading pages have loading and error states.

Forms display validation messages inline.

For example:

```text
Page cannot exceed total pages.
```

Request buttons also show an in-progress state or become disabled while an operation is running, which prevents accidental double submissions.

Important validation is repeated on the backend as well, since frontend validation cannot be trusted as a security mechanism.

---

# Seed Data

The project includes a Prisma seed script so the main features can be tested quickly.

Running:

```bash
npm run seed
```

resets the existing BookNest data and creates a fresh set of demo data.

## Demo users

**Alice**

```text
Email: alice@booknest.test
Password: Password123!
```

**Bob**

```text
Email: bob@booknest.test
Password: Password123!
```

## Alice's books

* **Atomic Habits** — Reading, 120/320 pages, rating 5
* **The Pragmatic Programmer** — Want to Read

## Bob's book

* **Clean Code** — Finished, 464/464 pages, rating 4

## Shared shelf

Alice has a shelf called:

**Tech & Self Improvement**

It contains:

* Atomic Habits
* The Pragmatic Programmer

The shelf is shared with Bob as an **Editor**.

## Active lending

**The Pragmatic Programmer** is seeded as currently lent from Alice to Bob.

This means the lending and borrowed-book flows can be tested immediately after running the seed.

The seed also creates a few initial activity records for the dashboard.

The seeded credentials are for local development/demo purposes only.

---

# Quick Demo

After setting up the project and running the seed, the following flow can be used to quickly verify the main multi-user features:

1. Log in as **Alice**.
2. Open the shared **Tech & Self Improvement** shelf.
3. Open a second browser or incognito window and log in as **Bob**.
4. Verify that Bob can access the shared shelf with his assigned **Editor** role.
5. From Alice's session, lend a book to Bob.
6. Verify that Bob's **Borrowed From Others** view updates without manually refreshing.
7. Return the book from Alice's session.
8. Verify that Bob's borrowed-book view updates again.
9. Make a change to the shared shelf and verify that the collaborator receives the update in real time.
10. Optionally change Bob's role to **Viewer** and verify that Editor-only actions are rejected by the backend.

---

# Getting Started

## Prerequisites

You will need:

* Node.js
* npm
* PostgreSQL

Create a PostgreSQL database named:

```text
booknest
```

## 1. Clone the repository

```bash
git clone https://github.com/Shrutidas18/BookNest.git
cd booknest
```

## 2. Set up the backend

```bash
cd server
npm install
```

Copy the example environment file:

### Windows

```powershell
Copy-Item .env.example .env
```

### macOS/Linux

```bash
cp .env.example .env
```

Then update the values if your PostgreSQL setup is different.

---

## 3. Environment variables

The backend uses:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/booknest"
JWT_ACCESS_SECRET="replace-with-a-long-random-access-secret"
JWT_REFRESH_SECRET="replace-with-a-long-random-refresh-secret"
PORT=5000
CLIENT_URL="http://localhost:5173"
```

`DATABASE_URL` points Prisma to the PostgreSQL database.

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are used for signing the two types of JWTs.

`PORT` controls the backend port, and `CLIENT_URL` specifies the frontend URL.

The values in `.env.example` are placeholders. For an actual deployment, use strong random JWT secrets and keep database credentials private.

The real `.env` file should not be committed to the repository.

---

## 4. Set up Prisma

From the `server` directory:

```bash
npx prisma migrate deploy
```

Then seed the database:

```bash
npm run seed
```

`prisma migrate deploy` applies the migration files included in the repository to the local PostgreSQL database.

The seed command then creates the demo users and sample BookNest data.

---

## 5. Start the backend

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:5000
```

---

## 6. Start the frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

---

# Project Structure

```text
booknest/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   └── package.json
│
├── server/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

# What I found challenging

The most challenging parts of this project were the features where multiple users and pieces of state interact.

The refresh-token flow needed careful handling because an expired access token should trigger a refresh, while something like an incorrect password should simply fail the login. Separating those cases was important to avoid unnecessary refresh requests.

The shelf system also required some thought because books and shelves are genuinely many-to-many. I had to make sure that deleting a shelf would not delete its books and that deleting a book would clean up its shelf relationships.

RBAC was probably one of the most important backend parts. It is easy to hide an action from a Viewer in the UI, but that does not actually protect the API. The backend therefore checks the user's role before allowing shelf operations.

Lending introduced another layer of cross-user state. The backend has to check ownership, the borrower, and whether a book is already lent before creating a lending record.

The WebSocket work was also interesting because the application should not simply send every event to every connected user. Events need to be sent to the right users and shared-shelf collaborators. Testing with two browser sessions helped me verify that the changes were actually happening between users in real time.

---

# Known Issues / Incomplete

As of now there are no known incomplete **core assessment requirements**.

The project focuses on the required functionality from the assessment. 

---

# What I would improve with more time

If I continued working on BookNest, I would focus mainly on improvements beyond the assessment requirements.

Some things I would like to add are:

* More automated tests around authentication, RBAC, lending, and reading progress.
* More end-to-end testing for multi-user WebSocket scenarios.
* CI/CD and production deployment.
* More accessibility improvements.
* Better backend logging and monitoring.
* Book cover and metadata integration.
* More detailed reading statistics.

The assessment was prioritized first, so these would be the next improvements rather than replacing any of the existing core functionality.

---

# AI Usage

I used AI tools, mainly ChatGPT, claude and Gemini as well of Learning during the development of BookNest.

I used AI as a development and learning aid for things like:

* Thinking through application architecture
* Debugging frontend and backend issues
* Working through Prisma relationships
* Understanding JWT access and refresh tokens
* Reviewing authorization and RBAC
* Thinking through lending edge cases
* Debugging WebSocket behavior
* Refining responsive UI and CSS
* Comparing the implementation against the assessment requirements

I did not treat generated code as something that could just be copied without understanding it. I reviewed the suggestions, adapted them to the project, tested the changes, and fixed issues that came up during development.

Working through the project helped me understand several parts of full-stack development more deeply, especially refresh-token authentication, many-to-many database relationships, backend authorization, cross-user state, and authenticated WebSocket events.

I am comfortable explaining the main parts of the implementation and making changes to them during a follow-up discussion.

---

# Assessment Coverage

The main assessment requirements are covered as follows:

| Requirement                          | Status |
| ------------------------------------ | ------ |
| Signup and validation                | ✅      |
| Login/logout                         | ✅      |
| JWT access + refresh flow            | ✅      |
| bcrypt password hashing              | ✅      |
| Backend user-data isolation          | ✅      |
| Protected endpoints / 401 handling   | ✅      |
| Book CRUD                            | ✅      |
| Search and status filtering          | ✅      |
| Server-side pagination               | ✅      |
| Server-side sorting                  | ✅      |
| Custom shelves                       | ✅      |
| Many-to-many book/shelf relationship | ✅      |
| Shelf cleanup                        | ✅      |
| Shelf sharing                        | ✅      |
| Owner / Editor / Viewer roles        | ✅      |
| Backend RBAC enforcement             | ✅      |
| Shared With Me                       | ✅      |
| Reading progress                     | ✅      |
| Progress validation                  | ✅      |
| Automatic finish + finished date     | ✅      |
| Lending                              | ✅      |
| Borrowed From Others                 | ✅      |
| Lending edge cases                   | ✅      |
| Return flow                          | ✅      |
| Activity log                         | ✅      |
| Socket.IO real-time updates          | ✅      |
| Authenticated sockets                | ✅      |
| Scoped socket events                 | ✅      |
| Reconnect handling                   | ✅      |
| Dashboard statistics                 | ✅      |
| Loading states                       | ✅      |
| Error states                         | ✅      |
| Inline validation                    | ✅      |
| Request loading/disabled states      | ✅      |
| Seed data                            | ✅      |

---

# Final note

BookNest started as a reading-tracker idea, but the main goal of the project became making it behave like a real multi-user application.

The parts I spent the most time on were the backend rules and the interactions between users: especially shelf permissions, lending, reading-progress validation, authentication, and real-time updates.

This project was built as part of a coding assessment.
