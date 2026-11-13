// Emergency / first-time account links from the command line (for whoever runs the server).
// Normally everything happens in the app: the Founder adds people (they get an invite email) and anyone
// with a verified email uses "Forgot password?". Use this when that isn't possible, e.g. the very first
// Founder, or email sending is down. The link is printed here and also emailed when possible.
//
//   npm run account:link -- <username>                                          reset (or invite) link
//   npm run account:link -- <username> --email <address>                        set / change their email
//   npm run account:link -- <username> --email <address> --create-founder "Full Name"
//
// Uses the database in DATABASE_URL and links pointing at APP_URL (default: the live site).
import { prisma } from "../src/lib/db";
import { createLink, isValidEmail, isValidUsername, normaliseEmail, toEmail, usernameOf } from "../src/lib/accounts";
import { mailConfigured, sendLinkEmail } from "../src/lib/mail";

const BASE = (process.env.APP_URL ?? "https://projexa-hub-central.vercel.app").replace(/\/$/, "");

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const username = process.argv[2]?.toLowerCase();
  const email = arg("--email") ? normaliseEmail(arg("--email")!) : undefined;
  const founderName = arg("--create-founder");
  if (!username || username.startsWith("--") || !isValidUsername(username)) {
    throw new Error('Usage: npm run account:link -- <username> [--email <address>] [--create-founder "Full Name"]');
  }
  if (email && !isValidEmail(email)) throw new Error(`"${email}" is not a valid email address.`);

  let user = await prisma.user.findUnique({ where: { email: toEmail(username) } });
  if (founderName !== undefined) {
    if (user) throw new Error(`${toEmail(username)} already exists. Run without --create-founder.`);
    if (!founderName || !email) throw new Error('Give a name and an email: --email <address> --create-founder "Full Name"');
    user = await prisma.user.create({ data: { email: toEmail(username), name: founderName, role: "FOUNDER", position: "Founder", contactEmail: email } });
    console.log(`Created Founder account ${user.email}.`);
  }
  if (!user) throw new Error(`No account ${toEmail(username)}.`);
  if (!user.active) user = await prisma.user.update({ where: { id: user.id }, data: { active: true } });

  if (email && email !== user.contactEmail) {
    const other = await prisma.user.findFirst({ where: { contactEmail: email, id: { not: user.id } } });
    if (other) throw new Error(`${email} is already used by ${other.email}.`);
  }

  const who = { name: user.name, username: usernameOf(user.email) };
  let kind: "INVITE" | "RESET" | "VERIFY_EMAIL";
  let to: string | null;
  if (!user.passwordHash) {
    // Not set up yet: (re)send the invite, to the new address if one was given.
    if (email) user = await prisma.user.update({ where: { id: user.id }, data: { contactEmail: email, emailVerifiedAt: null, pendingEmail: null } });
    if (!user.contactEmail) throw new Error("This account has no email. Add one with --email <address>.");
    kind = "INVITE";
    to = user.contactEmail;
  } else if (email && !(email === user.contactEmail && user.emailVerifiedAt)) {
    // Has a password: the new address must be confirmed by link.
    await prisma.user.update({ where: { id: user.id }, data: { pendingEmail: email } });
    kind = "VERIFY_EMAIL";
    to = email;
  } else {
    // Emergency password reset. Emailed only to a verified address; always printed here.
    kind = "RESET";
    to = user.contactEmail && user.emailVerifiedAt ? user.contactEmail : null;
  }

  const url = await createLink(user.id, kind, to ?? user.contactEmail ?? "(printed only)", BASE);
  const label = { INVITE: "Invite (set password + verify email)", RESET: "Password reset", VERIFY_EMAIL: "Confirm new email" }[kind];
  console.log(`\n${label} link for ${who.username}:\n${url}\n`);
  if (to) {
    try {
      await sendLinkEmail(kind, to, url, who);
      console.log(mailConfigured() ? `Also emailed to ${to}.` : `Email isn't configured here, so it was saved to the local outbox instead of sent.`);
    } catch (e) {
      console.log(`Could not email it (${e instanceof Error ? e.message : e}). Use the link above.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
