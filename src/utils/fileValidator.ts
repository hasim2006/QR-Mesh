export function isValidFileSize(bytes: number, maxBytes = 500000): boolean {
  return bytes > 0 && bytes <= maxBytes;
}
