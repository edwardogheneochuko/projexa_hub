// Issue a one-time setup code from the command line. For the cases the app can't cover:
// creating the very first Founder, or resetting the Founder's own forgotten password.
//
//   npm run account:code -- <username>                                 reset an existing account
//   npm run account:code -- <username> --create-founder "Full Name"    create a Founder account
//
// Runs against whichever database DATABASE_URL points to.
import { prisma } from "../src/lib/db";
import { EMAIL_DOMAIN, SETUP_CODE_DAYS, isValidUsername, issueSetupCode, toEmail } from "../src/lib/accounts";

async function main() {
  const [username, flag, fullName] = process.argv.slice(2);
  if (!username || !isValidUsername(username.toLowerCase())) {
    throw new Error('Usage: npm run account:code -- <username> [--create-founder "Full Name"]');
  }
  const email = toEmail(username);
  let user = await prisma.user.findUnique({ where: { email } });

  if (flag === "--create-founder") {
    if (user) throw new Error(`${email} already exists. Run without --create-founder to reset it.`);
    if (!fullName) throw new Error('Give the Founder\'s full name: --create-founder "Full Name"');
    user = await prisma.user.create({ data: { email, name: fullName, role: "FOUNDER", position: "Founder" } });
    console.log(`Created Founder account ${email}.`);
  } else if (!user) {
    throw new Error(`No account ${email}. To create a Founder, add --create-founder "Full Name".`);
  } else if (!user.active) {
    await prisma.user.update({ where: { id: user.id }, data: { active: true } });
    console.log(`Reactivated ${email}.`);
  }

  const code = await issueSetupCode(user.id);
  console.log(`\nUsername:   ${email.replace(`@${EMAIL_DOMAIN}`, "")}\nSetup code: ${code}  (one use, expires in ${SETUP_CODE_DAYS} days)\n`);
  console.log("On the sign-in page choose “First time here? / Reset password”, enter both and pick a password.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
