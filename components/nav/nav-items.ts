import {
  LayoutDashboard,
  Dumbbell,
  BookOpen,
  Library,
  Calendar,
  TrendingUp,
  ClipboardCheck,
  Target,
  HeartPulse,
  Settings,
  ShieldCheck,
  Home,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const sidebarItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workouts", href: "/workouts", icon: Dumbbell },
  { label: "Programs", href: "/programs", icon: BookOpen },
  { label: "Exercises", href: "/exercises", icon: Library },
  { label: "Schedule", href: "/schedule", icon: Calendar },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "Check-ins", href: "/check-ins", icon: ClipboardCheck },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Health", href: "/health", icon: HeartPulse },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Admin", href: "/admin", icon: ShieldCheck, adminOnly: true },
];

export const bottomNavItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Workouts", href: "/workouts", icon: Dumbbell },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "Schedule", href: "/schedule", icon: Calendar },
  { label: "Profile", href: "/profile", icon: User },
];
