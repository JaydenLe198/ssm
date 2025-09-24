export type ProfileFieldName = "firstName" | "lastName" | "phone" | "location" | "bio";

export type UpdateProfileState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<ProfileFieldName, string[]>>;
  avatarUrl?: string;
};

export const initialUpdateProfileState: UpdateProfileState = { status: "idle" };
