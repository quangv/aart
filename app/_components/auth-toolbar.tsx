import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

type AuthToolbarProps = {
  requireUser?: boolean;
};

export default async function AuthToolbar({
  requireUser = false,
}: AuthToolbarProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (requireUser) {
      redirect("/login");
    }

    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name || user.email || "Parent account";

  return (
    <header className="sticky top-0 z-20 border-b border-[#efc8ab] bg-[#fff8ef]/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#2d78c4]">
            Logged In
          </p>
          <p className="mt-1 text-sm text-[#5f4a37]">{displayName}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg border border-[#e8b795] bg-[#fff7ee] px-4 py-2 text-sm font-semibold text-[#5f4a37] transition hover:bg-[#ffefdf]"
          >
            Dashboard
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg bg-[#2d78c4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2367aa]"
            >
              Log Out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
