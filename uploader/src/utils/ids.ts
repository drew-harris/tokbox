export function extractTikTokId(url: string): string | null {
  // Regular expression to match TikTok video IDs
  const regex = /\/video\/(\d+)/;

  try {
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    return null;
  }
}
