// Demo data for local development and walkthroughs. All people are fictional.
// Run: npm run db:seed   (wipes existing data first)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, recentMonths, recentWeeks, toDateStr, weekStart } from "../src/lib/periods";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Password123!";

// Deterministic pseudo-random so the demo looks the same every time.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

const TEAMS = [
  { slug: "marketing", name: "Marketing", description: "Social media, creative, brand, content, strategy and product roadmap." },
  { slug: "sales-growth", name: "Sales & Growth", description: "Sales pipeline, partnerships and growth." },
  { slug: "finance", name: "Finance", description: "Income, expenses, budgets and financial reporting." },
  { slug: "community", name: "Community", description: "Community engagement, events and member experience." },
  { slug: "alumni", name: "Alumni", description: "Internal team responsible for the Alumni function." },
  { slug: "campus-chapter", name: "Campus Chapter", description: "Internal team responsible for the Campus Chapter function." },
  { slug: "technology", name: "Technology", description: "Systems, technical documentation and product engineering." },
];

const PEOPLE: Record<string, [string, string][]> = {
  marketing: [["Adaeze Okafor", "Head of Marketing"], ["Tobi Adeyemi", "Social Media Lead"], ["Kemi Balogun", "Content Writer"], ["Ifeanyi Eze", "Graphic Designer"]],
  "sales-growth": [["Chinedu Nwosu", "Head of Sales & Growth"], ["Halima Bello", "Partnerships Officer"], ["Seun Ogunleye", "Sales Associate"]],
  finance: [["Ngozi Umeh", "Head of Finance"], ["Ibrahim Musa", "Finance Officer"]],
  community: [["Funmi Alade", "Head of Community"], ["Uche Obi", "Community Manager"], ["Zainab Lawal", "Events Coordinator"]],
  alumni: [["Emeka Okonkwo", "Head of Alumni Relations"], ["Bisi Ajayi", "Alumni Engagement Officer"], ["Yusuf Danjuma", "Alumni Programmes Assistant"]],
  "campus-chapter": [["Amaka Chukwu", "Head of Campus Chapters"], ["Tunde Bakare", "Chapter Development Officer"], ["Rukayat Sani", "Campus Programmes Officer"]],
  technology: [["Olumide Fashola", "Head of Technology"], ["Chiamaka Obi", "Software Developer"]],
};

const KPIS: Record<string, [string, string, number, string][]> = {
  marketing: [["Social media posts published", "Posts across all platforms", 15, "posts"], ["New followers", "Net follower growth", 200, "followers"], ["Newsletter open rate", "Average open rate", 40, "%"]],
  "sales-growth": [["New qualified leads", "Leads that meet criteria", 10, "leads"], ["Partnership meetings held", "Meetings with prospective partners", 4, "meetings"], ["Revenue closed", "Value of deals won", 500000, "₦"]],
  finance: [["Expenses reconciled", "Share of expenses with receipts", 100, "%"], ["Invoices issued on time", "Invoices sent by due date", 5, "invoices"]],
  community: [["Active community members", "Members engaging weekly", 150, "members"], ["Engagement activities run", "Activities held", 3, "activities"], ["Feedback responses collected", "Survey or direct feedback", 20, "responses"]],
  alumni: [["Alumni reached", "Alumni contacted this week", 50, "alumni"], ["Alumni engagements held", "Events, calls or sessions", 2, "engagements"], ["Opportunities shared", "Jobs, scholarships, resources", 5, "opportunities"]],
  "campus-chapter": [["Chapter meetings supported", "Meetings attended or supported", 4, "meetings"], ["New student sign-ups", "Across all chapters", 40, "students"], ["Chapter activities held", "Activities across chapters", 3, "activities"]],
  technology: [["Bugs resolved", "Bugs closed this week", 5, "bugs"], ["Documentation pages updated", "Docs created or updated", 3, "pages"]],
};

// Each team has a "performance level" so the demo shows variation around the 80% benchmark.
const LEVEL: Record<string, number> = { marketing: 0.9, "sales-growth": 0.72, finance: 0.95, community: 0.85, alumni: 0.78, "campus-chapter": 0.88, technology: 0.82 };

async function main() {
  console.log("Clearing existing data…");
  await prisma.hqRecord.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.weeklyReport.deleteMany();
  await prisma.kpi.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const teams = await Promise.all(TEAMS.map((t, i) => prisma.team.create({ data: { ...t, sortOrder: i + 1 } })));
  const teamBySlug = Object.fromEntries(teams.map((t) => [t.slug, t]));

  const founder = await prisma.user.create({
    data: {
      name: "Demo Founder", email: "founder@projexahub.test", passwordHash: hash, role: "FOUNDER", position: "Founder",
      bio: "Leads Projexa Hub's vision and strategy.", canViewFinance: true, canViewHR: true,
    },
  });

  const members: { id: string; teamId: string; slug: string; role: string }[] = [];
  for (const [slug, list] of Object.entries(PEOPLE)) {
    for (const [i, [name, position]] of list.entries()) {
      const role = i === 0 ? "HEAD" : "MEMBER";
      const email = `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@projexahub.test`;
      const u = await prisma.user.create({
        data: {
          name, email, passwordHash: hash, role, position, teamId: teamBySlug[slug].id,
          bio: `${position} at Projexa Hub.`,
          professional: pick(["B.Sc. Mass Communication", "B.Sc. Computer Science", "B.A. English", "B.Sc. Economics", "HND Business Administration"]),
          phone: `+234 80${Math.floor(10000000 + rand() * 89999999)}`,
          canViewFinance: slug === "finance" && role === "HEAD",
        },
      });
      members.push({ id: u.id, teamId: u.teamId!, slug, role });
    }
  }

  const weeks = recentWeeks(10);
  console.log(`Creating attendance, KPIs and reports for ${weeks.length} weeks…`);
  for (const [wi, week] of weeks.entries()) {
    const isCurrent = wi === weeks.length - 1;
    const monday = weekStart(week);
    for (const team of teams) {
      const level = LEVEL[team.slug];
      const head = members.find((m) => m.teamId === team.id && m.role === "HEAD")!;
      const teamMembers = members.filter((m) => m.teamId === team.id);

      // Weekly team meeting on Tuesday (skip for the current week if it hasn't happened yet).
      const meetingDate = addDays(monday, 1);
      if (meetingDate <= new Date()) {
        for (const m of teamMembers) {
          const r = rand();
          const status = r < level ? "PRESENT" : r < level + 0.07 ? "LATE" : r < level + 0.12 ? "EXCUSED" : "ABSENT";
          await prisma.attendance.create({
            data: {
              userId: m.id, teamId: team.id, date: toDateStr(meetingDate), session: "Weekly team meeting", status,
              remarks: status === "EXCUSED" ? "Notified in advance" : "", recordedById: head.id,
            },
          });
        }
      }
      // Monthly all-hands on the first week of each month.
      if (wi % 4 === 0) {
        const d = addDays(monday, 4);
        if (d <= new Date()) {
          for (const m of teamMembers) {
            await prisma.attendance.create({
              data: { userId: m.id, teamId: team.id, date: toDateStr(d), session: "Monthly all-hands", status: rand() < level + 0.05 ? "PRESENT" : "ABSENT", recordedById: founder.id },
            });
          }
        }
      }

      for (const [name, description, target, unit] of KPIS[team.slug]) {
        const ratio = Math.max(0.3, level + (rand() - 0.5) * 0.4);
        const actual = isCurrent && rand() < 0.6 ? null : Math.round(target * ratio * (unit === "₦" ? 1 : 1));
        await prisma.kpi.create({ data: { teamId: team.id, period: week, name, description, target, unit, actual, updatedById: head.id } });
      }

      for (const m of teamMembers) {
        if (rand() > level + 0.08 || (isCurrent && rand() < 0.5)) continue;
        await prisma.weeklyReport.create({
          data: {
            userId: m.id, teamId: team.id, period: week,
            kpiResults: `Contributed to ${KPIS[team.slug][0][0].toLowerCase()}.`,
            contributions: pick([
              "Prepared and shared the weekly update with the team.",
              "Completed planned activities and supported team colleagues.",
              "Followed up with stakeholders and documented outcomes.",
              "Drafted materials and coordinated with other departments.",
            ]),
            challenges: pick(["", "Limited time due to competing priorities.", "Delayed feedback from external partners.", ""]),
            links: rand() < 0.4 ? "https://docs.google.com/document/d/example" : "",
            status: wi < weeks.length - 2 ? "REVIEWED" : "SUBMITTED",
            reviewedById: wi < weeks.length - 2 && m.role !== "HEAD" ? head.id : wi < weeks.length - 2 ? founder.id : null,
            reviewedAt: wi < weeks.length - 2 ? addDays(monday, 8) : null,
          },
        });
      }
    }
  }

  console.log("Creating monthly evaluations…");
  const [, lastMonth, prevMonth] = recentMonths(3);
  for (const month of [prevMonth, lastMonth]) {
    for (const m of members) {
      const evaluator = m.role === "HEAD" ? founder.id : members.find((x) => x.teamId === m.teamId && x.role === "HEAD")!.id;
      await prisma.evaluation.create({
        data: {
          userId: m.id, teamId: m.teamId, month, evaluatorId: evaluator,
          attendance: pick(["Consistent attendance at team meetings.", "Missed one meeting without notice.", "Attended all sessions."]),
          kpi: pick(["Contributed well to team KPIs.", "KPI contribution below expectation this month.", "Strong contribution to the team's main KPI."]),
          reporting: pick(["Submitted every weekly report on time.", "One weekly report missing.", "Reports were detailed and timely."]),
          contributions: "Supported departmental activities and collaborated across teams.",
          strengths: pick(["Reliable and proactive.", "Clear communicator.", "Creative and detail-oriented.", "Good at building relationships."]),
          improvements: pick(["Share updates earlier in the week.", "Document work more consistently.", "Take more ownership of follow-ups."]),
          remarks: "Keep up the good work.",
        },
      });
    }
  }

  console.log("Creating sample HQ records…");
  const today = new Date();
  const d = (offset: number) => toDateStr(addDays(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())), offset));
  const hq = (space: string, section: string, data: Record<string, string>, by = founder.id) =>
    prisma.hqRecord.create({ data: { space, section, data: JSON.stringify(data), updatedById: by } });
  const head = (slug: string) => members.find((m) => m.slug === slug && m.role === "HEAD")!.id;

  await hq("founder", "overview", { title: "Mission", category: "Mission", content: "To connect ideas, people and projects that create lasting impact." });
  await hq("founder", "overview", { title: "Core values", category: "Values", content: "Integrity, collaboration, excellence and service." });
  await hq("founder", "goals", { title: "Grow active community to 2,000 members", horizon: "Annual", period: String(today.getFullYear()), status: "In progress" });
  await hq("founder", "goals", { title: "Launch 5 new campus chapters", horizon: "Annual", period: String(today.getFullYear()), status: "In progress" });
  await hq("founder", "quarterly", { title: "Q4 operating plan", period: `Q4 ${today.getFullYear()}`, status: "Active", startDate: d(-30), summary: "Focus on partnerships, alumni engagement and chapter growth.", link: "https://docs.google.com/document/d/example" });
  await hq("founder", "monthly", { title: "Monthly all-hands", period: "This month", status: "Active", startDate: d(5), link: "https://docs.google.com/document/d/example" });
  await hq("founder", "records", { title: "Business name registration", category: "Registration", reference: "BN 9573446", link: "https://drive.google.com/drive/folders/example" });
  await hq("founder", "hr", { title: "Onboarding checklist", category: "Onboarding", link: "https://docs.google.com/document/d/example" });

  await hq("marketing", "social-media", { title: "Weekly tips carousel", category: "Content calendar entry", platform: "Instagram", date: d(2), status: "Scheduled" }, head("marketing"));
  await hq("marketing", "social-media", { title: "Partner spotlight", category: "Content calendar entry", platform: "LinkedIn", date: d(6), status: "Planned" }, head("marketing"));
  await hq("marketing", "social-media", { title: "Q4 social media plan", category: "Social media plan", date: d(-20), status: "Published", link: "https://docs.google.com/document/d/example" }, head("marketing"));
  await hq("marketing", "brand", { title: "Brand guidelines v2", category: "Brand guideline", version: "2.0", link: "https://drive.google.com/file/d/example" }, head("marketing"));
  await hq("marketing", "product-roadmap", { title: "Member portal", category: "Product plan", priority: "High", quarter: `Q1 ${today.getFullYear() + 1}`, status: "Planned" }, head("marketing"));

  await hq("sales-growth", "pipeline", { title: "Corporate training package", organisation: "Acme Learning Ltd", stage: "Proposal", value: "1500000", expectedClose: d(21) }, head("sales-growth"));
  await hq("sales-growth", "pipeline", { title: "Event sponsorship", organisation: "Bright Futures Foundation", stage: "Negotiation", value: "800000", expectedClose: d(10) }, head("sales-growth"));
  await hq("sales-growth", "follow-ups", { title: "Mrs. Ade (Acme)", organisation: "Acme Learning Ltd", date: d(-3), channel: "Call", outcome: "Requested revised pricing.", nextDate: d(4), status: "Open" }, head("sales-growth"));

  await hq("finance", "income", { date: d(-12), title: "Workshop fees", category: "Programme fees", amount: "350000" }, head("finance"));
  await hq("finance", "income", { date: d(-5), title: "Sponsorship — Bright Futures", category: "Sponsorship", amount: "500000" }, head("finance"));
  await hq("finance", "expenses", { date: d(-8), title: "Venue hire", category: "Events", paidTo: "City Hall Abuja", amount: "200000" }, head("finance"));
  await hq("finance", "expenses", { date: d(-2), title: "Website hosting (annual)", category: "Technology", paidTo: "Hosting provider", amount: "60000" }, head("finance"));
  await hq("finance", "payments", { title: "Acme Learning Ltd", type: "Receivable", amount: "750000", dueDate: d(14), status: "Pending" }, head("finance"));

  await hq("community", "events", { title: "Community meetup", date: d(9), venue: "Projexa Hub, Abuja", format: "Hybrid", status: "Upcoming" }, head("community"));
  await hq("community", "guidelines", { title: "Community code of conduct", version: "1.1", link: "https://docs.google.com/document/d/example" }, head("community"));
  await hq("community", "feedback", { title: "Aisha M.", type: "Testimonial", date: d(-15), message: "The mentorship sessions helped me land my first internship.", publish: "Yes" }, head("community"));

  await hq("alumni", "activities", { title: "Alumni career webinar", date: d(-6), type: "Webinar", participants: "64", summary: "Panel on transitioning into tech careers." }, head("alumni"));
  await hq("alumni", "activities", { title: "Alumni reunion planning call", date: d(12), type: "Reunion", participants: "12" }, head("alumni"));
  await hq("alumni", "engagement-plans", { title: "Alumni mentorship programme", period: `Q4 ${today.getFullYear()}`, status: "Active", startDate: d(-25) }, head("alumni"));
  await hq("alumni", "opportunities", { title: "Graduate trainee programme", type: "Job", provider: "Example Bank", deadline: d(18), link: "https://example.com/careers" }, head("alumni"));

  await hq("campus", "chapters", { title: "University of Abuja Chapter", institution: "University of Abuja", location: "Abuja", status: "Active", lead: "Student lead" }, head("campus-chapter"));
  await hq("campus", "chapters", { title: "Baze University Chapter", institution: "Baze University", location: "Abuja", status: "Prospective" }, head("campus-chapter"));
  await hq("campus", "activities", { title: "Ideas pitch night", chapter: "University of Abuja Chapter", date: d(-4), participants: "85", summary: "Students pitched project ideas to mentors." }, head("campus-chapter"));
  await hq("campus", "development", { title: "Chapter launch", chapter: "Baze University Chapter", date: d(20), stage: "Onboarding" }, head("campus-chapter"));

  await hq("technology", "decisions", { title: "Use Next.js for Projexa Hub Central", date: d(-40), status: "Accepted", context: "Need a maintainable, responsive internal web app.", outcome: "Next.js + PostgreSQL; documents stored as external links." }, head("technology"));
  await hq("technology", "issues", { title: "Mobile menu overlaps header on small screens", type: "Bug", severity: "Low", reported: d(-3), status: "Open" }, head("technology"));

  console.log(`\nDone. Sign in with any demo account using password: ${DEMO_PASSWORD}`);
  console.log("  Founder:          founder@projexahub.test");
  console.log("  Department Head:  adaeze.okafor@projexahub.test  (Marketing)");
  console.log("  Team Member:      tobi.adeyemi@projexahub.test   (Marketing)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
