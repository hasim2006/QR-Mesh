export function shouldProcessFrame(lastTime: number, intervalMs = 50): boolean {
  return performance.now() - lastTime >= intervalMs;
}
