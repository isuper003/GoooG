export interface RewardClipResult {
  ok: boolean;
  code?: string;
  embedUrl?: string;
  previewUrl?: string;
  pool?: string[];
  error?: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Extracts unique RedGIFs clip IDs from xgif.cc HTML.
 * Preserves PascalCase formatting when available from preview/CDN links.
 */
export function extractClipCodes(html: string): string[] {
  if (!html) return [];

  const foundCodes = new Map<string, string>(); // lowerKey -> bestDisplayCasedCode

  // Pattern 1: /preview/?code=PascalCaseCode
  const previewRegex = /preview\/\?code=([a-zA-Z0-9]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = previewRegex.exec(html)) !== null) {
    const code = m[1];
    if (code && code.length > 3) {
      const lower = code.toLowerCase();
      if (!foundCodes.has(lower) || code !== lower) {
        foundCodes.set(lower, code);
      }
    }
  }

  // Pattern 2: redgifs.com/{Code}-mobile
  const cdnRegex = /redgifs\.com\/([a-zA-Z0-9]+)(?:-mobile|-poster|\.jpg|\.mp4)/gi;
  while ((m = cdnRegex.exec(html)) !== null) {
    const code = m[1];
    if (code && code.length > 3) {
      const lower = code.toLowerCase();
      if (!foundCodes.has(lower) || code !== lower) {
        foundCodes.set(lower, code);
      }
    }
  }

  // Pattern 3: /gif/{code}/ links
  const linkRegex = /href=["']\/gif\/([a-zA-Z0-9_-]+)\/["']/gi;
  while ((m = linkRegex.exec(html)) !== null) {
    const code = m[1];
    if (code && code.length > 3) {
      const lower = code.toLowerCase();
      if (!foundCodes.has(lower)) {
        foundCodes.set(lower, code);
      }
    }
  }

  return Array.from(foundCodes.values());
}

/**
 * Fetches search results from xgif.cc for a performer name,
 * and picks a random clip code from the pool (excluding excludeCode if given).
 */
export async function fetchRandomRewardClip(
  query: string,
  excludeCode?: string,
  timeoutMs = 5000
): Promise<RewardClipResult> {
  const cleanName = query.trim();
  if (!cleanName) {
    return { ok: false, error: 'Query parameter is required' };
  }

  const searchUrl = `https://www.xgif.cc/search/?q=${encodeURIComponent(cleanName)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return { ok: false, error: `Upstream HTTP ${response.status}` };
    }

    const html = await response.text();
    const allCodes = extractClipCodes(html);

    if (allCodes.length === 0) {
      return { ok: false, error: 'No clips found for this performer' };
    }

    // Filter out the excluded code (if there are other alternatives)
    let candidatePool = allCodes;
    if (excludeCode) {
      const lowerExclude = excludeCode.toLowerCase();
      const filtered = allCodes.filter((c) => c.toLowerCase() !== lowerExclude);
      if (filtered.length > 0) {
        candidatePool = filtered;
      }
    }

    // Pick random code from candidate pool
    const selectedCode = candidatePool[Math.floor(Math.random() * candidatePool.length)];

    return {
      ok: true,
      code: selectedCode,
      embedUrl: `https://redgifs.com/ifr/${selectedCode}?autoplay=1&muted=1`,
      previewUrl: `https://www.xgif.cc/preview/?code=${selectedCode}`,
      pool: allCodes,
    };
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error &&
      (err.name === 'AbortError' || err.message.toLowerCase().includes('timeout'));
    return {
      ok: false,
      error: isTimeout ? 'Request timed out' : err instanceof Error ? err.message : 'Fetch failed',
    };
  }
}
