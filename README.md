# Film Roll Tracker

Film Roll Tracker is a portfolio project for film photographers who want to log rolls, track camera and lens usage, record film stock and ISO, and review development progress in one dashboard.

## MVP

- Create a roll entry
- Fields for camera, lens, film stock, ISO, and date loaded
- Mark roll status as loaded, shot, developed, or scanned
- Edit and delete entries
- Filter by status, stock, and camera
- Dashboard with basic stats

## Stretch Ideas

- Upload scan previews
- Lab tracking
- Shooting notes by frame range
- Public share page for completed rolls
- Analytics charts

## Suggested Stack

- React
- TypeScript
- Node and Express
- PostgreSQL
- JWT auth
- Cloudinary or similar for image upload
- Chart.js or Recharts

## Auth Scaffold

The backend now includes a JWT auth scaffold in `server/`:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- PostgreSQL-ready user storage
- In-memory fallback for local development without a database
- User-owned rolls with edit/delete permissions enforced on the server

The frontend authenticates against the API, loads only the signed-in user’s rolls, and only enables edit/delete actions for rolls owned by that account.

The logged-out landing state now starts with a full-screen hero image area, a centered main title, and a sign-up button in the top-right header bar. Drop your image at `public/hero.jpg` and it will render in the hero automatically. Below that, the page splits into demo stats on the left and the sign-up/login box on the right.

## Database Setup

To use PostgreSQL locally:

1. Create a database.
2. Set `DATABASE_URL` in `server/.env`.
3. Apply the schema:

```bash
npm run db:setup
```

The setup script reads `server/schema.sql` and creates the `users` and `rolls` tables if they do not already exist.

Run the API separately:

```bash
npm run dev:api
```

## Why This Works Well

- It shows full CRUD instead of a static showcase app
- It gives you a natural authentication and dashboard story
- It is easy to grow from frontend-only into a full-stack system
- It solves a real product problem for a niche audience

## Run It

```bash
npm install
npm run db:setup
npm run dev:api
npm run dev
```
