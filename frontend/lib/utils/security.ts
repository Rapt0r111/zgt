export function validateRedirectUrl(url: string | null): string {
  if (!url) return "/dashboard";
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return "/dashboard";
    return parsed.pathname;
  } catch {
    return "/dashboard";
  }
}