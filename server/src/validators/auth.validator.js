import { z } from "zod";

export const loginSchema = z.object({
  armyNumber: z
    .string({ required_error: "Army number is required" })
    .min(1, "Army number is required")
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),
});

export const changePasswordSchema = z.object({
  oldPassword: z
    .string({ required_error: "Old password is required" })
    .min(6, "Old password must be at least 6 characters"),
  newPassword: z
    .string({ required_error: "New password is required" })
    .min(6, "New password must be at least 6 characters"),
});
