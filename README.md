# Club Auction

A mobile-first, point-based player auction app for a cricket club/tournament.
Coordinators register clubs, add players, and run a live auction; club
managers bid from their own phone; everyone watches bids, rosters, and
remaining budgets update in real time. Runs entirely in the mobile browser —
no native app.

## Stack

- **React + TypeScript + Vite**, styled with **Tailwind CSS v4**.
- **Firebase** (free "Spark" plan — no billing account needed):
  - **Firestore** for all data, synced live to every open screen via
    `onSnapshot` listeners.
  - **Firebase Auth** (email/password under the hood) for login. Users only
    ever see a mobile number + password; the mobile number is mapped to a
    synthetic email (`<digits>@tcc-auction.app`) internally — see
    `src/firebase.ts`.
  - **Firebase Storage** for player photos and club logos.
  - **Firebase Hosting** to deploy the built site for free.
- No custom backend/server and no Cloud Functions, so it stays on the free
  tier. All business rules (who can bid, whether a club can afford a bid,
  who can approve a club) are enforced by **Firestore Security Rules**
  (`firestore.rules`), not trusted to the client.

## Roles

- **Coordinator** — creates a tournament, approves/rejects club
  registrations, adds players, and runs the live auction (draw next player,
  mark sold/unsold). Signs up directly at `/signup`.
- **Manager** (= club/team) — registers their club against a tournament's
  registration link (`/t/:tournamentId/register`), then, once approved,
  bids live from `/t/:tournamentId/live`.

## Data model (Firestore)

```
users/{uid}                              — profile: mobile, name, role
tournaments/{tournamentId}               — name, defaultBasePrice, defaultBudget, auctionStatus
  clubs/{clubId}                         — name, managerUid, budget, remainingPoints, status
  players/{playerId}                     — name, role, basePrice, status, soldToClubId, soldPrice
  auction/state                          — currentPlayerId, currentBid, currentBidClubId
    bids/{bidId}                         — audit log of every bid placed
```

Bidding flow: a manager's bid updates `auction/state` directly (validated by
security rules against their club's `remainingPoints`); the coordinator's
"Sold" action is the only thing that actually debits `remainingPoints` and
assigns the player, inside a Firestore transaction.

## One-time setup

1. **Create a Firebase project** at https://console.firebase.google.com
   (stay on the free Spark plan — nothing here needs Blaze).
2. In the project: **Build → Authentication → Sign-in method** → enable
   **Email/Password**.
3. **Build → Firestore Database** → create database (production mode,
   any region).
4. **Build → Storage** → get started (default bucket, production mode).
5. **Project settings → General → Your apps** → add a **Web app** → copy
   the config values.
6. Copy `.env.example` to `.env` and fill in the values from step 5:
   ```
   cp .env.example .env
   ```

## Local development

```bash
npm install
npm run dev
```

## Deploy (free)

```bash
npm install -g firebase-tools   # one-time
firebase login
firebase use --add               # pick the project you created above
npm run build
firebase deploy --only hosting,firestore:rules,storage:rules
```

Your app is now live at `https://<project-id>.web.app`, works on any mobile
browser, and costs nothing at typical club-tournament scale (Firestore's
free quota is generous: 50K reads/20K writes per day).

## Using it

1. Coordinator signs up at `/signup`, creates a tournament from the
   dashboard (sets the default player base price and per-club budget).
2. Coordinator copies the **club registration link** from the tournament's
   admin page (`/t/:id/admin`) and shares it with each club.
3. Each club manager opens the link, registers their club (name, logo,
   budget, and their own mobile number + password), and waits for approval.
4. Coordinator approves clubs under the **Clubs** tab, and adds players
   under the **Players** tab (name, mobile, role, photo, base price, home
   club).
5. Coordinator hits **Start auction** under the **Auction** tab — players
   are drawn in random order.
6. Everyone (coordinator, all club managers, spectators) watches
   `/t/:id/live`: the current player, current bid, and every club's
   remaining points and roster, updating instantly. Managers bid with one
   tap; the increment step grows with the bid size (see
   `src/lib/auctionRules.ts`).
7. Coordinator marks the player **Sold** (to the current highest bidder) or
   **Unsold**, and the next random player comes up automatically.

## Notes / possible follow-ups

- Login is mobile number + password (coordinator sets no SMS cost). Real
  SMS OTP via Firebase Phone Auth is a drop-in swap in
  `src/context/AuthContext.tsx` if you'd rather verify numbers.
- No CSV bulk player import yet — players are added one at a time from the
  admin **Players** tab.
- No countdown timer on bids yet (bidding stays open until the coordinator
  manually marks Sold/Unsold), which matches how most live club auctions
  are actually run with a human auctioneer.
- `firestore.rules` is the security-critical file — test any changes to it
  with the Firebase emulator before deploying.
