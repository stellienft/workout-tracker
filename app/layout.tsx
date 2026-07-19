import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SwRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  metadataBase: new URL("https://stellio.fit"),
  title: {
    default: "Stellio Fit | Personalised Workout Plans, Strength Training & Fitness Tracking",
    template: "%s · Stellio Fit",
  },
  description:
    "Stellio Fit helps you build strength, lose weight and stay consistent with personalised workout programs, YouTube exercise guides, progress tracking and goal-based training plans.",
  applicationName: "Stellio Fit",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stellio Fit",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Stellio Fit | Personalised Workout Plans, Strength Training & Fitness Tracking",
    description:
      "Stellio Fit helps you build strength, lose weight and stay consistent with personalised workout programs, YouTube exercise guides, progress tracking and goal-based training plans.",
    siteName: "Stellio Fit",
    type: "website",
    images: [
      {
        url: "https://images.pexels.com/photos/4164761/pexels-photo-4164761.jpeg?auto=compress&cs=tinysrgb&w=1200",
        width: 1200,
        height: 630,
        alt: "Stellio Fit — Train Smarter. Build Stronger.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stellio Fit | Personalised Workout Plans, Strength Training & Fitness Tracking",
    description:
      "Stellio Fit helps you build strength, lose weight and stay consistent with personalised workout programs, YouTube exercise guides, progress tracking and goal-based training plans.",
    images: [
      "https://images.pexels.com/photos/4164761/pexels-photo-4164761.jpeg?auto=compress&cs=tinysrgb&w=1200",
    ],
  },
};

// Co-locate server rendering with the Supabase project (Sydney) so per-page
// auth + data queries don't cross the Pacific on every navigation.
export const preferredRegion = ["syd1"];

export const viewport: Viewport = {
  themeColor: "#0D0D0D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
