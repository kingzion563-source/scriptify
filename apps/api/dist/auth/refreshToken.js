import { randomBytes } from "crypto";
import { PrismaClient } from "@scriptify/db";
import { AUTH } from "../config.js";
const prisma = new PrismaClient();
export function generateToken() {
    return randomBytes(32).toString("hex");
}
export async function createRefreshToken(userId, familyId) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + AUTH.REFRESH_TOKEN_EXPIRY_MS);
    await prisma.refreshToken.create({
        data: {
            token,
            userId,
            family: familyId,
            expiresAt,
        },
    });
    return { token, expiresAt };
}
export async function findRefreshToken(token) {
    return prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true },
    });
}
export async function revokeRefreshToken(token) {
    await prisma.refreshToken.updateMany({
        where: { token },
        data: { isRevoked: true },
    });
}
export async function revokeFamily(familyId) {
    await prisma.refreshToken.updateMany({
        where: { family: familyId },
        data: { isRevoked: true },
    });
}
export async function markRefreshTokenUsed(token) {
    await prisma.refreshToken.updateMany({
        where: { token },
        data: { isRevoked: true },
    });
}
