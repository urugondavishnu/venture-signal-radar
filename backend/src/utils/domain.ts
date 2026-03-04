/**
 * Extract clean domain from a URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

/**
 * Ensure URL has protocol prefix
 */
export function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

/**
 * Extract company name from page title or domain
 */
export function extractCompanyName(pageTitle: string | undefined, domain: string): string {
  if (pageTitle) {
    // Common patterns: "Company Name - Tagline", "Company Name | Product"
    const separators = [' - ', ' | ', ' — ', ' · ', ' :: '];
    for (const sep of separators) {
      if (pageTitle.includes(sep)) {
        return pageTitle.split(sep)[0].trim();
      }
    }
    // If title is short enough, use it directly
    if (pageTitle.length <= 40) {
      return pageTitle.trim();
    }
  }
  // Fallback: capitalize domain name
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}
