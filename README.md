# acm-bidding-platform-frontend

Clean, minimalist frontend web application for **"Bid and Code"** — an open-auction hackathon platform for ACM hackathons where teams bid on time commitments before coding.

---

## Overview

In "Bid and Code", teams bid time commitments (in minutes) for problem statements:
- **Formula**: `Multiplier = e ^ (k × (1 - bid / 120))`
  - Round 1: `k = 1.0` (Multipliers from 1.000x at 120 mins to 2.117x at 30 mins)
  - Every prompt round uses `k = 1.0`; later prompts have no scoring penalty.
- **Rules**:
  - Open auction: bids stream in real-time.
  - Anti-collision: no two teams can bid the exact same minute commitment on the same prompt.
  - Lowest 3 bidders win the problem statement slots and lock in their multiplier.
  - Final score: `Final Score = Judge Score (0-100) × Multiplier`.

---

## Views

1. **Auditorium Projector Arena (`/arena`)**:
   - Clean, high-contrast big-screen display for projectors.
   - Large digital countdown timer with urgency color transitions.
   - Active problem statement display card with clear formatting.
   - Live placed bids list highlighting the 3 qualifying slots.
   - Fullscreen mode support.

2. **Team Bidding Portal (`/team`)**:
   - Clean bidding console with sliders and presets (30m, 45m, 60m...).
   - Real-time multiplier and score boost preview.
   - Live anti-collision conflict detection preventing duplicate minute bids.
   - Awarded problem statement viewer once slots are won.
   - Official score card showing judge score, multiplier, and final score.

3. **Game Master Admin Room (`/admin`)**:
   - Operational controls: Start sequential prompt rounds, Pause, Resume, Extend Timer (+15s, +30s, +60s), Next Round / Prompt, End Round.
   - Team Management: List, create, toggle active status, and delete teams.
   - Prompt Management: Create problem statements, edit descriptions, adjust display order.
   - Judging Panel: Enter raw scores (0-100) per team with instant calculated final scores.
   - Game Parameters: Base time, minimum bid, slots per prompt, countdown duration.
   - Nuclear Reset: Reset game state back to waiting with optional team/prompt wipe.

4. **Public Standings (`/leaderboard`)**:
   - Clean tabular rankings sorted by final score descending.
   - Instant search and filter by team name or problem title.
   - Auto-refresh synchronization.

---

## Tech Stack

- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Real-Time**: Socket.IO Client
- **Icons**: Lucide React

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```
Production output will be generated in `dist/`.

### Bidding countdown and integration

The navbar, admin, team and arena display the backend's bidding countdown. The
browser interpolates `remainingMs` using monotonic elapsed time. Pausing,
extending and resuming update all views, and reload/reconnect restore the active
prompt, countdown, assignment and score. Bid limits and provisional winner slots
come from the server's snapshot.

Admin mutations are sent once; HTTP mutations publish real-time socket updates.
Team bids include the viewed prompt, round and timer session. Public viewers use
spectator sockets. Disconnected views poll until their connection returns.

`VITE_API_URL` includes `/api`. `VITE_SOCKET_URL` is optional when HTTP and sockets
share a host; otherwise set both to the intended backend. Deploy together with
the backend's persisted-timer migration and run one backend instance.

Run `npm test` for countdown behavior tests and `npm run build` for TypeScript
checking and the production bundle.


Each prompt is one round in display order. At timer expiry, that round closes and
its prompt, bids and winners remain visible. Only the admin's Next action opens
the next prompt. History tabs group by prompt round, including legacy records
stored under a shared bidding pass. Reloading or reconnecting retains the closed
round until the admin advances. Every prompt round uses the same multiplier curve.
