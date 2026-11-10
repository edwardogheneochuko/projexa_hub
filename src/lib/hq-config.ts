// Projexa Hub HQ — fixed, department-specific table structures (PRD §5).
// Founders HQ, Marketing and Content & Copywriting follow PRD §5.2–5.4 field for field.
// Other departments are "to be confirmed" (PRD §5.5): their workspaces below only appear once
// the Founder creates a department with the matching slug in Settings (see liveTeamSlugs in hq.ts).
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

const person = (label: string, hint?: string, column = true): Field => ({ key: "person", label, type: "text", column, hint });
const timeline = (label: string, hint = "e.g. Jan – Mar 2027"): Field => ({ key: "timeline", label, type: "text", column: true, hint });

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const PLATFORMS = ["Instagram", "X (Twitter)", "LinkedIn", "Facebook", "TikTok", "YouTube", "WhatsApp", "Website", "Email", "Other"];
const FORMATS = ["Post", "Carousel", "Reel / Video", "Story", "Article", "Newsletter", "Other"];
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
    title: "Founders HQ",
    description: "An informational view of organisational plans and relevant resources (PRD §5.2).",
    teamSlug: null,
    sections: [
      {
        key: "annual-planning", title: "Annual Planning", description: "The annual plan, structured by quarters.",
        fields: [
          select("quarter", "Quarter", QUARTERS, true, true),
          { key: "year", label: "Year", type: "text", column: true, required: true, hint: "e.g. 2027" },
          { key: "title", label: "Strategic Objective", type: "text", required: true, column: true },
          { key: "initiatives", label: "Key Initiatives", type: "longtext", hint: "Major activities or projects." },
          person("Responsible Person", "Assigned owner."),
          timeline("Timeline", "Expected implementation period, e.g. Jan – Mar 2027."),
          select("status", "Status", ["Not Started", "In Progress", "Completed"], true, true),
          link("Reference Links", false),
        ],
        statusField: "status", filterField: "quarter",
      },
      {
        key: "reference-library", title: "Reference Library", description: "Links to company resources, documents, platforms and external references.",
        fields: [
          { key: "title", label: "Resource Name", type: "text", required: true, column: true },
          select("category", "Category", ["Document", "Platform", "Policy", "Template", "Guide", "External reference", "Other"], true, true),
          { key: "description", label: "Description", type: "longtext" },
          { ...link("Link"), required: true },
          person("Responsible Person"),
          { key: "dateAdded", label: "Date Added", type: "date", column: true, required: true },
        ],
        filterField: "category",
      },
      {
        // Not listed in PRD §5.2, kept for the PRD objective "a centralized HR and departmental information hub".
        key: "hr", title: "HR & onboarding", description: "Confidential HR and onboarding documentation.", confidential: "hr",
        fields: [title(), select("category", "Category", ["Onboarding", "Policy", "Contract", "Personnel record", "Offboarding", "Other"]), { key: "person", label: "Person (if applicable)", type: "text", column: true }, date(), link(), notes()],
        filterField: "category",
      },
    ],
  },
  {
    key: "marketing",
    title: "Marketing",
    description: "Social media plans, content calendar, creative plans and video plans (PRD §5.3).",
    teamSlug: "marketing",
    sections: [
      {
        key: "social-media-plans", title: "Social Media Plans", description: "Campaigns and objectives per platform.",
        fields: [
          { key: "title", label: "Campaign or objective", type: "text", required: true, column: true },
          select("platform", "Platform", PLATFORMS, true, true),
          { key: "direction", label: "Content direction", type: "longtext" },
          { key: "audience", label: "Target audience", type: "text" },
          person("Responsible person"),
          timeline("Timeline"),
          select("status", "Status", ["Not Started", "In Progress", "Completed"], true, true),
          link("Reference links", false),
        ],
        statusField: "status", filterField: "platform",
      },
      {
        key: "content-calendar", title: "Content Calendar", description: "What is being published, where and when.",
        fields: [
          { key: "title", label: "Content title", type: "text", required: true, column: true },
          { key: "pillar", label: "Content pillar", type: "text" },
          select("platform", "Platform", PLATFORMS, true, true),
          select("format", "Content format", FORMATS, true),
          { key: "publicationDate", label: "Publication date", type: "date", column: true, required: true },
          person("Responsible person", undefined, false),
          select("status", "Status", ["Planned", "Scheduled", "Published"], true, true),
          link("Content link", false),
        ],
        statusField: "status", filterField: "platform", calendarField: "publicationDate",
      },
      {
        key: "creative-plans", title: "Creative Plans", description: "Design work: what, why, who and when.",
        fields: [
          { key: "title", label: "Creative project", type: "text", required: true, column: true },
          select("designType", "Design type", ["Social media graphic", "Flyer", "Banner", "Brand asset", "Presentation", "Other"], true),
          { key: "objective", label: "Objective", type: "longtext" },
          person("Assigned designer"),
          { key: "deadline", label: "Deadline", type: "date", column: true },
          select("status", "Status", ["Not Started", "In Progress", "In Review", "Completed"], true, true),
          link("Reference link", false),
        ],
        statusField: "status", filterField: "designType", calendarField: "deadline",
      },
      {
        key: "video-plans", title: "Video Plans", description: "Video projects from idea to publication.",
        fields: [
          { key: "title", label: "Video title or project", type: "text", required: true, column: true },
          select("videoType", "Video type", ["Promo", "Tutorial", "Event coverage", "Interview", "Short-form", "Other"], true),
          { key: "objective", label: "Objective", type: "longtext" },
          person("Assigned video editor"),
          timeline("Production timeline"),
          select("status", "Status", ["Planned", "In Production", "Editing", "Published"], true, true),
          link("Video link", false),
        ],
        statusField: "status", filterField: "videoType",
      },
    ],
  },
  {
    key: "content",
    title: "Content & Copywriting",
    description: "Planned content, deadlines, assignments and completed work (PRD §5.4).",
    teamSlug: "content-copywriting",
    sections: [
      {
        key: "content-plans", title: "Content Plans", description: "Content projects and topics.",
        fields: [
          { key: "title", label: "Content project or topic", type: "text", required: true, column: true },
          { key: "pillar", label: "Content pillar", type: "text", column: true },
          { key: "objective", label: "Objective", type: "longtext" },
          { key: "audience", label: "Target audience", type: "text" },
          person("Assigned writer"),
          { key: "deadline", label: "Deadline", type: "date", column: true },
          select("status", "Status", ["Not Started", "In Progress", "Completed"], true, true),
          link("Reference links", false),
        ],
        statusField: "status", calendarField: "deadline",
      },
      {
        key: "content-calendar", title: "Content Calendar", description: "What is being published, where and when.",
        fields: [
          { key: "title", label: "Content title", type: "text", required: true, column: true },
          select("platform", "Platform", PLATFORMS, true, true),
          select("format", "Content format", FORMATS, true),
          { key: "publicationDate", label: "Publication date", type: "date", column: true, required: true },
          person("Assigned writer"),
          select("status", "Status", ["Planned", "Drafting", "Published"], true, true),
          link("Published link", false),
        ],
        statusField: "status", filterField: "platform", calendarField: "publicationDate",
      },
      {
        key: "copywriting", title: "Copywriting Tracker", description: "Copy from brief to approved final.",
        fields: [
          { key: "title", label: "Copy title or project", type: "text", required: true, column: true },
          select("copyType", "Copy type", ["Ad copy", "Caption", "Email", "Website copy", "Script", "Press release", "Other"], true),
          { key: "platform", label: "Intended platform", type: "text" },
          { key: "objective", label: "Objective", type: "longtext" },
          person("Assigned copywriter"),
          { key: "deadline", label: "Deadline", type: "date", column: true },
          select("status", "Review status", ["Draft", "In Review", "Revisions Needed", "Approved"], true, true),
          link("Final copy / document link", false),
        ],
        statusField: "status", filterField: "copyType", calendarField: "deadline",
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
    title: "Campus Structure",
    description: "Campus chapter directory, leadership and members, plans, activities, resources and development. Internal Campus Structure team performance lives in Analytics.",
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
