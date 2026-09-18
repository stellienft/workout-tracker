import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";
import { SwRegister } from "@/components/sw-register";

// Body copy: a friendly, rounded grotesk. Headings: Sora for a distinct,
// modern display voice. Exposed as CSS variables the theme references.
const fontBody = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--f-body",
});
const fontDisplay = Sora({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
  variable: "--f-display",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://stellio.fit"),
  title: {
    default: "Ares Fitness | Personalised Workout Plans, Strength Training & Fitness Tracking",
    template: "%s · Ares Fitness",
  },
  description:
    "Ares Fitness helps you build strength, lose weight and stay consistent with personalised workout programs, YouTube exercise guides, progress tracking and goal-based training plans.",
  applicationName: "Ares Fitness",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ares Fitness",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Ares Fitness | Personalised Workout Plans, Strength Training & Fitness Tracking",
    description:
      "Ares Fitness helps you build strength, lose weight and stay consistent with personalised workout programs, YouTube exercise guides, progress tracking and goal-based training plans.",
    siteName: "Ares Fitness",
    type: "website",
    images: [
      {
        url: "/OG-Share-StellioFit.png",
        width: 1200,
        height: 630,
        alt: "Ares Fitness — Personalised Workout Plans, Strength Training & Fitness Tracking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ares Fitness | Personalised Workout Plans, Strength Training & Fitness Tracking",
    description:
      "Ares Fitness helps you build strength, lose weight and stay consistent with personalised workout programs, YouTube exercise guides, progress tracking and goal-based training plans.",
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
const themeInit = `(function(){try{var r=document.documentElement;var t=localStorage.getItem('stellio-theme')||'dark';var d=(t==='light')?'light':(t==='dark')?'dark':(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');r.dataset.theme=d;var a=(localStorage.getItem('stellio-accent')||'').toLowerCase();var m={'#ff520e':'orange','#f26a1b':'orange','#ccff30':'orange','#ffb27a':'peach','#3b82f6':'blue','#64748b':'grey'};var k=m[a]||(['orange','peach','blue','grey'].indexOf(a)>=0?a:'');if(!k)k='orange';r.dataset.accent=k;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${fontBody.variable} ${fontDisplay.variable}`}
      suppressHydrationWarning
    >
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
