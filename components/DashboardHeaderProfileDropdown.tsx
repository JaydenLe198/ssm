import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, User, Settings, HelpCircle, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { logout } from "@/app/auth/actions";

export default async function DashboardHeaderProfileDropdown() {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    let avatarUrl: string | undefined;
    let displayName: string | undefined;

    if (user) {
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("first_name, last_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

        if (profile?.first_name || profile?.last_name) {
            displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
        }

        const rawAvatar = profile?.avatar_url ?? undefined;
        if (rawAvatar) {
            if (rawAvatar.startsWith("http")) {
                avatarUrl = rawAvatar;
            } else {
                const { data: signedUrlData } = await supabase.storage
                    .from("avatars")
                    .createSignedUrl(rawAvatar, 60);

                if (signedUrlData?.signedUrl) {
                    avatarUrl = signedUrlData.signedUrl;
                } else {
                    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(rawAvatar);
                    avatarUrl = publicUrlData?.publicUrl;
                }
            }
        }
    }

    const initials = displayName?.[0] ?? user?.email?.[0] ?? "U";

    return (
        <nav className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2">
                <Bell className="h-4 w-4" />
                <span className="sr-only">Notifications</span>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="overflow-hidden rounded-full">
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt="Profile avatar"
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                                {initials}
                            </div>
                        )}
                        <span className="sr-only">Open user menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{displayName ?? user?.email ?? "My Account"}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/profile">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="#">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="#">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            <span>Help</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <form action={logout} className="w-full">
                            <button type="submit" className="flex w-full items-center">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </button>
                        </form>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </nav>
    );
}
