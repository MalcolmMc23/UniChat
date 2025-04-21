EduChat is a lightning‑fast, anonymous 1:1 text‑chat web app restricted to users with .edu email addresses. It connects students across campuses in real time—no profiles, no names—just two verified edu‑accounts sharing ideas, venting, or meeting new peers.

Target audience:
College/university students with a valid .edu email.

Core features:

Edu‑only authentication via NextAuth.js (email link flow allowing only \*.edu domains).

Anonymous pairing using a simple in‑memory queue: as soon as two verified users connect, they’re matched for a private chat.

Real‑time messaging over Socket.IO, with automatic reconnection and “typing” indicators.

Report & moderation endpoint: one‑click “Report user” logs abuse reports to PostgreSQL for admin review.

Ephemeral rooms—no chat history stored beyond session, ensuring privacy by default.

Tech stack:

Frontend: Next.js (TypeScript + SSR), Tailwind CSS

Auth: NextAuth.js with email‑link provider, restricted to .edu

Realtime: Socket.IO (Node.js serverless API route)

Database: PostgreSQL + Prisma ORM (users, sessions, reports)

Deployment: Vercel for frontend/API, Railway (or Heroku) for Postgres

High‑level flow:

User lands on /login → verifies via edu‑email link.

On login success, client connects Socket.IO → enters “waiting” state.

Server queues socket, then emits a matched event with partner’s socket ID.

Both clients render the chat UI and exchange messages peer‑to‑peer (via the server relay).

“Report user” sends a POST to /api/report, storing domain, timestamp, and reporter.

Forward‑look considerations:

Scalability & persistence: swap in Redis for the pairing queue; shard Socket.IO across nodes.

Privacy & compliance: consider end‑to‑end encryption or GDPR/FERPA requirements.

Feature roadmap: add interest‑based matching, group rooms, or optional usernames.

This overview captures the essence, flows, and tech of your MVP—and sets the stage for next‑wave enhancements.
