import jwt, { JwtPayload as LibJwtPayload } from "jsonwebtoken";

export type JwtPayload = { sub: string; email: string };

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

export function signJwt(payload: JwtPayload): string {
  const secret = getSecret();
  return jwt.sign(payload, secret, { expiresIn: "1h" });
}

export function verifyJwt(token: string): JwtPayload {
  const secret = getSecret();

  const decoded = jwt.verify(token, secret);

  
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  const p = decoded as LibJwtPayload & { sub?: unknown; email?: unknown };

  if (typeof p.sub !== "string" || typeof p.email !== "string") {
    throw new Error("Invalid token payload");
  }

  return { sub: p.sub, email: p.email };
}
