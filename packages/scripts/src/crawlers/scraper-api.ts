/**
 * ScraperAPI HTTP client wrapper.
 * Handles request construction, rate limiting, retries, and error handling.
 */

import type { ScraperApiConfig } from "./types.js";

const SCRAPER_API_BASE = "https://api.scraperapi.com";

export interface FetchOptions {
  /** Override render setting for this request */
  render?: boolean;
  /** Override session number for this request */
  sessionNumber?: number;
  /** Request timeout in ms (default: 60000) */
  timeoutMs?: number;
}

export interface FetchResult {
  html: string;
  statusCode: number;
  url: string;
  durationMs: number;
}

export class ScraperApiClient {
  private config: ScraperApiConfig;
  private requestCount = 0;
  private lastRequestAt = 0;
  private minDelayMs: number;

  constructor(config: ScraperApiConfig, minDelayMs = 1000) {
    this.config = config;
    this.minDelayMs = minDelayMs;
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * Fetch a URL through ScraperAPI with automatic retry and rate limiting.
   */
  async fetch(targetUrl: string, options: FetchOptions = {}): Promise<FetchResult> {
    await this.rateLimit();

    const params = new URLSearchParams({
      api_key: this.config.apiKey,
      url: targetUrl,
    });

    if (options.render ?? this.config.render) {
      params.set("render", "true");
    }
    if (this.config.country) {
      params.set("country_code", this.config.country);
    }
    if (this.config.premium) {
      params.set("premium", "true");
    }

    const sessionNum = options.sessionNumber ?? this.config.sessionNumber;
    if (sessionNum !== undefined) {
      params.set("session_number", String(sessionNum));
    }

    const apiUrl = `${SCRAPER_API_BASE}/?${params.toString()}`;
    const timeoutMs = options.timeoutMs ?? 60_000;

    const start = Date.now();
    let lastError: Error | null = null;

    // Retry up to 3 times with exponential backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        });

        clearTimeout(timeout);
        this.requestCount++;
        this.lastRequestAt = Date.now();

        if (response.ok) {
          const html = await response.text();
          return {
            html,
            statusCode: response.status,
            url: targetUrl,
            durationMs: Date.now() - start,
          };
        }

        // ScraperAPI returns 429 for rate limits, 500 for proxy errors
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`ScraperAPI returned ${response.status} for ${targetUrl}`);
          const backoffMs = Math.pow(2, attempt) * 2000;
          await sleep(backoffMs);
          continue;
        }

        // 4xx client errors — don't retry
        return {
          html: "",
          statusCode: response.status,
          url: targetUrl,
          durationMs: Date.now() - start,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < 2) {
          const backoffMs = Math.pow(2, attempt) * 2000;
          await sleep(backoffMs);
        }
      }
    }

    throw lastError ?? new Error(`Failed to fetch ${targetUrl} after 3 attempts`);
  }

  private async rateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.minDelayMs) {
      await sleep(this.minDelayMs - elapsed);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
