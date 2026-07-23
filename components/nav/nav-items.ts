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

export const sidebarItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workouts", href: "/workouts", icon: Dumbbell },
  { label: "My Splits", href: "/splits", icon: Layers },
  { label: "Nutrition", href: "/nutrition", icon: Utensils },
  { label: "Programs", href: "/programs", icon: BookOpen },
  { label: "Exercises", href: "/exercises", icon: Library },
  { label: "Schedule", href: "/schedule", icon: Calendar },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "AI Coach", href: "/ai-coach", icon: Sparkles },
  { label: "Check-ins", href: "/check-ins", icon: ClipboardCheck },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Health", href: "/health", icon: HeartPulse },
  { label: "My Coach", href: "/my-coach", icon: UserRound, clientOnly: true },
  { label: "Trainer Portal", href: "/trainer", icon: Briefcase, trainerOnly: true },
  { label: "Clients", href: "/trainer/clients", icon: Users, trainerOnly: true },
  { label: "Messages", href: "/trainer/chat", icon: MessageSquare, trainerOnly: true },
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
