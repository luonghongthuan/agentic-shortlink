import { randomInt } from "node:crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const SLUG_PATTERN = /^[0-9a-zA-Z_-]{3,32}$/;

const RESERVED = new Set(["api", "health"]);

export function generateSlug(length = 7): string {
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += ALPHABET[randomInt(ALPHABET.length)];
  }
  return slug;
}

export function isValidCustomSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED.has(slug.toLowerCase());
}
