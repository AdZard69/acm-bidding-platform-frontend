# acm-bidding-platform-frontend

Frontend web application for **"Bid and Code"** — an open auction hackathon format developed for ACM hackathons where teams bid on time commitments before coding.

---

## Overview

In "Bid and Code", teams bid time commitments (in minutes) for problem statements:
- **Formula**: `Multiplier = e ^ (k × (1 - bid / 120))`
  - Round 1: `k = 1.0` (Multipliers from 1.000x at 120 mins to 2.117x at 30 mins)
  - Round 2: `k = 0.7` (Multipliers from 1.000x at 120 mins to 1.690x at 30 mins)
- **Rules**:
  - Open auction: all bids stream in real-time.
  - Anti-collision: no two teams can bid the exact same minute commitment on the same prompt.
  - Lowest 3 bidders win the problem statement slots and lock in their multiplier.
  - Final score: `Final Score = Judge Score (0-100) × Multiplier`.

---

## Features

1. **Auditorium Projector Arena (`/arena`)**:
   - Designed for high-impact display on auditoriums and projectors.
   - Large live synchronized countdown timer with urgency color transitions.
   - Active problem statement display card with formatting.
   - Real-time auction wall highlighting the top 3 qualifying bids.
   - Celebration overlay with confetti and sound effects on prompt completion.
   - Fullscreen mode support.

2. **Team Bidding & Coding Portal (`/team`)**:
   - Live bidding console with sliders, quick-chips (30m, 45m, 60m...), and fine tuning.
   - Real-time multiplier simulator previewing projected score on hypothetical judge scores.
   - Anti-collision conflict detection preventing duplicate minute bids.
   - Problem statement viewer when awarded.
   - Dedicated personal coding timer stopwatch for team execution.
   - Official score receipt card.

3. **Game Master Admin Console (`/admin`)**:
   - Live round operations: Start Round 1 / Round 2, Pause, Resume, Extend Timer (+15s, +30s, +60s), Force Next Prompt, End Round.
   - Team Management: Create, edit, toggle active status, delete teams.
   - Prompt Management: Create problem statements, edit descriptions, adjust display order.
   - Judging Panel: Enter raw scores (0-100) per team with instant calculated final score preview.
   - Parameter Configuration: Base time, minimum bid, slots per prompt, countdown duration.
   - Nuclear Reset: Reset game state back to waiting with optional team/prompt wipe.

4. **Public Leaderboard (`/leaderboard`)**:
   - Standings table sorted by final score descending.
   - Top 3 podium badges (Gold, Silver, Bronze).
   - Real-time search and filter.

5. **Design & Audio System**:
   - Cyberpunk ACM dark theme with glassmorphism and glowing neon accents.
   - Built-in Web Audio API sound synthesizer (countdown ticks, buzzer, victory chimes) — zero external asset dependencies.
   - Sound toggle & formula simulator modal accessible across all views.

---

## Tech Stack

- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Real-Time**: Socket.IO Client
- **Icons**: Lucide React
- **Celebration FX**: Canvas Confetti
- **Audio**: Web Audio API Sound Synthesizer

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
The production bundle will be generated in `dist/`.
