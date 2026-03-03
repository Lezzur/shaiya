import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  let session;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }

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
