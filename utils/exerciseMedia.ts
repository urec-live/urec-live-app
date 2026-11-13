/** Legacy seed images contain only exercise-name labels, not demonstrations. */
export function exerciseMediaUrl(url: string | null | undefined): string | null {
  if (!url || /(?:via\.placeholder\.com|placehold\.co|dummyimage\.com)/i.test(url)) return null;
  return url;
}
