# LNMIIT Lecture Hall Booking

A full-stack app for booking lecture halls (LTs) at LNMIIT. Student club representatives submit a booking request, and it moves through an approval chain before the hall is confirmed.

**Stack:** React (Create React App) + Tailwind, Node.js + Express, MongoDB (Mongoose), JWT auth in httpOnly cookies, deployed on Vercel.

**Live demo:** `<your-frontend>.vercel.app` (replace with the deployed URL)

## Try it in 30 seconds

1. Open the live demo and click **Try demo (General Secretary)** on the login page.
2. Or sign in manually:

   | Field    | Value                  |
   |----------|------------------------|
   | Email    | `demo.gsec@example.com` |
   | Password | `LHDemo@2026`           |

The demo account has the **General Secretary** role only, which can create booking requests and view its own. It cannot approve anything and has no admin access. The demo runs on a separate, disposable database, so feel free to click around.

## Walkthrough

1. **Book a hall** (`/book`). After login you land on the booking form. Pick a lecture hall (LT1, LT2 or LT19), a club, the start and end date, the start and end time, a reason, and whether you need AV support. Submit to send the request.
2. **Conflict detection.** Try booking LT1 for the same slot as an existing booking. The server rejects it with "LT Already Booked" or "LT Already Requested", depending on whether the earlier request is approved or still pending. Seeded bookings sit on LT1, LT2 and LT19 over the next two weeks, so choose a different date or hall if you want a fresh request to succeed.
3. **Track your requests** (`/reqLogs`). Requests appear under three tabs: pending, approved and rejected. The seeded data fills all three so you can see each state.
4. **Late-night bookings.** If the end time is 22:45 or later, the form asks for a supporting PDF reference.

### How approvals work

A request needs approval from the club's **Faculty Mentor** and the **Assistant Registrar**. If AV support was requested, the **System Administrator** must approve as well. Those roles use the `/requests` screen. They are intentionally not part of the public demo. The seed data includes bookings already at each stage so the GSec views show the whole lifecycle.

## Architecture

```
React SPA (Vercel)  --axios + cookies-->  Express API (Vercel serverless)  -->  MongoDB
```

| Area | Details |
|------|---------|
| Auth | `POST /auth/login` checks the password with bcrypt and sets a 1-day JWT in an httpOnly, secure, `SameSite=None` cookie. |
| Roles | `systemAdministrator`, `assistantRegistrar`, `facultyMentor`, `guard`, `gsec`. Route-level checks live in `middlewares/`. |
| Bookings | One `Booking` document tracks three independent approval statuses (faculty, assistant registrar, system administrator). |
| Cleanup | Bookings whose end date has passed are deleted daily by a Vercel Cron job calling `/deleteUnwanted`. |

## Run it locally

Prerequisites: Node 18+, and a MongoDB database (a free MongoDB Atlas cluster is fine).

```bash
# Backend
cd LH-Management-Backend-main
cp .env.example .env        # fill in MONGODB_URL and the secrets
npm install
npm run seed:demo           # creates the demo user and sample bookings
npm run dev                 # http://localhost:9000

# Frontend (new terminal)
cd lh_management-main
cp .env.example .env        # REACT_APP_BACKEND_URL=http://localhost:9000
npm install
npm start                   # http://localhost:3000
```

`npm run seed:demo` can be re-run at any time. It resets the demo user's password and replaces only the demo user's bookings.

## Environment variables

**Backend** (`LH-Management-Backend-main/.env`, or Vercel project settings)

| Variable | Purpose |
|----------|---------|
| `MONGODB_URL` | MongoDB connection string |
| `JWT_SECRET` | Signs and verifies login tokens (required in production) |
| `SESSION_SECRET` | Express session secret (defaults to `JWT_SECRET`) |
| `CLIENT_ORIGINS` | Comma-separated frontend origins allowed by CORS |
| `CRON_SECRET` | Protects `/deleteUnwanted`; Vercel Cron sends it automatically |
| `ALLOW_SIGNUP` | Set to `true` to enable `POST /auth/signup` (off by default because callers choose their own role) |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | Optional overrides for the seeded demo account |

**Frontend** (`lh_management-main/.env`, or Vercel project settings)

| Variable | Purpose |
|----------|---------|
| `REACT_APP_BACKEND_URL` | Backend base URL, no trailing slash |
| `REACT_APP_DEMO_EMAIL`, `REACT_APP_DEMO_PASSWORD` | Credentials used by the "Try demo" button |

## Deploying to Vercel

Create two Vercel projects from this repo.

1. **Backend:** set the root directory to `LH-Management-Backend-main` and add the backend variables above. Set `CLIENT_ORIGINS` to the frontend's URL.
2. **Frontend:** set the root directory to `lh_management-main` and add `REACT_APP_BACKEND_URL` pointing at the backend project's URL.
3. Run `npm run seed:demo` once against the production database (from your machine, with `MONGODB_URL` pointing at it).

The frontend and backend live on different domains, so login relies on cross-site cookies. Browsers that block third-party cookies (Safari, or Chrome in incognito) may not keep the session.
