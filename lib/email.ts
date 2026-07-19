import "server-only";

/**
 * Transactional email via Resend (https://resend.com).
 *
 * Configured entirely through environment variables so no secrets live in the
 * repo. If RESEND_API_KEY is absent the helper no-ops (returns skipped:true)
 * instead of throwing, so a missing key can never break a user-facing flow.
 *
 *   RESEND_API_KEY   required to actually send
 *   EMAIL_FROM       sender, default "Stellio Fit <onboarding@resend.dev>"
 *                    (works to the Resend account owner immediately; switch to
 *                    an address on your verified domain, e.g. noreply@stellio.fit)
 *   ADMIN_EMAIL      admin recipient, default hello@stellio.com.au
 */

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@stellio.com.au";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Stellio Fit <onboarding@resend.dev>";

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping send:", input.subject);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email] send failed", res.status, body);
      return { ok: false, error: `${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send threw", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/** Notify the admin that a new member has completed onboarding. */
export async function notifyAdminNewMember(member: {
  email: string;
  name?: string | null;
  goal?: string | null;
  experience?: string | null;
  weeklyFrequency?: number | null;
}) {
  const name = member.name?.trim() || "New member";
  const when = new Date().toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const rows: [string, string][] = [
    ["Name", name],
    ["Email", member.email],
    ["Goal", member.goal ?? "—"],
    ["Experience", member.experience ?? "—"],
    ["Days/week", member.weeklyFrequency ? String(member.weeklyFrequency) : "—"],
    ["Joined", `${when} (Sydney)`],
  ];

  const html = `<!doctype html><html><body style="margin:0;background:#0D0D0D;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#fff;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#1A1A1A;border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden">
    <div style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.08)">
      <span style="font-size:18px;font-weight:800">Stellio <span style="color:#CCFF30">Fit</span></span>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 4px;color:#CCFF30;font-size:12px;letter-spacing:.06em;text-transform:uppercase">New member</p>
      <h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(name)} just joined 🎉</h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:8px 0;color:#A9A9A9;width:120px">${k}</td><td style="padding:8px 0;color:#fff">${escapeHtml(
                v
              )}</td></tr>`
          )
          .join("")}
      </table>
    </div>
  </div>
  <p style="max-width:520px;margin:12px auto 0;color:#737373;font-size:12px;text-align:center">Automated notification from Stellio Fit.</p>
  </body></html>`;

  const text = `New member joined Stellio Fit\n\n${rows
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}`;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Stellio Fit member: ${name}`,
    html,
    text,
    replyTo: member.email,
  });
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}
