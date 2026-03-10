import { Resend } from "resend";
import { getEnvOptional } from "../config.js";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = getEnvOptional("RESEND_API_KEY");
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

const FROM_ADDRESS =
  getEnvOptional("EMAIL_FROM") ?? "Scriptify <noreply@scriptify.gg>";

const WEB_ORIGIN =
  getEnvOptional("WEB_ORIGIN") ?? "http://localhost:3000";

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      "RESEND_API_KEY is not set — password reset email was not sent."
    );
    return;
  }

  const resetUrl = `${WEB_ORIGIN}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Reset your Scriptify password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 16px">Reset your password</h2>
        <p style="font-size:14px;color:#555;margin:0 0 24px">
          Click the button below to reset your Scriptify password.
          This link expires in 1 hour.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#111;color:#fff;
                  border-radius:6px;font-size:14px;font-weight:600;text-decoration:none">
          Reset password
        </a>
        <p style="font-size:12px;color:#999;margin:24px 0 0">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
