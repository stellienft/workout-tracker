import { redirect } from "next/navigation";
import { getAuthContext, isTrainerRole, isAdminRole } from "@/lib/auth";

/**
 * Trainer tools are free to use with a 1-client limit; the Trainer plan lifts
 * that limit and unlocks the Pro features. So the portal itself is open to any
 * trainer (and admins) — non-trainers are sent home. The client cap is enforced
 * where clients are added (see inviteClient) and surfaced on the Clients page.
 */
export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { roles } = await getAuthContext();
  if (!isTrainerRole(roles) && !isAdminRole(roles)) redirect("/dashboard");

  return <>{children}</>;
}
