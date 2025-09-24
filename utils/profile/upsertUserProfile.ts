import type { SupabaseClient } from "@supabase/supabase-js";

type UpsertUserProfileParams = {
  supabase: SupabaseClient;
  userId: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  roles?: string[];
};

type UpsertUserProfileResult =
  | { success: true }
  | { success: false; error: string };

function deriveNames({
  fullName,
  firstName,
  lastName,
  email,
}: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const fallback = email?.split("@")[0] ?? "User";

  const safeFirst = (firstName ?? "").trim();
  const safeLast = (lastName ?? "").trim();

  if (safeFirst || safeLast) {
    return {
      firstName: safeFirst || fallback,
      lastName: safeLast || safeFirst || fallback,
    };
  }

  const trimmed = fullName?.trim();

  if (!trimmed) {
    return {
      firstName: fallback,
      lastName: fallback,
    };
  }

  const parts = trimmed.split(/\s+/);
  const derivedFirst = parts[0] || fallback;
  const derivedLast = parts.slice(1).join(" ") || fallback;

  return { firstName: derivedFirst, lastName: derivedLast };
}

export async function upsertUserProfile({
  supabase,
  userId,
  fullName,
  firstName,
  lastName,
  email,
  roles,
}: UpsertUserProfileParams): Promise<UpsertUserProfileResult> {
  const names = deriveNames({ fullName, firstName, lastName, email });

  const payload: Record<string, unknown> = {
    id: userId,
    first_name: names.firstName,
    last_name: names.lastName,
    updated_at: new Date().toISOString(),
  };

  if (roles) {
    payload.roles = roles;
  }

  const { error } = await supabase
    .from("user_profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
