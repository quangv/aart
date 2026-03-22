import { redirect } from "next/navigation";
import Link from "next/link";
import { updatePasswordAction } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage({
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
    redirect("/login?message=Reset session expired. Request a new reset link.");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-bold text-[#2f2a26]">Set New Password</h1>
      <p className="mt-2 text-sm text-[#5f4a37]">
        Choose a new password for your parent account.
      </p>

      <form
        action={updatePasswordAction}
        className="mt-8 space-y-4 rounded-2xl border border-[#efc8ab] bg-[#fffdf8] p-6 shadow-sm"
      >
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-[#5f4a37]"
          >
            New Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border border-[#e8b795] px-3 py-2 outline-none ring-[#8ec7ed] transition focus:ring"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-sm font-medium text-[#5f4a37]"
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border border-[#e8b795] px-3 py-2 outline-none ring-[#8ec7ed] transition focus:ring"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-[#2d78c4] px-4 py-2 font-semibold text-white transition hover:bg-[#2367aa]"
        >
          Update Password
        </button>
      </form>

      {message ? (
        <p className="mt-4 rounded-lg border border-[#ffd66b] bg-[#fff7de] px-3 py-2 text-sm text-[#7a5b16]">
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-sm text-[#5f4a37]">
        Need to sign in instead?{" "}
        <Link
          className="font-semibold text-[#2d78c4] hover:underline"
          href="/login"
        >
          Back to login
        </Link>
      </p>
    </main>
  );
}
