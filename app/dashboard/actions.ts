"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addChildAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) {
    redirect("/dashboard?message=Child name is required");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { error } = await supabase.from("children").insert({
    parent_id: user.id,
    name,
    birth_date: birthDate || null,
    notes: notes || null,
  });

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function upsertProgressAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const soundId = String(formData.get("soundId") ?? "");
  const position = String(formData.get("position") ?? "") as
    | "beginning"
    | "middle"
    | "end";
  const scoreInput = Number(formData.get("score") ?? "0");
  const masteredInput = formData.get("mastered") === "on";
  const returnPath = String(
    formData.get("returnPath") ?? `/dashboard/${childId}`,
  );

  if (
    !childId ||
    !soundId ||
    !["beginning", "middle", "end"].includes(position)
  ) {
    redirect("/dashboard?message=Invalid progress payload");
  }

  const score = Number.isNaN(scoreInput)
    ? 0
    : Math.max(0, Math.min(100, Math.round(scoreInput)));

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("child_sound_progress")
    .select("attempts")
    .eq("child_id", childId)
    .eq("sound_id", soundId)
    .eq("position", position)
    .maybeSingle();

  const attempts = (existing?.attempts ?? 0) + 1;

  const { error } = await supabase.from("child_sound_progress").upsert(
    {
      child_id: childId,
      sound_id: soundId,
      position,
      score,
      attempts,
      mastered: masteredInput || score >= 80,
      last_practiced_at: new Date().toISOString(),
    },
    { onConflict: "child_id,sound_id,position" },
  );

  if (error) {
    redirect(`${returnPath}?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(returnPath);
  redirect(returnPath);
}
