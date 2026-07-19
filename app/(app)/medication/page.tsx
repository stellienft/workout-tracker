import { redirect } from "next/navigation";

// The Medication section is now part of the broader Health tracker.
export default function MedicationRedirect() {
  redirect("/health");
}
