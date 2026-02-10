/**
 * Validate redirect URL to prevent open redirect attacks
 */
export function validateRedirectUrl(url: string | null): string {
    if (!url) return '/dashboard';
    
    // Only allow relative paths on same origin
    try {
      const parsed = new URL(url, window.location.origin);
      
      // Reject external URLs
      if (parsed.origin !== window.location.origin) {
        console.warn('⚠️  Blocked external redirect:', url);
        return '/dashboard';
      }
      
      return parsed.pathname;
    } catch {
      console.warn('⚠️  Invalid redirect URL:', url);
      return '/dashboard';
    }
  }
  
  /**
   * Sanitize user input to prevent XSS
   */
  export function sanitizeInput(input: string, maxLength: number = 200): string {
    if (!input) return '';
    
    // Remove HTML tags
    const noTags = input.replace(/<[^>]*>/g, '');
    
    // Escape special characters
    const escaped = noTags
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    
    // Limit length
    return escaped.slice(0, maxLength);
  }