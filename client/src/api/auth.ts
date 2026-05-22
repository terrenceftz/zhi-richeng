import client from './client';
import type { AuthResponse } from '../types';

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const { data } = await client.post('/auth/register', { email, password, name });
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await client.post('/auth/login', { email, password });
  return data;
}

export async function refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { data } = await client.post('/auth/refresh', { refreshToken: token });
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await client.post('/auth/logout', { refreshToken });
}
