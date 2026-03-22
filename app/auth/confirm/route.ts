import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token = searchParams.get("token");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";
  const supabase = await createClient();

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  if (token && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: token,
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?message=${encodeURIComponent("Reset link is invalid or expired. Request a new one.")}`,
  );
}
