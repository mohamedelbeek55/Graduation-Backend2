import jwt from "jsonwebtoken";
import crypto from "crypto";

export function signRefreshToken({ sub, jti }) {
  return jwt.sign({ sub, jti }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "30d"
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newJti() {
  return crypto.randomUUID();
}

export function refreshExpiresAt() {
  // default 30 days
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

export function setRefreshCookie(res, refreshToken) {
  const isProd = process.env.APP_ENV === "production";
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

export function clearRefreshCookie(res) {
  const isProd = process.env.APP_ENV === "production";
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth"
  });
}

export function getRefreshFromReq(req) {
  return req.cookies?.refreshToken || req.body?.refreshToken || null;
}