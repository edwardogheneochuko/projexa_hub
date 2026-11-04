// Projexa Hub HQ — fixed, department-specific table structures (PRD §6, §14).
// This is intentionally NOT a user-editable database builder: developers add or change
// sections here. Records store external links only — no file uploads.
import type { Confidential } from "./permissions";

export type FieldType = "text" | "longtext" | "date" | "select" | "link" | "number" | "money" | "email" | "phone";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  /** Show as a table column (first field is always shown). */
  column?: boolean;
  hint?: string;
};

export type Section = {
  key: string;
  title: string;
  description: string;
  fields: Field[];
  /** Field used for the status badge and the status filter. */
  statusField?: string;
  /** Extra select field offered as a filter (e.g. category, type). */
  filterField?: string;
  /** Date field that enables the calendar view. */
  calendarField?: string;
  /** Numeric field totalled under the table. */
  sumField?: string;
  confidential?: Confidential;
};

export type Space = {
  key: string;
  title: string;
  description: string;
  /** Members of this team can use the space. `null` = Founder HQ. */
  teamSlug: string | null;
  sections: Section[];
};

// ---- small builders for repeated field shapes ----
const title = (label = "Title"): Field => ({ key: "title", label, type: "text", required: true, column: true });
const notes = (label = "Notes"): Field => ({ key: "notes", label, type: "longtext" });
const link = (label = "External link", column = true): Field => ({
  key: "link",
  label,
  type: "link",
  column,
  hint: "Google Docs, Sheets, Drive or another approved resource. Files are not uploaded.",
});
const date = (key = "date", label = "Date", column = true): Field => ({ key, label, type: "date", column });
const select = (key: string, label: string, options: string[], column = true, required = false): Field => ({
  key, label, type: "select", options, column, required,
});
const period = (): Field => ({ key: "period", label: "Period", type: "text", column: true, hint: "e.g. 2026, Q4 2026, November 2026" });
const summary = (): Field => ({ key: "summary", label: "Summary", type: "longtext" });

const PLAN_STATUS = ["Draft", "Active", "Completed", "Archived"];

const plansSection = (key: string, titleText: string, description: string, extra: Field[] = []): Section => ({
  key, title: titleText, description,
  fields: [title(), ...extra, period(), select("status", "Status", PLAN_STATUS), date("startDate", "Start date", false), date("endDate", "End date", false), summary(), link()],
  statusField: "status",
  calendarField: "startDate",
});

const reportsSection = (key = "reports", titleText = "Reports", description = "Periodic reports with links to the full documents."): Section => ({
  key, title: titleText, description,
  fields: [title(), period(), date("date", "Report date"), summary(), link()],
});

const docsSection = (key: string, titleText: string, description: string, categories: string[]): Section => ({
  key, title: titleText, description,
  fields: [title(), select("category", "Category", categories), link(), notes()],
  filterField: "category",
});

export const SPACES: Space[] = [
  {
    key: "founder",
    title: "Founder HQ",
    description: "Organisational overview, goals, planning, records and leadership resources.",
    teamSlug: null,
    sections: [
      {
        key: "overview", title: "Organisational overview", description: "Mission, vision, values and structure.",
        fields: [title(), select("category", "Category", ["Mission", "Vision", "Values", "Structure", "History", "Other"]), { key: "content", label: "Content", type: "longtext" }, link()],
        filterField: "category",
      },
      {
        key: "goals", title: "Organisational goals", description: "What the organisation is working towards.",
        fields: [title("Goal"), select("horizon", "Horizon", ["Annual", "Quarterly", "Monthly"]), period(), select("status", "Status", ["Not started", "In progress", "Achieved", "Deferred"]), { key: "measure", label: "How success is measured", type: "longtext" }, link("Supporting link", false)],
        statusField: "status", filterField: "horizon",
      },
      plansSection("annual", "Annual planning", "Year-level plans and priorities."),
      plansSection("quarterly", "Quarterly planning", "Quarter-level plans."),
      plansSection("monthly", "Monthly planning", "Month-level plans and scheduled organisational activities."),
      {
        key: "records", title: "Organisational records", description: "Registration, legal, governance and meeting records.",
        fields: [title(), select("category", "Category", ["Registration", "Legal", "Governance", "Policy", "Meeting minutes", "Other"]), date(), { key: "reference", label: "Reference", type: "text", column: true }, link(), notes()],
        filterField: "category",
      },
      {
        key: "hr", title: "HR & onboarding", description: "Confidential HR and onboarding documentation.", confidential: "hr",
        fields: [title(), select("category", "Category", ["Onboarding", "Policy", "Contract", "Personnel record", "Offboarding", "Other"]), { key: "person", label: "Person (if applicable)", type: "text", column: true }, date(), link(), notes()],
        filterField: "category",
      },
      docsSection("leadership", "Leadership resources", "Resources for the leadership team.", ["Guide", "Template", "Training", "Reference", "Other"]),
    ],
  },
  {
    key: "marketing",
    title: "Marketing",
    description: "Social media, creative, brand, content, strategy and product roadmap.",
    teamSlug: "marketing",
    sections: [
      {
        key: "social-media", title: "Social media", description: "Plans, content calendar, platform records, performance links and campaigns.",
        fields: [title(), select("category", "Type", ["Social media plan", "Content calendar entry", "Platform record", "Performance link", "Campaign record"], true, true), select("platform", "Platform", ["Instagram", "X (Twitter)", "LinkedIn", "Facebook", "TikTok", "YouTube", "WhatsApp", "Other"]), date("date", "Date"), select("status", "Status", ["Planned", "Scheduled", "Published", "Completed", "Archived"]), link(), notes()],
        statusField: "status", filterField: "category", calendarField: "date",
      },
      {
        key: "creative", title: "Creative", description: "Creative plans, design records, campaign documentation and design-resource links.",
        fields: [title(), select("category", "Type", ["Creative plan", "Design record", "Campaign documentation", "Design-resource link"], true, true), date(), select("status", "Status", ["Planned", "In progress", "Final", "Archived"]), link(), notes()],
        statusField: "status", filterField: "category", calendarField: "date",
      },
      {
        key: "brand", title: "Brand design", description: "Brand guidelines, assets, design standards and documentation.",
        fields: [title(), select("category", "Type", ["Brand guideline", "Brand asset / resource link", "Design standard", "Brand documentation"], true, true), { key: "version", label: "Version", type: "text", column: true }, link(), notes()],
        filterField: "category",
      },
      {
        key: "content", title: "Content & copywriting", description: "Content plans, copywriting records, content calendar and resource links.",
        fields: [title(), select("category", "Type", ["Content plan", "Copywriting record", "Content calendar entry", "Content-resource link"], true, true), { key: "channel", label: "Channel", type: "text", column: true }, date(), select("status", "Status", ["Idea", "Drafting", "Ready", "Published"]), link(), notes()],
        statusField: "status", filterField: "category", calendarField: "date",
      },
      {
        key: "strategy", title: "Marketing strategy", description: "Marketing plans, campaign strategies, reports and research links.",
        fields: [title(), select("category", "Type", ["Marketing plan", "Campaign strategy", "Marketing report", "Performance / research link"], true, true), period(), summary(), link()],
        filterField: "category",
      },
      {
        key: "product-roadmap", title: "Product roadmap", description: "Product plans, development priorities, documentation and progress records.",
        fields: [title(), select("category", "Type", ["Product plan", "Development priority", "Product documentation", "Progress record"], true, true), select("priority", "Priority", ["High", "Medium", "Low"]), { key: "quarter", label: "Target quarter", type: "text", column: true, hint: "e.g. Q1 2027" }, select("status", "Status", ["Planned", "In progress", "Released", "Paused"]), link(), notes()],
        statusField: "status", filterField: "category",
      },
    ],
  },
  {
    key: "sales-growth",
    title: "Sales & Growth",
    description: "Pipeline, contacts, partnerships, follow-ups, plans and reports.",
    teamSlug: "sales-growth",
    sections: [
      {
        key: "pipeline", title: "Sales pipeline", description: "Opportunities and the stage they are at.",
        fields: [title("Opportunity"), { key: "organisation", label: "Organisation", type: "text", column: true }, { key: "contact", label: "Contact person", type: "text" }, select("stage", "Stage", ["Lead", "Contacted", "Proposal", "Negotiation", "Won", "Lost"], true, true), { key: "value", label: "Estimated value (₦)", type: "money", column: true }, date("expectedClose", "Expected close"), notes(), link("Link", false)],
        statusField: "stage", sumField: "value",
      },
      {
        key: "contacts", title: "Contacts & customers", description: "Customer and contact records.",
        fields: [title("Name"), { key: "organisation", label: "Organisation", type: "text", column: true }, select("type", "Type", ["Customer", "Prospect", "Partner", "Other"]), { key: "email", label: "Email", type: "email", column: true }, { key: "phone", label: "Phone", type: "phone" }, notes()],
        filterField: "type",
      },
      {
        key: "partnerships", title: "Partnerships & opportunities", description: "Partnerships, sponsorships, grants and other opportunities.",
        fields: [title("Partner / opportunity"), select("type", "Type", ["Partnership", "Sponsorship", "Grant", "Opportunity"]), select("status", "Status", ["Exploring", "In discussion", "Active", "Closed"]), date("startDate", "Start date"), { key: "value", label: "Value (₦)", type: "money" }, link(), notes()],
        statusField: "status", filterField: "type",
      },
      {
        key: "follow-ups", title: "Follow-up records", description: "Record of follow-up conversations and outcomes.",
        fields: [title("Contact"), { key: "organisation", label: "Organisation", type: "text", column: true }, date("date", "Date"), select("channel", "Channel", ["Call", "Email", "Meeting", "WhatsApp", "Other"]), { key: "outcome", label: "Outcome", type: "longtext" }, date("nextDate", "Next follow-up", true), select("status", "Status", ["Open", "Closed"])],
        statusField: "status", calendarField: "nextDate",
      },
      plansSection("plans", "Sales & growth plans", "Sales plans and growth plans.", [select("type", "Type", ["Sales plan", "Growth plan"])]),
      reportsSection("reports", "Sales & growth reports"),
    ],
  },
  {
    key: "finance",
    title: "Finance",
    description: "Income, expenses, budgets, payments, reports and documentation. Restricted access.",
    teamSlug: "finance",
    sections: [
      {
        key: "income", title: "Income & revenue", description: "Money received.", confidential: "finance",
        fields: [date("date", "Date"), { key: "title", label: "Source", type: "text", required: true, column: true }, select("category", "Category", ["Programme fees", "Sponsorship", "Grant", "Donation", "Services", "Other"]), { key: "amount", label: "Amount (₦)", type: "money", required: true, column: true }, { key: "reference", label: "Reference", type: "text" }, link("Receipt / document link", false), notes()],
        filterField: "category", sumField: "amount",
      },
      {
        key: "expenses", title: "Expenses", description: "Money spent.", confidential: "finance",
        fields: [date("date", "Date"), { key: "title", label: "Description", type: "text", required: true, column: true }, select("category", "Category", ["Operations", "Marketing", "Events", "Technology", "Logistics", "Staff", "Other"]), { key: "paidTo", label: "Paid to", type: "text", column: true }, { key: "amount", label: "Amount (₦)", type: "money", required: true, column: true }, { key: "reference", label: "Reference", type: "text" }, link("Receipt / document link", false), notes()],
        filterField: "category", sumField: "amount",
      },
      {
        key: "budgets", title: "Budgets", description: "Budget allocations by period and category.", confidential: "finance",
        fields: [title("Budget line"), period(), select("category", "Category", ["Operations", "Marketing", "Events", "Technology", "Logistics", "Staff", "Other"]), { key: "amount", label: "Budgeted (₦)", type: "money", required: true, column: true }, link("Budget document", false), notes()],
        filterField: "category", sumField: "amount",
      },
      {
        key: "payments", title: "Payments & receivables", description: "Amounts owed by and to the organisation.", confidential: "finance",
        fields: [title("Party"), select("type", "Type", ["Payable", "Receivable"], true, true), { key: "amount", label: "Amount (₦)", type: "money", required: true, column: true }, date("dueDate", "Due date"), select("status", "Status", ["Pending", "Paid", "Overdue", "Cancelled"]), { key: "reference", label: "Reference", type: "text" }, notes()],
        statusField: "status", filterField: "type", calendarField: "dueDate", sumField: "amount",
      },
      { ...reportsSection("reports", "Financial reports"), confidential: "finance" },
      { ...docsSection("docs", "Financial documentation", "Links to statements, policies and other documents.", ["Statement", "Policy", "Audit", "Tax", "Bank", "Other"]), confidential: "finance" },
    ],
  },
  {
    key: "community",
    title: "Community",
    description: "Guidelines, SOPs, members, engagement, events, feedback and reports.",
    teamSlug: "community",
    sections: [
      { key: "guidelines", title: "Community guidelines", description: "Rules and expectations for the community.", fields: [title(), { key: "version", label: "Version", type: "text", column: true }, summary(), link()] },
      { key: "sops", title: "Community SOPs", description: "Standard operating procedures.", fields: [title(), { key: "area", label: "Area", type: "text", column: true }, { key: "version", label: "Version", type: "text", column: true }, summary(), link()] },
      {
        key: "members", title: "Member records", description: "Community members (not Projexa Hub staff).",
        fields: [title("Name"), { key: "email", label: "Email", type: "email", column: true }, { key: "phone", label: "Phone", type: "phone" }, { key: "location", label: "Location", type: "text", column: true }, date("joined", "Joined"), select("status", "Status", ["Active", "Inactive"]), notes()],
        statusField: "status",
      },
      {
        key: "engagement", title: "Engagement activities", description: "Community engagement activities.",
        fields: [title("Activity"), date(), { key: "channel", label: "Channel", type: "text", column: true }, { key: "participants", label: "Participants", type: "number", column: true }, summary(), link()],
        calendarField: "date",
      },
      {
        key: "events", title: "Community events", description: "Events held or planned.",
        fields: [title("Event"), date(), { key: "venue", label: "Venue", type: "text", column: true }, select("format", "Format", ["Physical", "Virtual", "Hybrid"]), { key: "attendees", label: "Attendees", type: "number" }, select("status", "Status", ["Upcoming", "Held", "Cancelled"]), link(), notes()],
        statusField: "status", calendarField: "date",
      },
      {
        key: "feedback", title: "Feedback & testimonials", description: "What community members say.",
        fields: [title("Name"), select("type", "Type", ["Feedback", "Testimonial"], true, true), date(), { key: "message", label: "Message", type: "longtext", required: true }, select("publish", "OK to publish?", ["Yes", "No"]), link("Source link", false)],
        filterField: "type",
      },
      reportsSection("reports", "Community reports"),
    ],
  },
  {
    key: "alumni",
    title: "Alumni",
    description: "Alumni directory, leadership, engagement, activities, opportunities and stories. Internal Alumni team performance lives in Analytics.",
    teamSlug: "alumni",
    sections: [
      {
        key: "directory", title: "Alumni directory", description: "Alumni-community members (not internal staff).",
        fields: [title("Name"), { key: "cohort", label: "Cohort / year", type: "text", column: true }, { key: "occupation", label: "Occupation", type: "text", column: true }, { key: "organisation", label: "Organisation", type: "text" }, { key: "location", label: "Location", type: "text" }, { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone", type: "phone" }, link("LinkedIn / profile link", false)],
      },
      {
        key: "leadership", title: "Alumni leadership", description: "Alumni association leadership records.",
        fields: [title("Name"), { key: "position", label: "Position", type: "text", column: true }, { key: "term", label: "Term", type: "text", column: true }, { key: "email", label: "Email", type: "email" }, notes()],
      },
      plansSection("engagement-plans", "Engagement plans", "Plans for engaging the alumni community."),
      {
        key: "activities", title: "Alumni activities", description: "Activities and events for alumni.",
        fields: [title("Activity"), date(), select("type", "Type", ["Meetup", "Webinar", "Mentorship", "Reunion", "Outreach", "Other"]), { key: "participants", label: "Participants", type: "number", column: true }, summary(), link()],
        filterField: "type", calendarField: "date",
      },
      {
        key: "opportunities", title: "Opportunities & resources", description: "Jobs, internships, scholarships and resources shared with alumni.",
        fields: [title(), select("type", "Type", ["Job", "Internship", "Scholarship", "Mentorship", "Resource", "Other"]), { key: "provider", label: "Provider", type: "text", column: true }, date("deadline", "Deadline"), link()],
        filterField: "type", calendarField: "deadline",
      },
      {
        key: "stories", title: "Success stories", description: "Alumni achievements worth celebrating.",
        fields: [title("Alumnus / alumna"), { key: "headline", label: "Headline", type: "text", column: true }, date(), { key: "story", label: "Story", type: "longtext" }, link()],
      },
      reportsSection("reports", "Alumni reports"),
      docsSection("docs", "Documentation links", "Relevant external documentation.", ["Policy", "Template", "Form", "Reference", "Other"]),
    ],
  },
  {
    key: "campus",
    title: "Campus",
    description: "Campus Chapter directory, members, plans, activities, resources and development. Internal Campus Chapter team performance lives in Analytics.",
    teamSlug: "campus-chapter",
    sections: [
      {
        key: "chapters", title: "Chapter directory", description: "Campus chapters.",
        fields: [title("Chapter"), { key: "institution", label: "Institution", type: "text", column: true }, { key: "location", label: "Location", type: "text", column: true }, select("status", "Status", ["Prospective", "Active", "Dormant"]), date("established", "Established", false), { key: "lead", label: "Chapter lead", type: "text" }, { key: "email", label: "Chapter email", type: "email" }],
        statusField: "status",
      },
      {
        key: "chapter-members", title: "Chapter teams & members", description: "Students and chapter executives (not internal staff).",
        fields: [title("Name"), { key: "chapter", label: "Chapter", type: "text", column: true }, select("role", "Role", ["Chapter lead", "Executive", "Member"]), { key: "level", label: "Level / year", type: "text" }, { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone", type: "phone" }],
        filterField: "role",
      },
      plansSection("plans", "Chapter plans", "Plans for each chapter.", [{ key: "chapter", label: "Chapter", type: "text", column: true }]),
      {
        key: "activities", title: "Chapter activities", description: "Activities and participation across chapters.",
        fields: [title("Activity"), { key: "chapter", label: "Chapter", type: "text", column: true }, date(), { key: "participants", label: "Participants", type: "number", column: true }, summary(), link()],
        calendarField: "date",
      },
      docsSection("resources", "Campus resources", "Resources for chapters.", ["Guide", "Template", "Training", "Brand", "Other"]),
      {
        key: "development", title: "Chapter development", description: "Milestones in setting up and growing chapters.",
        fields: [title("Milestone"), { key: "chapter", label: "Chapter", type: "text", column: true }, date(), select("stage", "Stage", ["Prospecting", "Onboarding", "Launched", "Established"]), notes()],
        statusField: "stage",
      },
      docsSection("docs", "Documentation links", "Relevant external documentation.", ["Policy", "Template", "Form", "Reference", "Other"]),
    ],
  },
  {
    key: "technology",
    title: "Technology",
    description: "Technical documentation, decisions, bugs and improvements, and system resources.",
    teamSlug: "technology",
    sections: [
      docsSection("docs", "Technical documentation", "System and process documentation.", ["Architecture", "Setup", "Process", "API", "Other"]),
      {
        key: "decisions", title: "Technical decisions", description: "Decision records: what was decided and why.",
        fields: [title("Decision"), date(), select("status", "Status", ["Proposed", "Accepted", "Superseded"]), { key: "context", label: "Context", type: "longtext" }, { key: "outcome", label: "Decision & consequences", type: "longtext" }, link("Link", false)],
        statusField: "status",
      },
      {
        key: "issues", title: "Bugs & improvements", description: "Record of known bugs and improvement ideas.",
        fields: [title(), select("type", "Type", ["Bug", "Improvement"], true, true), select("severity", "Severity", ["Low", "Medium", "High", "Critical"]), date("reported", "Reported"), select("status", "Status", ["Open", "Under review", "Resolved", "Won't fix"]), { key: "description", label: "Description", type: "longtext" }, link("Link", false)],
        statusField: "status", filterField: "type",
      },
      {
        key: "resources", title: "System resources", description: "Hosting, domains, services and tools in use.",
        fields: [title("Name"), select("type", "Type", ["Hosting", "Domain", "Service", "Repository", "Tool", "Other"]), { key: "owner", label: "Account owner", type: "text", column: true }, link("URL"), { key: "notes", label: "Notes", type: "longtext", hint: "Never store passwords or secrets here." }],
        filterField: "type",
      },
      docsSection("links", "Product & technical links", "Links to product and technical documents.", ["Product", "Technical", "Design", "Other"]),
    ],
  },
];

export function getSpace(key: string) {
  return SPACES.find((s) => s.key === key);
}

export function getSection(spaceKey: string, sectionKey: string) {
  const space = getSpace(spaceKey);
  const section = space?.sections.find((s) => s.key === sectionKey);
  return space && section ? { space, section } : null;
}

/** Columns shown in the table view: the first field plus those marked `column`. */
export function tableColumns(section: Section): Field[] {
  return section.fields.filter((f, i) => i === 0 || f.column);
}

/** The field used as a record's display name. */
export function titleField(section: Section): Field {
  return section.fields.find((f) => f.key === "title") ?? section.fields[0];
}
