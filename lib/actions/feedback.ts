"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  category: z.enum(["feedback", "feature", "bug", "other"]).default("feedback"),
  message: z.string().trim().min(4, "Please add a little more detail.").max(4000),
  email: z.string().email().max(200).optional().or(z.literal("")),
});

/** Submit a piece of app feedback / a feature request / a bug report. */
export async function submitFeedback(input: {
  category: string;
  message: string;
  email?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Please sign in first." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error } = await supabase.from("app_feedback").insert({
    user_id: user.id,
    category: parsed.data.category,
    message: parsed.data.message,
    email: parsed.data.email || user.email || null,
  });
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const };
}
