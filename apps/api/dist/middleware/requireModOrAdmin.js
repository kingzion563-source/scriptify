export function requireModOrAdmin(req, res, next) {
    const role = req.user?.role;
    if (role === "MOD" || role === "ADMIN") {
        next();
        return;
    }
    res.status(403).json({ error: "Moderator access required." });
}
