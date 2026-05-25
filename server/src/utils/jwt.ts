import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
}

const accessTokenOptions: SignOptions = { expiresIn: config.jwt.accessExpiresIn as SignOptions['expiresIn'] };
const refreshTokenOptions: SignOptions = { expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'] };

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, accessTokenOptions);
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, refreshTokenOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
}
