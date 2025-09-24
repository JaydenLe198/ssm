"use client"

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile } from "@/app/dashboard/profile/actions";
import {
  initialUpdateProfileState,
  type UpdateProfileState,
} from "@/app/dashboard/profile/profile-state";

export type ProfileFormData = {
  firstName: string;
  lastName: string;
  phone: string;
  location: string;
  bio: string;
  avatarUrl: string;
  roles: string[];
  verificationStatus: string;
  registrationFeePaid: boolean;
  email: string;
};

type ProfileFormProps = {
  profile: ProfileFormData;
};

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  location: string;
  bio: string;
};

type FieldName = keyof FormState;

const fieldLabelMap: Record<FieldName, string> = {
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone number",
  location: "Location",
  bio: "Bio",
};

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [formState, setFormState] = useState<FormState>({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    location: profile.location,
    bio: profile.bio,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);

  const [actionState, formAction] = useFormState<UpdateProfileState>(
    updateProfile,
    initialUpdateProfileState,
  );

  useEffect(() => {
    setFormState({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      location: profile.location,
      bio: profile.bio,
    });
    setAvatarUrl(profile.avatarUrl);
    setAvatarFile(null);
  }, [profile]);

  useEffect(() => {
    if (actionState.status === "success") {
      if (actionState.avatarUrl) {
        // Append cache buster so the new image shows immediately.
        const cacheBustedUrl = `${actionState.avatarUrl}?t=${Date.now()}`;
        setAvatarUrl(cacheBustedUrl);
      }
      setAvatarFile(null);
    }
  }, [actionState]);

  const avatarPreview = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }
    return avatarUrl || "";
  }, [avatarFile, avatarUrl]);

  useEffect(() => {
    return () => {
      if (avatarFile && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarFile, avatarPreview]);

  const isTutor = profile.roles.some((role) => role === "provider" || role === "tutor");

  const getFieldError = (field: FieldName) => actionState.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="grid gap-8" encType="multipart/form-data">
      {actionState.status === "success" && actionState.message && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {actionState.message}
        </div>
      )}
      {actionState.status === "error" && actionState.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {actionState.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="firstName">
              {fieldLabelMap.firstName}
            </label>
            <input
              id="firstName"
              name="firstName"
              value={formState.firstName}
              onChange={(event) => setFormState((prev) => ({ ...prev, firstName: event.target.value }))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            {getFieldError("firstName") && (
              <p className="text-sm text-red-500">{getFieldError("firstName")}</p>
            )}
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="lastName">
              {fieldLabelMap.lastName}
            </label>
            <input
              id="lastName"
              name="lastName"
              value={formState.lastName}
              onChange={(event) => setFormState((prev) => ({ ...prev, lastName: event.target.value }))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            {getFieldError("lastName") && (
              <p className="text-sm text-red-500">{getFieldError("lastName")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="phone">
              {fieldLabelMap.phone}
            </label>
            <input
              id="phone"
              name="phone"
              value={formState.phone}
              onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="(+1) 555-0123"
            />
            {getFieldError("phone") && (
              <p className="text-sm text-red-500">{getFieldError("phone")}</p>
            )}
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="location">
              {fieldLabelMap.location}
            </label>
            <input
              id="location"
              name="location"
              value={formState.location}
              onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="City, Country"
            />
            {getFieldError("location") && (
              <p className="text-sm text-red-500">{getFieldError("location")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[200px_1fr]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border bg-muted">
              {avatarPreview ? (
                <Image src={avatarPreview} alt="Profile avatar" fill sizes="96px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-semibold">
                  {profile.firstName?.[0] ?? profile.email?.[0] ?? "U"}
                </div>
              )}
            </div>
            <Button asChild variant="outline" size="sm">
              <label htmlFor="avatar">Change photo</label>
            </Button>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setAvatarFile(file);
              }}
            />
            <p className="text-xs text-muted-foreground text-center">
              Upload a JPG or PNG under 2MB. A preview appears immediately.
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Email</p>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
            <div className="h-px bg-border" />
            <div>
              <p className="font-medium">Roles</p>
              <p className="text-muted-foreground">{profile.roles.join(", ")}</p>
            </div>
            <div>
              <p className="font-medium">Verification</p>
              <p className="text-muted-foreground capitalize">{profile.verificationStatus}</p>
            </div>
            <div>
              <p className="font-medium">Registration fee</p>
              <p className="text-muted-foreground">
                {profile.registrationFeePaid ? "Paid" : "Pending"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isTutor && (
        <Card>
          <CardHeader>
            <CardTitle>Tutor Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="bio">
                {fieldLabelMap.bio}
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formState.bio}
                onChange={(event) => setFormState((prev) => ({ ...prev, bio: event.target.value }))}
                rows={5}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Share your teaching experience, specialties, and availability."
              />
              {getFieldError("bio") && (
                <p className="text-sm text-red-500">{getFieldError("bio")}</p>
              )}
            </div>
            <div className="grid gap-1 text-sm text-muted-foreground">
              <p>
                Verification status: <span className="font-medium text-foreground">{profile.verificationStatus}</span>
              </p>
              <p>
                Registration fee: <span className="font-medium text-foreground">{profile.registrationFeePaid ? "Paid" : "Pending"}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save changes"}
    </Button>
  );
}


