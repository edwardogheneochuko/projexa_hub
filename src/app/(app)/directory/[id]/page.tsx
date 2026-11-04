import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS, canViewPerson, type Role } from "@/lib/permissions";
import { isSafeUrl } from "@/lib/hq";
import { Avatar, Badge, Card, ExternalLink, PageHeader } from "@/components/ui";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireUser();
  const { id } = await params;
  const p = await prisma.user.findUnique({ where: { id }, include: { team: true } });
  if (!p || !p.active) notFound();
  const showContact = p.showContact || viewer.id === p.id || viewer.role === "FOUNDER";

  return (
    <>
      <PageHeader title={p.name} crumbs={[{ href: "/directory", label: "Team directory" }]} />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="flex flex-col items-center text-center">
          <Avatar name={p.name} url={p.avatarUrl} size={112} />
          <p className="mt-3 text-lg font-semibold">{p.name}</p>
          <p className="text-sm text-muted">{p.position}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {p.team && <Badge tone="brand">{p.team.name}</Badge>}
            <Badge>{ROLE_LABELS[p.role as Role]}</Badge>
          </div>
          {viewer.id === p.id && <Link href="/profile" className="btn-secondary mt-4">Edit my profile</Link>}
          {viewer.id !== p.id && canViewPerson(viewer, p) && p.role !== "FOUNDER" && (
            <Link href={`/analytics/people/${p.id}`} className="btn-secondary mt-4">View performance</Link>
          )}
        </Card>
        <div className="space-y-6">
          <Card title="About">
            <p className="whitespace-pre-wrap text-sm">{p.bio || <span className="text-muted">No introduction yet.</span>}</p>
          </Card>
          <Card title="Professional information">
            <p className="whitespace-pre-wrap text-sm">{p.professional || <span className="text-muted">Not provided.</span>}</p>
          </Card>
          <Card title="Work contact">
            {showContact ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-muted">Email</dt><dd><a href={`mailto:${p.email}`} className="link break-all">{p.email}</a></dd></div>
                <div><dt className="text-xs text-muted">Phone</dt><dd>{p.phone ? <a href={`tel:${p.phone}`} className="link">{p.phone}</a> : "—"}</dd></div>
                <div><dt className="text-xs text-muted">LinkedIn</dt><dd>{p.linkedin && isSafeUrl(p.linkedin) ? <ExternalLink href={p.linkedin}>Profile</ExternalLink> : "—"}</dd></div>
              </dl>
            ) : (
              <p className="text-sm text-muted">Contact details are hidden.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
