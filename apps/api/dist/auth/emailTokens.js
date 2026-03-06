/**
 * In-memory store for email verification and password reset tokens.
 * Replace with DB (e.g. VerificationToken, PasswordResetToken tables) when adding Resend.
 */
const resetTokens = new Map();
const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
export function setPasswordResetToken(email, userId, token) {
    resetTokens.set(token, {
        userId,
        email,
        expiresAt: Date.now() + RESET_EXPIRY_MS,
    });
}
export function consumePasswordResetToken(token) {
    const entry = resetTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
        return null;
    }
    resetTokens.delete(token);
    return { userId: entry.userId };
}
