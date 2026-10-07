# High-Concurrency Event Ticketing System - DBMS Project

A scalable, high-concurrency event ticketing platform (similar to BookMyShow) built to demonstrate advanced database management concepts, race condition prevention, and polyglot persistence. Developed as a DBMS Level 3 Mini Project.

## Team Members

* **Inchara K Kuppal** – PES1UG25CS818
* **Kari Bhavitha** – PES1UG25CS821

---

##  Polyglot Database Architecture

This project strictly implements a polyglot persistence strategy, utilizing three distinct database engines to handle specific data workloads efficiently:

### 1. PostgreSQL (Relational / ACID Data)

Handles all strict, structured financial and transactional data.

* **Tables:** `users`, `venues`, `events`, `bookings`, `login_history`.
* **Advanced Features Implemented:**
* **Transactions:** Ensures atomicity during the checkout phase (booking and payment confirmation).
* **Triggers:** Automatically decrements the `available_seats` count in the `events` table upon a successful booking insert.
* **Views:** Utilizes an `event_sales_summary_view` joining multiple tables with aggregations (`GROUP BY`) to power the Admin sales dashboard.
* **Constraints & Indexes:** Utilizes `CHECK` constraints (e.g., minimum age/price) and composite unique indexes to maintain data integrity.



### 2. MongoDB (Non-Relational / Flexible Data)

Handles unstructured, dynamic data that varies from event to event (e.g., movies vs. concerts).

* **Collections:**
* `event_details`: Stores dynamic JSON metadata including images, cast, directors, music directors, and FAQs.
* `reviews`: Stores read-heavy, high-volume user feedback and ratings.



### 3. Upstash Redis (Caching & Concurrency)

Prevents race conditions (double-booking) in a high-traffic environment.

* **Seat Locking:** Utilizes the `SET ... NX EX 300` command to create a strict 5-minute temporary lock on a specific seat the moment a user clicks it. If the transaction fails or expires, the lock is instantly released.

---

##  Core Features

* **Role-Based Access Control (RBAC):** Distinct interfaces and permissions for `Admin` and `Customer` roles using NextAuth.
* **Real-Time Seat Mapping:** Interactive UI where locked or purchased seats are instantly greyed out for concurrent users.
* **Multi-Seat Checkout:** Ability to lock and purchase an array of seats simultaneously within a single ACID transaction.
* **Age Validation logic:** Backend calculation restricting specific event bookings to users 18 and older based on their date of birth.
* **Admin Dashboard:** Secure portal to execute CRUD operations on events and view aggregated financial reports.
* **Automated Email Confirmation:** Simulates digital ticket delivery upon a successfully committed PostgreSQL transaction.

---

##  Tech Stack

* **Frontend & Backend:** Next.js (App Router), React, Tailwind CSS
* **Databases:** PostgreSQL (`pg`), MongoDB Atlas (`mongodb`), Upstash Redis (`@upstash/redis`)
* **Authentication:** NextAuth.js (Credentials Provider + bcrypt)
* **Email Simulation:** Nodemailer

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/inchara13kuppal/high-concurrency-ticketing.git
cd high-concurrency-ticketing

```

### 2. Install Dependencies

```bash
npm install

```

### 3. Configure Environment Variables

Create a file named `.env.local` in the root directory and add your cloud database credentials:

```env
# Database Connections
MONGODB_URI="your_mongodb_connection_string"
UPSTASH_REDIS_REST_URL="your_upstash_url"
UPSTASH_REDIS_REST_TOKEN="your_upstash_token"
DATABASE_URL="your_postgres_connection_string"

# NextAuth Configuration
NEXTAUTH_SECRET="your_secure_secret_key"
NEXTAUTH_URL="http://localhost:3000"

```

### 4. Run the Development Server

```bash
npm run dev

```

Navigate to `http://localhost:3000` to interact with the application.

---

## Database Evaluation & Live Demo

To query the relational data during the evaluation:

1. Install the **SQLTools** and **SQLTools PostgreSQL/Cockroach Driver** extensions in VS Code.
2. Add a new PostgreSQL connection using the `DATABASE_URL` from the environment variables.
3. Use the integrated SQL explorer to execute queries and monitor table states (e.g., verifying `ROLLBACK` vs `COMMIT` states in the `bookings` table) alongside the running Next.js server.
