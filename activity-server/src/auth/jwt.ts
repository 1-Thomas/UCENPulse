import jwt from "jsonwebtoken";

export type JwtPayload = { sub: string; email: string };

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET is not set");

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, secret, { expiresIn: "1h" });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
