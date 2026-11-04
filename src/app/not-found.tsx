import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-brand">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted">This page doesn&apos;t exist, or your role doesn&apos;t give you access to it.</p>
      <Link href="/analytics" className="btn-primary mt-6">Back to dashboard</Link>
    </main>
  );
}
