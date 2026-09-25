import type { Metadata } from "next";
import { Landing } from "@/components/marketing/landing";

export const metadata: Metadata = {
  title: "Ares Fitness - Train Like a God",
  description:
    "Ares Fitness is the all-in-one strength coach for iPhone: adaptive programs, set-by-set logging, AI coaching, meal plans, progress tracking and shareable milestones. Exclusively on iOS.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <Landing />;
}
