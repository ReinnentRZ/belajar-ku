/**
 * Strips dangerous HTML / JavaScript injection tags while preserving user formatting.
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return input;
  return input
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove dangerous inline event handlers (e.g. onerror=, onload=, onclick=)
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^>\s]+/gi, '')
    // Remove javascript: pseudo-protocol
    .replace(/javascript\s*:/gi, '')
    .trim();
}
