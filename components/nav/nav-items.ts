import {
  LayoutDashboard,
  Dumbbell,
  BookOpen,
  Library,
  Layers,
  Calendar,
  TrendingUp,
  ClipboardCheck,
  Target,
  HeartPulse,
  Settings,
  ShieldCheck,
  Home,
  User,
  Users,
  MessageSquare,
  Briefcase,
  UserRound,
  Utensils,
  Sparkles,
  Medal,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  trainerOnly?: boolean;
  clientOnly?: boolean;
}

export interface NavSection {
  title?: string; // undefined = top-level (no header)
  items: NavItem[];
}

// Grouped navigation. Sections keep the long list scannable instead of one
// overwhelming column. `sidebarItems` below is the flattened view for
// consumers that just need every destination.
export const navSections: NavSection[] = [
  {
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Train",
    items: [
      { label: "Workouts", href: "/workouts", icon: Dumbbell },
      { label: "Programs", href: "/programs", icon: BookOpen },
      { label: "Exercises", href: "/exercises", icon: Library },
      { label: "My Splits", href: "/splits", icon: Layers },
      { label: "Schedule", href: "/schedule", icon: Calendar },
      { label: "Goals", href: "/goals", icon: Target },
    ],
  },
  {
    title: "Track",
    items: [
      { label: "Progress", href: "/progress", icon: TrendingUp },
      { label: "Achievements", href: "/achievements", icon: Medal },
      { label: "Nutrition", href: "/nutrition", icon: Utensils },
      { label: "Check-ins", href: "/check-ins", icon: ClipboardCheck },
      { label: "Health", href: "/health", icon: HeartPulse },
    ],
  },
  {
    title: "Coaching",
    items: [
      { label: "AI Coach", href: "/ai-coach", icon: Sparkles },
      { label: "My Coach", href: "/my-coach", icon: UserRound, clientOnly: true },
      { label: "Trainer Portal", href: "/trainer", icon: Briefcase, trainerOnly: true },
      { label: "Clients", href: "/trainer/clients", icon: Users, trainerOnly: true },
      { label: "Messages", href: "/trainer/chat", icon: MessageSquare, trainerOnly: true },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Admin", href: "/admin", icon: ShieldCheck, adminOnly: true },
    ],
  },
];

export const sidebarItems: NavItem[] = navSections.flatMap((s) => s.items);

export const bottomNavItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Workouts", href: "/workouts", icon: Dumbbell },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "Schedule", href: "/schedule", icon: Calendar },
  { label: "Profile", href: "/profile", icon: User },
];
