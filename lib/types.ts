// Shared domain types mirroring the Supabase schema (hand-maintained).

export type RoleKey = "user" | "admin" | "super_admin" | "trainer";

export type SchedulingMode = "sequential" | "weekly_split" | "calendar";

export type ContentStatus = "draft" | "review" | "published" | "archived";

export type EnrolmentStatus =
  | "pending"
  | "active"
  | "paused"
  | "completed"
  | "abandoned";

export type SessionStatus = "in_progress" | "completed" | "abandoned";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  age: number | null;
  training_history:
    | "never"
    | "lt_6m"
    | "6_12m"
    | "1_3y"
    | "3y_plus"
    | "returning"
    | null;
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  weekly_frequency: number | null;
  session_minutes: number | null;
  equipment: string[];
  training_days: string[];
  considerations: string | null;
  medication_tracking_enabled: boolean;
  haptics_enabled: boolean;
  unit_preference: "metric" | "imperial";
  timezone: string;
  account_type: "user" | "trainer";
  theme_preference: "light" | "dark" | "system";
  accent_color: string;
}

export interface FitnessGoal {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  long_description: string | null;
  cover_image_path: string | null;
  recommended_experience_levels: string[];
  recommended_frequency_min: number | null;
  recommended_frequency_max: number | null;
  typical_session_minutes: number | null;
  display_order: number;
  active: boolean;
}

export interface Program {
  id: string;
  fitness_goal_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  cover_image_path: string | null;
  experience_level: string;
  scheduling_mode: SchedulingMode;
  duration_weeks: number;
  minimum_days_per_week: number;
  maximum_days_per_week: number;
  estimated_session_minutes: number;
  equipment_requirements: string[];
  difficulty: string;
  status: ContentStatus;
  featured: boolean;
  safety_notes: string | null;
  version: number;
}

export interface ProgramWeek {
  id: string;
  program_id: string;
  week_number: number;
  name: string | null;
  focus: string | null;
  is_deload: boolean;
  notes: string | null;
}

export interface WorkoutTemplate {
  id: string;
  program_id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  cover_image_path: string | null;
  sequence_order: number | null;
  week_position: number | null;
  day_of_week: number | null;
  estimated_minutes: number;
  difficulty: string;
  target_muscle_groups: string[];
  is_optional: boolean;
  workout_type: string;
}

export interface WorkoutTemplateExercise {
  id: string;
  workout_template_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  rep_min: number | null;
  rep_max: number | null;
  rep_target: string | null;
  rest_seconds: number;
  tempo: string | null;
  notes: string | null;
  is_optional: boolean;
  superset_group: number | null;
  exercise?: Exercise;
}

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  category: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  difficulty: string;
  instructions: string | null;
  technique_cues: string[];
  shoulder_safe: boolean;
  shoulder_notes: string | null;
  cover_image_path: string | null;
  status: ContentStatus;
}

export interface ExerciseVideo {
  id: string;
  exercise_id: string;
  provider: string;
  source_url: string;
  provider_video_id: string | null;
  embed_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  creator_name: string | null;
  duration_seconds: number | null;
  verification_status: "unverified" | "verified" | "broken" | "placeholder";
  last_verified_at: string | null;
  admin_notes: string | null;
  active: boolean;
}

export interface ProgramEnrolment {
  id: string;
  user_id: string;
  program_id: string;
  program_version: number;
  enrolled_at: string;
  start_date: string;
  current_week: number;
  next_workout_sequence: number;
  selected_days_per_week: number;
  status: EnrolmentStatus;
  paused_at: string | null;
  completed_at: string | null;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  enrolment_id: string | null;
  program_id: string | null;
  workout_template_id: string | null;
  week_number: number | null;
  status: SessionStatus;
  started_at: string;
  completed_at: string | null;
  total_seconds: number | null;
  pre_shoulder_pain: number | null;
  discomfort_reported: boolean;
  notes: string | null;
}

export interface SetLog {
  id: string;
  session_id: string;
  user_id: string;
  exercise_id: string;
  template_exercise_id: string | null;
  substituted_from_exercise_id: string | null;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
  completed: boolean;
  pain_level: number | null;
  notes: string | null;
  created_at: string;
}
