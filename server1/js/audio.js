// Utility helpers for working with audio data returned by the AI server

/**
 * Converts a base64-encoded WAV string into a Blob URL playable by HTMLAudioElement.
 * Returns an object containing both the Blob and the generated object URL so callers
 * can revoke it once playback is complete.
 */
export function base64WavToObjectUrl(base64Audio) {
  if (!base64Audio) {
    throw new Error('No audio data received from synthesis service.');
  }

  const byteCharacters = atob(base64Audio);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'audio/wav' });
  const objectUrl = URL.createObjectURL(blob);

  return { blob, objectUrl };
}
