import { pool } from "@/lib/db";

export async function getBookingAgeError(userId: string): Promise<string | null> {
  const { rows } = await pool.query<{
    date_of_birth: string | null;
    is_adult: boolean | null;
  }>(
    `SELECT date_of_birth::text AS date_of_birth,
            CASE
              WHEN date_of_birth IS NULL THEN NULL
              ELSE date_of_birth <= CURRENT_DATE
                AND EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_birth)) >= 18
            END AS is_adult
       FROM users
      WHERE user_id = $1`,
    [userId],
  );
  const user = rows[0];
  if (!user || !user.date_of_birth) return "Add your date of birth before booking tickets.";
  if (!user.is_adult) return "You must be 18 or older to book tickets.";
  return null;
}