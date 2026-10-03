# Seatline

A high-concurrency event ticketing app built with Next.js App Router, PostgreSQL, MongoDB, and Upstash Redis.

## Local/Replit setup

1. Connect the project's managed PostgreSQL database. Replit provides its database URL as `DATABASE_URL`.
2. Add these secrets in Replit: `MONGODB_URI`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `SESSION_SECRET`. `SESSION_SECRET` is used as the NextAuth secret when `NEXTAUTH_SECRET` is not set.
3. Install the project dependencies and run:

   ```sh
   npm run db:init
   npm run db:seed
   npm run dev
   ```

   The first command creates the PostgreSQL schema and sample events. The second adds flexible sample event metadata to MongoDB.
4. Create a normal account at `/register`.
5. To grant admin access, set the role for the account you created in the development database:

   ```sql
   UPDATE users SET role = 'Admin' WHERE email = 'your-account@example.com';
   ```

   Sign out and sign back in so the updated role is loaded into the session.

Do not run the initialization script against production. Replit's managed production schema is updated through the Publish flow.

## Data layout

- PostgreSQL owns accounts, venues, events, bookings, the sales summary view, and the booking transaction.
- MongoDB's `event_details` collection stores flexible event descriptions, image URLs, tags, cast, and FAQs. The `reviews` collection is available for user review records.
- Upstash Redis stores five-minute seat locks under `lock:event_{id}:seat_{num}`.

Payments in this build are intentionally simulated; no card information is collected or charged.