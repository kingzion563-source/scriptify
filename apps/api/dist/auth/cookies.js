import { AUTH } from "../config.js";
const COOKIE_OPTS = {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
};
export function setAccessCookie(res, token) {
    res.cookie(AUTH.ACCESS_COOKIE_NAME, token, {
        ...COOKIE_OPTS,
        maxAge: AUTH.ACCESS_TOKEN_EXPIRY_MS,
    });
}
export function setRefreshCookie(res, token) {
    res.cookie(AUTH.REFRESH_COOKIE_NAME, token, {
        ...COOKIE_OPTS,
        maxAge: AUTH.REFRESH_TOKEN_EXPIRY_MS,
    });
}
export function clearAuthCookies(res) {
    res.clearCookie(AUTH.ACCESS_COOKIE_NAME, COOKIE_OPTS);
    res.clearCookie(AUTH.REFRESH_COOKIE_NAME, COOKIE_OPTS);
}
