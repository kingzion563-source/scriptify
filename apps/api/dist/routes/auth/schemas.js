import { z } from "zod";
export const registerSchema = z
    .object({
    username: z
        .string()
        .min(2, "Username too short")
        .max(30, "Username too long")
        .regex(/^[a-zA-Z0-9_]+$/, "Username: letters, numbers, underscore only"),
    email: z.string().email("Invalid email"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password too long"),
    confirmPassword: z.string(),
    turnstileToken: z.string().optional(),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
export const loginSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password required"),
});
export const refreshSchema = z.object({}).strict();
export const verifyEmailSchema = z.object({
    token: z.string().min(1, "Token required"),
});
export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email"),
});
export const resetPasswordSchema = z
    .object({
    token: z.string().min(1, "Token required"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password too long"),
    confirmPassword: z.string(),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
