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

The logged-out landing state uses a full-screen hero image layer driven by the `--hero-image` CSS variable in `src/styles.css`. Swap that variable to your chosen image when you’re ready.

Run the API separately:

```bash
npm run dev:api
```

To use PostgreSQL, set the environment variables in `server/.env.example` and apply `server/schema.sql`.

## Why This Works Well

- It shows full CRUD instead of a static showcase app
- It gives you a natural authentication and dashboard story
- It is easy to grow from frontend-only into a full-stack system
- It solves a real product problem for a niche audience

## Run It

```bash
npm install
npm run dev
```
