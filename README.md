# Film Roll Tracker

Film Roll Tracker is a portfolio project for film photographers who want to log rolls, track camera and lens usage, record film stock and ISO, and review development progress in one dashboard.

## MVP

- Create a roll entry
- Fields for camera, lens, film stock, ISO, and date loaded
- Mark roll status as loaded, shot, developed, or scanned
- Edit and delete entries
- Filter by status, stock, and camera
- Dashboard with basic stats
- Film-stock catalog loaded from [The Film API](https://filmapi.vercel.app/api/films), with local fallback entries
- Attach scan previews to individual rolls

## Stretch Ideas

- Move scan files to Supabase Storage
- Lab tracking
- Shooting notes by frame range
- Public share page for completed rolls
- Analytics charts

## Stack

- React
- TypeScript
- Supabase Auth and PostgreSQL
- GitHub Pages

## Sources and Attribution

The film-stock catalog is sourced from [The Film API](https://filmapi.vercel.app/), using its public [`/api/films`](https://filmapi.vercel.app/api/films) endpoint. We use the catalog’s brand, film name, ISO, format availability, color/process information, descriptions, and product-image URLs to enhance roll entry. The app keeps local fallback entries and supports custom film names so it is not dependent on the external service.

Product images are loaded from the external URLs returned by The Film API. Review the API and image providers’ usage terms before deploying this project publicly or using the assets commercially.

## Supabase Backend

The production frontend connects directly to the dedicated `Film Roll Tracker` Supabase project for authentication and data:

- Email/password authentication
- User profiles and user-owned rolls
- Roll activity and scan-preview metadata
- Row-level security policies on every exposed table

The legacy Express API remains in `server/` for local reference, but it is no longer used by the GitHub Pages frontend. Supabase owns authentication and enforces access to each user’s records.

The film-stock picker requests catalog data from The Film API’s public `/api/films` endpoint and retains the local fallback list and support for custom film-stock names if that service is unavailable.

Scan previews currently use the prototype upload flow: the selected image is converted to a Base64 data URL in the browser and stored in the `file_url` column of the user-owned `roll_uploads` table. The app does not use Supabase Storage yet. This keeps the prototype simple, but large scans can increase database size; moving files to a private Supabase Storage bucket is a planned improvement.

The logged-out landing state now starts with a full-screen hero image area, a centered main title, and a sign-up button in the top-right header bar. Drop your image at `public/hero.jpg` and it will render in the hero automatically. Below that, the page splits into demo stats on the left and the sign-up/login box on the right.

### Supabase Configuration

Create a `.env.local` file with the project URL and publishable key:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The GitHub Pages workflow expects the same values as repository variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Database Setup

To use PostgreSQL locally:

1. Make sure PostgreSQL is running.
2. Create a database named `film_roll_tracker`.
3. Copy [server/.env.example](/Users/myke/Documents/GitHub/Film-Roll-Tracker/server/.env.example) to [server/.env](/Users/myke/Documents/GitHub/Film-Roll-Tracker/server/.env).
4. Set `DATABASE_URL` to your local Postgres role. On many Homebrew installs, that is your macOS username, not `postgres`.
5. Apply the schema:

```bash
npm run db:setup
```

The setup script reads `server/schema.sql` and creates the legacy local `users` and `rolls` tables if they do not already exist. The production GitHub Pages frontend uses the separate Supabase schema instead.

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
