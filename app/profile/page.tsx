import { createClient } from '@/utils/supabase/server';
import ProfileForm from '@/components/ProfileForm';

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>You must be logged in to view this page.</div>;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, phone, location, bio, avatar_url, roles')
    .eq('id', user.id)
    .single();

  let avatarUrl = profile?.avatar_url ?? '';
  if (profile?.avatar_url) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
    avatarUrl = data.publicUrl;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
      <ProfileForm
        initialData={{
          firstName: profile?.first_name ?? '',
          lastName: profile?.last_name ?? '',
          phone: profile?.phone ?? '',
          location: profile?.location ?? '',
          bio: profile?.bio ?? '',
          avatarUrl: avatarUrl,
          roles: profile?.roles ?? [],
        }}
      />
    </div>
  );
}
