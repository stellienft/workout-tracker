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

/** Notify the admin that a member left feedback / a feature request / a bug. */
export async function notifyAdminNewFeedback(input: {
  category: string;
  message: string;
  fromEmail?: string | null;
  fromName?: string | null;
}) {
  const labels: Record<string, string> = {
    feedback: "General feedback",
    feature: "Feature request",
    bug: "Bug report",
    other: "Feedback",
  };
  const label = labels[input.category] ?? "Feedback";
  const who = input.fromName?.trim() || input.fromEmail || "A member";
  const when = new Date().toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const html = `<!doctype html><html><body style="margin:0;background:#0D0D0D;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#fff;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#1A1A1A;border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden">
    <div style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.08)">
      <span style="font-size:18px;font-weight:800">Stellio <span style="color:#CCFF30">Fit</span></span>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 4px;color:#CCFF30;font-size:12px;letter-spacing:.06em;text-transform:uppercase">${escapeHtml(label)}</p>
      <h1 style="margin:0 0 16px;font-size:20px">New ${escapeHtml(label.toLowerCase())}</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;white-space:pre-wrap;background:#222;border-radius:12px;padding:14px">${escapeHtml(
        input.message
      )}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#A9A9A9;width:90px">From</td><td style="padding:6px 0;color:#fff">${escapeHtml(
          who
        )}</td></tr>
        ${
          input.fromEmail
            ? `<tr><td style="padding:6px 0;color:#A9A9A9">Email</td><td style="padding:6px 0;color:#fff">${escapeHtml(
                input.fromEmail
              )}</td></tr>`
            : ""
        }
        <tr><td style="padding:6px 0;color:#A9A9A9">When</td><td style="padding:6px 0;color:#fff">${escapeHtml(
          when
        )} (Sydney)</td></tr>
      </table>
    </div>
  </div>
  <p style="max-width:520px;margin:12px auto 0;color:#737373;font-size:12px;text-align:center">Automated notification from Stellio Fit. Reply to respond to the member.</p>
  </body></html>`;

  const text = `${label}\n\n${input.message}\n\nFrom: ${who}${
    input.fromEmail ? ` (${input.fromEmail})` : ""
  }\nWhen: ${when} (Sydney)`;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `Stellio Fit ${label.toLowerCase()} from ${who}`,
    html,
    text,
    replyTo: input.fromEmail || undefined,
  });
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}
