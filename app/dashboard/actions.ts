"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name:
        (user.user_metadata?.full_name as string | undefined) ||
        user.email ||
        null,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    redirect(`/dashboard?message=${encodeURIComponent(profileError.message)}`);
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

export async function upsertProgressAction(
  formData: FormData,
): Promise<
  | { error: string }
  | { id: number; score: number; notes: string | null; recorded_at: string }
> {
  const childId = String(formData.get("childId") ?? "");
  const soundId = String(formData.get("soundId") ?? "");
  const position = String(formData.get("position") ?? "") as
    | "beginning"
    | "middle"
    | "end";
  const scoreInput = Number(formData.get("score") ?? "0");
  const notes = String(formData.get("notes") ?? "").trim();
  const masteredInput = formData.get("mastered") === "on";

  if (
    !childId ||
    !soundId ||
    !["beginning", "middle", "end"].includes(position)
  ) {
    return { error: "Invalid progress payload" };
  }

  const score = Number.isNaN(scoreInput)
    ? 1
    : Math.max(1, Math.min(10, Math.round(scoreInput * 2) / 2));

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
      mastered: masteredInput || score >= 8,
      notes: notes || null,
      last_practiced_at: new Date().toISOString(),
    },
    { onConflict: "child_id,sound_id,position" },
  );

  if (error) {
    return { error: error.message };
  }

  const recorded_at = new Date().toISOString();

  // Insert a history record
  const { data: insertedRecord, error: recordError } = await supabase
    .from("child_sound_progress_records")
    .insert({
      child_id: childId,
      sound_id: soundId,
      position,
      score,
      notes: notes || null,
      recorded_at,
    })
    .select("id")
    .single();

  if (recordError) {
    return { error: recordError.message };
  }

  revalidatePath(`/dashboard/${childId}`);
  return { id: insertedRecord.id, score, notes: notes || null, recorded_at };
}

export async function updateProgressRecordAction(
  id: number,
  score: number,
  notes: string | null,
  childId: string,
): Promise<
  { error: string } | { id: number; score: number; notes: string | null }
> {
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("child_sound_progress_records")
    .select("child_id, sound_id, position")
    .eq("id", id)
    .maybeSingle();

  if (!record) return { error: "Record not found" };

  const { error } = await supabase
    .from("child_sound_progress_records")
    .update({ score, notes: notes ?? null })
    .eq("id", id);

  if (error) return { error: error.message };

  // Keep child_sound_progress in sync with the most recent record
  const { data: latest } = await supabase
    .from("child_sound_progress_records")
    .select("score, notes")
    .eq("child_id", record.child_id)
    .eq("sound_id", record.sound_id)
    .eq("position", record.position)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) {
    await supabase
      .from("child_sound_progress")
      .update({
        score: latest.score,
        notes: latest.notes,
        mastered: latest.score >= 8,
      })
      .eq("child_id", record.child_id)
      .eq("sound_id", record.sound_id)
      .eq("position", record.position);
  }

  revalidatePath(`/dashboard/${childId}`);
  return { id, score, notes: notes ?? null };
}

export async function deleteProgressRecordAction(
  id: number,
  childId: string,
): Promise<{ error: string } | { deletedId: number }> {
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("child_sound_progress_records")
    .select("child_id, sound_id, position")
    .eq("id", id)
    .maybeSingle();

  if (!record) return { error: "Record not found" };

  const { error } = await supabase
    .from("child_sound_progress_records")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  // Recompute child_sound_progress from remaining records
  const { data: remaining } = await supabase
    .from("child_sound_progress_records")
    .select("score, notes")
    .eq("child_id", record.child_id)
    .eq("sound_id", record.sound_id)
    .eq("position", record.position)
    .order("recorded_at", { ascending: false });

  const latest = remaining?.[0] ?? null;
  await supabase
    .from("child_sound_progress")
    .update({
      score: latest?.score ?? 1,
      notes: latest?.notes ?? null,
      mastered: latest ? latest.score >= 8 : false,
      attempts: remaining?.length ?? 0,
    })
    .eq("child_id", record.child_id)
    .eq("sound_id", record.sound_id)
    .eq("position", record.position);

  revalidatePath(`/dashboard/${childId}`);
  return { deletedId: id };
}

export async function clearLastChildAction() {
  const cookieStore = await cookies();
  cookieStore.delete("last_child_id");
  redirect("/dashboard?manage=1");
}
