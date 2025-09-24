import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ProfileForm, { ProfileFormData } from "@/components/ProfileForm";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "id, first_name, last_name, phone, avatar_url, bio, location, roles, verification_status, registration_fee_paid"
    )
    .eq("id", user.id)
    .maybeSingle();

  let resolvedAvatarUrl = profile?.avatar_url ?? "";

  if (resolvedAvatarUrl && !resolvedAvatarUrl.startsWith("http")) {
    const { data: signedUrlData } = await supabase.storage
      .from("avatars")
      .createSignedUrl(resolvedAvatarUrl, 60);
    if (signedUrlData?.signedUrl) {
      resolvedAvatarUrl = signedUrlData.signedUrl;
    } else {
      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(resolvedAvatarUrl);
      resolvedAvatarUrl = publicUrlData?.publicUrl ?? "";
    }
  }

  const profileData: ProfileFormData = {
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    phone: profile?.phone ?? "",
    location: profile?.location ?? "",
    bio: profile?.bio ?? "",
    avatarUrl: resolvedAvatarUrl,
    roles: profile?.roles ?? ["customer"],
    verificationStatus: profile?.verification_status ?? "pending",
    registrationFeePaid: profile?.registration_fee_paid ?? false,
    email: user.email ?? "",
  };

  return (
    <main className="flex-1">
      <div className="container py-10 md:py-16 lg:py-20 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
          <p className="text-muted-foreground">
            Manage the information visible to the community and keep your details up to date.
          </p>
        </div>

        <ProfileForm profile={profileData} />
      </div>
    </main>
  );
}

