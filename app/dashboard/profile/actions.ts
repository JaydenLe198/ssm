"use server"

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { UpdateProfileState } from "./profile-state";
import { createClient } from "@/utils/supabase/server";

const phoneRegex = /^[+()\d\s.-]{7,20}$/;

const updateProfileSchema = z
  .object({
    firstName: z
      .string({ required_error: "First name is required" })
      .trim()
      .min(1, "First name is required")
      .max(100, "First name must be 100 characters or less"),
    lastName: z
      .string({ required_error: "Last name is required" })
      .trim()
      .min(1, "Last name is required")
      .max(100, "Last name must be 100 characters or less"),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || phoneRegex.test(value), {
        message: "Enter a valid phone number",
      }),
    location: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || value.length <= 255, {
        message: "Location must be 255 characters or less",
      }),
    bio: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || value.length <= 2000, {
        message: "Bio must be 2000 characters or less",
      }),
  })
  .strip();

export async function updateProfile(
  prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: "You must be signed in to update your profile.",
    };
  }

  const firstNameValue = formData.get("firstName");
  const lastNameValue = formData.get("lastName");
  const phoneValue = formData.get("phone");
  const locationValue = formData.get("location");
  const bioValue = formData.get("bio");
  const avatarValue = formData.get("avatar");

  const parsed = updateProfileSchema.safeParse({
    firstName: typeof firstNameValue === "string" ? firstNameValue : "",
    lastName: typeof lastNameValue === "string" ? lastNameValue : "",
    phone: typeof phoneValue === "string" ? phoneValue.trim() || undefined : undefined,
    location: typeof locationValue === "string" ? locationValue.trim() || undefined : undefined,
    bio: typeof bioValue === "string" ? bioValue.trim() || undefined : undefined,
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const data = parsed.data;
  let storedAvatarPath: string | undefined;
  let responseAvatarUrl: string | undefined;

  if (avatarValue instanceof File && avatarValue.size > 0) {
    const filePath = `${user.id}/profile.jpg`;
    const fileBuffer = Buffer.from(await avatarValue.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, fileBuffer, {
        upsert: true,
        contentType: avatarValue.type || "image/jpeg",
      });

    if (uploadError) {
      console.error("avatar upload error", uploadError);
      return {
        status: "error",
        message: "Unable to upload profile photo. Please try again.",
      };
    }

    storedAvatarPath = filePath;

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("avatars")
      .createSignedUrl(filePath, 60);

    if (!signedUrlError && signedUrlData?.signedUrl) {
      responseAvatarUrl = signedUrlData.signedUrl;
    } else {
      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        responseAvatarUrl = publicUrlData.publicUrl;
      }
    }
  }

  const updatePayload: Record<string, unknown> = {
    first_name: data.firstName,
    last_name: data.lastName,
    phone: data.phone ?? null,
    location: data.location ?? null,
    bio: data.bio ?? null,
    updated_at: new Date().toISOString(),
  };

  if (storedAvatarPath) {
    updatePayload.avatar_url = storedAvatarPath;
  }

  const { error } = await supabase
    .from("user_profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    console.error("updateProfile error", error);
    return {
      status: "error",
      message: "Something went wrong while saving your profile.",
    };
  }

  revalidatePath("/dashboard/profile");

  return {
    status: "success",
    message: "Profile updated successfully.",
    avatarUrl: responseAvatarUrl,
  };
}





