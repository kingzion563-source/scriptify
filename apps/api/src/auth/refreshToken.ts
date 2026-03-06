import { randomBytes } from "crypto";
import prisma from "../lib/prisma.js";
import { AUTH } from "../config.js";

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createRefreshToken(userId: string, familyId: string) {
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

export async function findRefreshToken(token: string) {
  return prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { isRevoked: true },
  });
}

export async function revokeFamily(familyId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { family: familyId },
    data: { isRevoked: true },
  });
}

export async function markRefreshTokenUsed(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { isRevoked: true },
  });
}
