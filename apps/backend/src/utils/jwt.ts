import jwt from "jsonwebtoken";

export interface JwtPayload {
  sub: string;
  walletAddress: string;
  role: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "merit-circle-dev-secret-key-32-chars!!";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
