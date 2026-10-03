import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { isValidDateOfBirth } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; password?: unknown; dateOfBirth?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid registration form." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const dateOfBirth = typeof body.dateOfBirth === "string" ? body.dateOfBirth : "";

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: "Name must be between 2 and 120 characters." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 10 || password.length > 128) {
    return NextResponse.json({ error: "Use a password between 10 and 128 characters." }, { status: 400 });
  }
  if (!isValidDateOfBirth(dateOfBirth)) {
    return NextResponse.json({ error: "Enter a valid date of birth." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, date_of_birth)
       VALUES ($1, $2, $3, $4::date)
       RETURNING user_id, name, email`,
      [name, email, passwordHash, dateOfBirth],
    );
    return NextResponse.json({ user: rows[0] }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("Registration failed", error);
    return NextResponse.json({ error: "We couldn't create your account right now." }, { status: 500 });
  }
}