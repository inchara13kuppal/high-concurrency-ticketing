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

   The first command applies the PostgreSQL schema and Indian sample events, and seeds a demo admin. It is development-only and resets that demo account's password to the value below. The second adds Bollywood and Sandalwood film details to MongoDB.
4. Register at `/register` with your date of birth. Accounts under 18 cannot hold or book seats. Existing accounts created before the DOB field was added must have their DOB filled in before booking, for example:

   ```sql
   UPDATE users SET date_of_birth = DATE '1990-01-01' WHERE email = 'your-account@example.com';
   ```

5. For the seeded development admin, sign in with `admin@demo.com` and `Admin@123`. This fixed credential is for local demos only; do not publish or run `db:init` against production.
6. To grant admin access to another development account, set its role:

   ```sql
   UPDATE users SET role = 'Admin' WHERE email = 'your-account@example.com';
   ```

   Sign out and sign back in so the updated role is loaded into the session.

Do not run the initialization script against production. Replit's managed production schema is updated through the Publish flow.

## Data layout

- PostgreSQL owns accounts, venues, events, bookings, the sales summary view, and the booking transaction.
- MongoDB's `event_details` collection stores descriptions, images, tags, FAQs, and film credits (`director`, `lead_artists`, and `music_director`). The `reviews` collection remains available, but review prompts are not shown in the booking flow.
- PostgreSQL stores DOBs and successful-login history; each login record includes the available client IP address.
- Upstash Redis stores five-minute seat locks under `lock:event_{id}:seat_{num}`. Multi-seat holds are acquired atomically as a group.
- Ticket prices, checkout totals, and sales totals are displayed in Indian rupees. On successful simulated checkout, the app opens a private ticket confirmation page and sends a mock Ethereal email; its preview URL appears in the workflow console logs.

Payments in this build are intentionally simulated; no card information is collected or charged. Ethereal emails are test messages, not real delivery.