import { z } from "zod";

const registerSchema = z
  .object({
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    turnstileToken: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export { registerSchema };

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
  rememberMe: z.boolean().optional(),
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

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
