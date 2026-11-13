// Sending email (invites, password resets, email verification) through Gmail SMTP with an App Password.
// Configure GMAIL_USER and GMAIL_APP_PASSWORD. Without them, outside production, emails are written to
// a local "outbox" folder instead of being sent, so the flows can be tested without a mail account.
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import nodemailer from "nodemailer";
import { TTL_LABEL, type TokenKind } from "./accounts";

export const OUTBOX_DIR = join(tmpdir(), "projexa-outbox");

export const mailConfigured = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

type Mail = { to: string; subject: string; text: string; html: string };

export async function sendMail(mail: Mail) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email sending isn't set up yet (GMAIL_USER / GMAIL_APP_PASSWORD).");
    }
    await mkdir(OUTBOX_DIR, { recursive: true });
    await writeFile(join(OUTBOX_DIR, `${Date.now()}-${mail.to.replace(/[^a-z0-9]/gi, "_")}.json`), JSON.stringify(mail, null, 2));
    console.log(`[mail] Not configured — saved "${mail.subject}" to ${mail.to} in ${OUTBOX_DIR}`);
    return;
  }
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transport.sendMail({ from: `"Projexa Hub Central" <${process.env.GMAIL_USER}>`, ...mail });
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function layout(heading: string, lines: string[], button: { label: string; url: string }, footer: string) {
  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;padding:32px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 24px;font-weight:bold;letter-spacing:2px;font-size:13px">PROJEXA HUB</p>
<h1 style="margin:0 0 16px;font-size:22px">${esc(heading)}</h1>
${lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${esc(l)}</p>`).join("")}
<p style="margin:24px 0"><a href="${esc(button.url)}" style="background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold;display:inline-block">${esc(button.label)}</a></p>
<p style="margin:0 0 12px;font-size:13px;color:#555;line-height:1.5">If the button doesn't work, copy this link into your browser:<br><span style="word-break:break-all">${esc(button.url)}</span></p>
<p style="margin:24px 0 0;font-size:12px;color:#777;line-height:1.5">${esc(footer)}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [heading, "", ...lines, "", `${button.label}: ${button.url}`, "", footer].join("\n");
  return { html, text };
}

const SUBJECT: Record<TokenKind, string> = {
  INVITE: "You've been added to Projexa Hub Central",
  RESET: "Reset your Projexa Hub Central password",
  VERIFY_EMAIL: "Confirm your email for Projexa Hub Central",
};

/** Email a single-use link of the given kind. */
export async function sendLinkEmail(kind: TokenKind, to: string, url: string, p: { name: string; username: string }) {
  const valid = `This link works once and expires in ${TTL_LABEL[kind]}.`;
  const content =
    kind === "INVITE"
      ? layout(
          `Welcome, ${p.name}`,
          [`You've been added to Projexa Hub Central, the internal platform for Projexa Hub.`, `Your username is: ${p.username}`, `Click below to confirm this email address and choose your password.`, valid],
          { label: "Set my password", url },
          "If you weren't expecting this, you can ignore this email.",
        )
      : kind === "RESET"
        ? layout(
            "Reset your password",
            [`Someone asked to reset the password for the Projexa Hub Central account "${p.username}".`, `Click below to choose a new password. You'll be signed out on other devices.`, valid],
            { label: "Choose a new password", url },
            "If you didn't ask for this, ignore this email — your password stays the same.",
          )
        : layout(
            "Confirm your email",
            [`Please confirm that this is the email address for the Projexa Hub Central account "${p.username}".`, `Until you confirm, your previous email stays in use.`, valid],
            { label: "Confirm this email", url },
            "If you didn't ask for this, ignore this email — nothing will change.",
          );
  await sendMail({ to, subject: SUBJECT[kind], ...content });
}
