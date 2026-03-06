import jwt from "jsonwebtoken";
import { getEnv } from "../config.js";
import { AUTH } from "../config.js";
let _secret = null;
function getSecret() {
    if (!_secret)
        _secret = getEnv("JWT_SECRET");
    return _secret;
}
export function signAccessToken(payload) {
    return jwt.sign({ ...payload, type: "access" }, getSecret(), { expiresIn: AUTH.ACCESS_TOKEN_EXPIRY });
}
export function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, getSecret());
        if (decoded.type !== "access")
            return null;
        return decoded;
    }
    catch {
        return null;
    }
}
