import Link from "next/link";
import { loginAction } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Parent Login</h1>
      <p className="mt-2 text-sm text-slate-600">
        Log in to manage your child profiles and articulation progress.
      </p>

      <form
        action={loginAction}
        className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-cyan-200 transition focus:ring"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-cyan-200 transition focus:ring"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700"
        >
          Log In
        </button>
      </form>

      {message ? (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-sm text-slate-600">
        Need an account?{" "}
        <Link
          className="font-semibold text-cyan-700 hover:underline"
          href="/signup"
        >
          Sign up
        </Link>
      </p>
    </main>
  );
}
