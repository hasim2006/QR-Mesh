export async function checkCameraPermissions(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch {
    return false;
  }
}
