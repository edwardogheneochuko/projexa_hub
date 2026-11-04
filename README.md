# Projexa Hub Central

Internal organisational platform for Projexa Hub, built to the *Projexa Hub Central PRD*. It has two modules:

- **Projexa Hub Analytics**: attendance, the weekly KPI matrix, weekly performance reports, monthly evaluations and performance analysis. It covers every department, including the **Alumni** and **Campus Chapter** teams.
- **Projexa Hub HQ**: department workspaces for plans, records and documentation, plus the Team Directory.

Tech stack: Next.js 15 (App Router, server actions), TypeScript, Tailwind CSS 4, Prisma with PostgreSQL, Recharts.

---

## Quick start

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (a PostgreSQL database, for example a free [Neon](https://neon.tech) project) and `AUTH_SECRET`.
2. Run:

```bash
npm install
npm run setup        # creates the tables and loads demo data
npm run dev          # http://localhost:3000
```

Every demo account uses the password **`Password123!`**.

| Role | Email |
|---|---|
| Founder | `founder@projexahub.test` |
| Department Head (Marketing) | `adaeze.okafor@projexahub.test` |
| Team Member (Marketing) | `tobi.adeyemi@projexahub.test` |
| Finance Head (has Finance access) | `ngozi.umeh@projexahub.test` |
| Finance Member (no Finance access) | `ibrahim.musa@projexahub.test` |

`npm run db:seed` resets all data to the demo state. **Never run it against production.**

Other scripts: `npm run build`, `npm run typecheck`, `npm run lint`.

---

## Roles and permissions (PRD §8)

All permission rules live in `src/lib/permissions.ts` and `src/lib/hq.ts`.

| | Founder | Department Head | Team Member |
|---|---|---|---|
| Analytics dashboard | Organisation-wide, filter by team, individual and period | Own department | Personal |
| Record attendance, maintain KPIs | All teams | Own team | — |
| Weekly reports | View and review all | View and review own team | Submit and edit own until reviewed |
| Monthly evaluations | Write and view all | Write and view own team | View own |
| Team KPI matrix | All teams | Own team (edit) | Own team (read) |
| HQ workspaces | All | Own department | Own department (add and edit records, not delete) |
| Founder HQ | Yes | — | — |
| Finance records, HR records | Yes | Only with an explicit grant | Only with an explicit grant |
| Settings and permissions | Yes | — | — |

Confidential access is granted per person in **Settings & permissions**. Belonging to the Finance department does **not** grant Finance access on its own (PRD §8, Confidentiality).

## How figures are calculated

These are plain statistics. No combined or weighted score is generated, because PRD §5.9 requires approval for any such formula. The definitions are shown in the app under "How these figures are calculated".

- **Attendance rate** = (Present + Late) ÷ (all records − Excused).
- **KPI achievement** = Actual ÷ Target. Averages cap each KPI at 100%, so over-achievement on one KPI can't hide another that is below target.
- **KPI status**: Pending (no result yet), Achieved (≥ 100%), On track (≥ 80%), Below benchmark (< 80%).
- **Reporting rate** = reports submitted ÷ (active team members × weeks).
- Weekly periods are ISO weeks (Monday to Sunday), for example `2026-W45`.

The current week is included in trends, so its reporting figure is low until the week ends.

**Please confirm these definitions with Projexa Hub.** In particular, confirm whether "Late" should count as attended and whether achievement should be capped at 100%. Each definition is a one-line change in `src/lib/metrics.ts` or `src/lib/kpi.ts`.

## HQ workspaces

Departments and their sections are defined in code in `src/lib/hq-config.ts`. These are fixed, department-specific table structures, not a user-editable database builder (PRD §14). Each section declares:

- its fields (text, long text, date, select, link, number, money, email, phone)
- which field drives the status badge and filter
- an optional calendar date field, which enables Calendar view
- an optional numeric total
- whether it is confidential (`finance` or `hr`)

**To add or change a section**, edit `hq-config.ts`. No database migration is needed, because records are stored as validated JSON in the `HqRecord` table.

**Documents are stored as links** (Google Docs, Sheets, Drive and similar), never as uploads. Profile pictures are also links.

## Project structure

```
prisma/schema.prisma        Data model
prisma/seed.ts              Demo data
src/lib/                    Auth, permissions, periods, metrics, HQ config and validation
src/components/             UI primitives, charts, dashboards, HQ form, table and calendar
src/app/login               Sign-in
src/app/(app)/analytics     Dashboards, teams, people, attendance, KPIs, reports, evaluations, insights
src/app/(app)/hq            HQ home, spaces, sections, records
src/app/(app)/directory     Team Directory and organisational chart
src/app/(app)/profile       Own profile and password
src/app/(app)/settings      Users, roles, confidential access, teams (Founder only)
```

Every page and server action re-checks permissions on the server. The middleware only redirects signed-out visitors to `/login`.

## Deployment

1. Provision PostgreSQL (for example Neon, Supabase or Railway; the free tiers are enough to start). Use a separate database (or Neon branch) for production, not the one you develop against.
2. Push the code to GitHub and import the repository in Vercel. The default Next.js settings work; `postinstall` runs `prisma generate`.
3. In Vercel → Settings → Environment Variables, set:
   - `DATABASE_URL`: the production Postgres connection string
   - `AUTH_SECRET`: a new long random string (not the one from your local `.env`)
4. Create the tables once, from your machine, against the production database: `DATABASE_URL="<production url>" npx prisma db push`
5. Redeploy in Vercel so it picks up the variables.
6. Create the real Founder account. Either run a one-off script based on `prisma/seed.ts` (founder only, real email, strong password), or seed the demo data, sign in as the demo founder, create the real accounts and then deactivate the demo accounts.

There is no file storage, so there are no storage costs, and there are no per-user licence costs.

## Out of scope by design (PRD §4.2)

The following are deliberately not built:

- task assignment
- project boards or Gantt charts
- file uploads
- chat
- payroll or accounting
- GPS or biometric attendance
- AI scoring
- native mobile apps

KPIs measure performance and are never used to assign tasks.

## Known limitations and next steps

- Passwords are set by the Founder. There is no self-service password reset by email yet.
- Exports are via "Print / save as PDF" on the Performance reports page. CSV export could be added.
- Expected reports are based on current team membership, so they are not adjusted for people who joined or left part-way through a period.
