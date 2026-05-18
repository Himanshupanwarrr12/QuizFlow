import { z } from "zod";

export const createUserSchema = z.object({
  armyNumber: z
    .string({ required_error: "Army number is required" })
    .min(1, "Army number is required")
    .trim()
    .toUpperCase(),
  rank: z
    .string({ required_error: "Rank is required" })
    .min(1, "Rank is required")
    .trim(),
  name: z
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .trim(),
  unit: z
    .string({ required_error: "Unit is required" })
    .min(1, "Unit is required")
    .trim(),
  trade: z
    .string({ required_error: "Trade is required" })
    .min(1, "Trade is required")
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),
});

export const updateUserSchema = z.object({
  rank: z.string().min(1).trim().optional(),
  name: z.string().min(2).trim().optional(),
  unit: z.string().min(1).trim().optional(),
  trade: z.string().min(1).trim().optional(),
});

export const overrideMarksSchema = z.object({
  newMarks: z
    .number()
    .min(0, "Marks cannot be negative")
    .optional(),
  practicalMarks: z
    .number()
    .min(0, "Practical marks cannot be negative")
    .max(20, "Practical marks cannot exceed 20")
    .optional(),
  vivaMarks: z
    .number()
    .min(0, "Viva marks cannot be negative")
    .max(20, "Viva marks cannot exceed 20")
    .optional(),
  subjectiveMarks: z
    .number()
    .min(0, "Subjective marks cannot be negative")
    .max(20, "Subjective marks cannot exceed 20")
    .optional(),
  reason: z
    .string({ required_error: "Reason is required" })
    .min(3, "Reason must be at least 3 characters")
    .trim(),
});
