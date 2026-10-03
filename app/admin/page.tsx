import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminSales } from "@/components/admin-sales";

export const metadata: Metadata = { title: "Sales dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fadmin");
  if (session.user.role !== "Admin") redirect("/?access=restricted");

  return <AdminSales />;
}