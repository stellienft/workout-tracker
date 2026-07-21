"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Persist appearance preferences to the profile so they sync across devices.
 * Separate from updateSettings so it can fire on every tweak without a
 * full-layout revalidation. Theme maps to the existing theme_preference
 * column; accent maps to accent_color.
 */
export async function saveThemePreference(input: {
  theme?: "system" | "light" | "dark";
  accentColor?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  const parsed = z
    .object({
      theme: z.enum(["system", "light", "dark"]).optional(),
      accentColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const };

  const update: Record<string, unknown> = {};
  if (parsed.data.theme !== undefined) update.theme_preference = parsed.data.theme;
  if (parsed.data.accentColor !== undefined)
    update.accent_color = parsed.data.accentColor;
  if (Object.keys(update).length === 0) return { ok: true as const };

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  return { ok: !error } as const;
}
