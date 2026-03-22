import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth/actions";
import { addChildAction } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: children } = await supabase
    .from("children")
    .select("id, name, birth_date, notes, created_at")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false });

  const childIds = (children ?? []).map((child) => child.id);
  const { data: progressRows } = childIds.length
    ? await supabase
        .from("child_sound_progress")
        .select("child_id, mastered")
        .in("child_id", childIds)
    : { data: [] as { child_id: string; mastered: boolean }[] };

  const masteredByChild = new Map<string, number>();
  for (const row of progressRows ?? []) {
    if (!row.mastered) continue;
    masteredByChild.set(
      row.child_id,
      (masteredByChild.get(row.child_id) ?? 0) + 1,
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-6 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-[#2d78c4]">
            Aart Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#2f2a26]">
            Welcome, {profile?.full_name || user.email}
          </h1>
          <p className="mt-2 text-sm text-[#5f4a37]">
            Manage profiles, track articulation mastery, and generate
            confidence-safe suggestions.
          </p>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-[#e8b795] bg-[#fff7ee] px-4 py-2 text-sm font-semibold text-[#5f4a37] transition hover:bg-[#ffefdf]"
          >
            Log Out
          </button>
        </form>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-6 shadow-sm lg:col-span-1">
          <h2 className="text-xl font-semibold text-[#2f2a26]">
            Add Child Profile
          </h2>
          <form action={addChildAction} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-[#5f4a37]"
              >
                Child Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-lg border border-[#e8b795] px-3 py-2 outline-none ring-[#8ec7ed] transition focus:ring"
              />
            </div>

            <div>
              <label
                htmlFor="birthDate"
                className="mb-1 block text-sm font-medium text-[#5f4a37]"
              >
                Birth Month/Year
              </label>
              <input
                id="birthDate"
                name="birthDate"
                type="month"
                className="w-full rounded-lg border border-[#e8b795] px-3 py-2 outline-none ring-[#8ec7ed] transition focus:ring"
              />
            </div>

            <div>
              <label
                htmlFor="notes"
                className="mb-1 block text-sm font-medium text-[#5f4a37]"
              >
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full rounded-lg border border-[#e8b795] px-3 py-2 outline-none ring-[#8ec7ed] transition focus:ring"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#2d78c4] px-4 py-2 font-semibold text-white transition hover:bg-[#2367aa]"
            >
              Add Profile
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-[#efc8ab] bg-[#fffdf8] p-6 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-semibold text-[#2f2a26]">
            Child Profiles
          </h2>
          <p className="mt-2 text-sm text-[#5f4a37]">
            Click into a child profile to mark sound mastery and get tailored
            word and sentence recommendations.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(children ?? []).map((child) => (
              <article
                key={child.id}
                className="rounded-2xl border border-[#f0dac9] bg-[#fff5eb] p-4"
              >
                <h3 className="text-lg font-semibold text-[#2f2a26]">
                  {child.name}
                </h3>
                <p className="mt-1 text-sm text-[#5f4a37]">
                  Mastered targets: {masteredByChild.get(child.id) ?? 0}
                </p>
                {child.birth_date ? (
                  <p className="mt-1 text-sm text-[#5f4a37]">
                    Birth date: {child.birth_date}
                  </p>
                ) : null}
                {child.notes ? (
                  <p className="mt-1 text-sm text-[#5f4a37]">{child.notes}</p>
                ) : null}

                <Link
                  href={`/dashboard/${child.id}`}
                  className="mt-4 inline-flex rounded-lg bg-[#2d78c4] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2367aa]"
                >
                  Open Tracker
                </Link>
              </article>
            ))}
          </div>

          {(children ?? []).length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-[#e8b795] bg-[#fff5eb] px-4 py-3 text-sm text-[#5f4a37]">
              Add your first child profile to begin tracking articulation
              progress.
            </p>
          ) : null}
        </div>
      </section>

      {message ? (
        <p className="mt-6 rounded-lg border border-[#ffd66b] bg-[#fff7de] px-3 py-2 text-sm text-[#7a5b16]">
          {message}
        </p>
      ) : null}
    </main>
  );
}
