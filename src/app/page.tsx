import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  // Not authenticated - redirect to login
  if (!session?.user) {
    redirect("/login");
  }

  const userRole = session.user.role;

  // Authenticated - redirect based on role
  if (userRole === "ADMIN" || userRole === "TEAM") {
    redirect("/war-room");
  }

  if (userRole === "CLIENT") {
    redirect("/portal");
  }

  // Fallback - shouldn't reach here
  redirect("/login");
}
