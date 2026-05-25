declare module 'bcryptjs' {
  export function hash(s: string, salt: string | number): Promise<string>;
  export function hashSync(s: string, salt: string | number): string;
  export function compare(s: string, hash: string): Promise<boolean>;
  export function compareSync(s: string, hash: string): boolean;
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
  export function getRounds(hash: string): number;
  export function getSalt(hash: string): string;
  export function encodeBase64(b: ArrayBuffer | ArrayLike<number>): string;
  export function decodeBase64(s: string): number[];
}
