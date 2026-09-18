export function estimateTransferDuration(totalChunks: number, fps: number): number {
  if (fps <= 0) return 0;
  // Account for ~20% re-scan safety margin for dropped frames
  return Math.ceil((totalChunks / fps) * 1.2);
}
