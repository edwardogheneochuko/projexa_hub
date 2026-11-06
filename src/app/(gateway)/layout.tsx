import { requireUser } from "@/lib/auth";
import { logout } from "../auth-actions";

/** Entry/selection pages: a plain white page without the app sidebar. */
export default async function GatewayLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <div className="flex items-center justify-end gap-3 px-4 pt-3 text-xs text-muted">
        <span>{user.name}</span>
        <form action={logout}>
          <button className="link text-xs">Sign out</button>
        </form>
      </div>
      {children}
    </div>
  );
}
