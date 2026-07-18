import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SwRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: {
    default: "Stellio Fit — Train Smarter. Build Stronger.",
    template: "%s · Stellio Fit",
  },
  description:
    "Stellio Fit is a premium, mobile-first fitness platform. Choose a goal, follow a program, log every set, and build stronger.",
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
};

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
