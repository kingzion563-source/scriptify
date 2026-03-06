import { verifyAccessToken } from "../auth/jwt.js";
import { PrismaClient } from "@scriptify/db";
import { AUTH } from "../config.js";
const prisma = new PrismaClient();
export async function authenticateToken(req, res, next) {
    const token = req.cookies?.[AUTH.ACCESS_COOKIE_NAME];
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const payload = verifyAccessToken(token);
    if (!payload) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isBanned: true,
            isPro: true,
        },
    });
    if (!user || user.isBanned) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    req.user = user;
    next();
}
