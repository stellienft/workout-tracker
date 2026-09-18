import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Home Hub",
  description: "Voice-controlled home hub — alarms, weather, music and routines.",
  // The hub installs as its own icon so a tablet can boot straight into kiosk
  // mode without the rest of the app's chrome.
  manifest: "/hub.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
  // A wall tablet should never pinch-zoom out of the layout.
  userScalable: false,
  maximumScale: 1,
};

/**
 * Kiosk shell. Deliberately outside the (app) route group: no sidebar, no
 * bottom nav, nothing to tap by accident when you walk past it.
 */
export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getAuthContext();
  if (!user) redirect("/login?next=/hub");

  return (
    <div className="min-h-dvh bg-[var(--background-primary)] text-[var(--text-primary)] select-none">
      {children}
    </div>
  );
}
