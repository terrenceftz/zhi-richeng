import { clsx, type ClassValue } from 'clsx';

/** 合并 className，过滤 falsy 值 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
