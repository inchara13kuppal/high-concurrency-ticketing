import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const { rows } = await pool.query(
          "SELECT user_id, name, email, password_hash, role FROM users WHERE email = $1",
          [email],
        );
        const user = rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
          return null;
        }
        return { id: user.user_id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as typeof user & { role?: string }).role ?? "Customer";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = String(token.role ?? "Customer");
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET,
};