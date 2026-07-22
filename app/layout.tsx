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
        url: "/OG-Share-StellioFit.png",
        width: 1200,
        height: 630,
        alt: "Stellio Fit — Personalised Workout Plans, Strength Training & Fitness Tracking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stellio Fit | Personalised Workout Plans, Strength Training & Fitness Tracking",
    description:
      "Stellio Fit helps you build strength, lose weight and stay consistent with personalised workout programs, YouTube exercise guides, progress tracking and goal-based training plans.",
    images: ["/OG-Share-StellioFit.png"],
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

// Applies the saved theme + accent before first paint to avoid a flash.
const themeInit = `(function(){try{var r=document.documentElement;var t=localStorage.getItem('stellio-theme')||'dark';var d=t==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;r.dataset.theme=d;var a=localStorage.getItem('stellio-accent');if(a){r.style.setProperty('--accent-base',a);r.style.setProperty('--color-accent',a);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="font-sans">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
