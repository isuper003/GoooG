import { describe, it, expect } from 'vitest';
import { extractClipCodes, fetchRandomRewardClip } from '../lib/rewardClipScraper';

describe('rewardClipScraper', () => {
  describe('extractClipCodes', () => {
    it('extracts unique clip codes from xgif.cc HTML cards', () => {
      const sampleHtml = `
        <div class="cards">
          <div class="card">
            <a href="/gif/fondshadowybellfrog/"><img src="https://thumbs2.redgifs.com/FondShadowyBellfrog-mobile.jpg" class="cardimg" alt="Angela White" /></a>
            <p class="cardtxt">Angela White</p>
          </div>
          <div class="card">
            <a href="/gif/repentantpoisedibis/"><img src="/preview/?code=RepentantPoisedIbis" class="cardimg" alt="Angela White" /></a>
            <p class="cardtxt">Angela White</p>
          </div>
          <div class="card">
            <a href="/gif/vainnearblacklab/"><img src="/preview/?code=VainNearBlacklab" class="cardimg" alt="Angela White" /></a>
            <p class="cardtxt">Angela White</p>
          </div>
        </div>
      `;

      const codes = extractClipCodes(sampleHtml);
      expect(codes).toHaveLength(3);
      expect(codes).toContain('FondShadowyBellfrog');
      expect(codes).toContain('RepentantPoisedIbis');
      expect(codes).toContain('VainNearBlacklab');
    });

    it('deduplicates codes case-insensitively and preserves PascalCase', () => {
      const sampleHtml = `
        <div class="card">
          <a href="/gif/harmoniousimportantanhinga/"><img src="/preview/?code=HarmoniousImportantAnhinga" /></a>
        </div>
        <div class="card">
          <a href="/gif/harmoniousimportantanhinga/">link</a>
        </div>
      `;

      const codes = extractClipCodes(sampleHtml);
      expect(codes).toHaveLength(1);
      expect(codes[0]).toBe('HarmoniousImportantAnhinga');
    });

    it('returns empty array when HTML is empty or contains no codes', () => {
      expect(extractClipCodes('')).toEqual([]);
      expect(extractClipCodes('<div>No results found for query</div>')).toEqual([]);
    });
  });

  describe('fetchRandomRewardClip validation', () => {
    it('returns ok: false when query is empty', async () => {
      const result = await fetchRandomRewardClip('   ');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('required');
    });
  });
});
