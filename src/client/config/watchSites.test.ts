import { describe, it, expect } from 'vitest';
import { WATCH_SITES, slugifySxyprn, cleanSearchTitle } from './watchSites';

describe('watchSites configuration and URL builders', () => {
  it('contains exactly the 7 requested streaming sites', () => {
    expect(WATCH_SITES).toHaveLength(7);
    const ids = WATCH_SITES.map((s) => s.id);
    expect(ids).toEqual([
      'porneec',
      'yourdailypornvideos',
      'fullporner',
      'trendyporn',
      'porn4days',
      'xmoviesforyou',
      'sxyprn',
    ]);
  });

  it('builds valid Porneec search URL', () => {
    const site = WATCH_SITES.find((s) => s.id === 'porneec')!;
    expect(site.buildSearchUrl('Angela White Big Movie')).toBe(
      'https://porneec.com/?s=Angela%20White%20Big%20Movie'
    );
  });

  it('builds valid YourDailyPornVideos search URL', () => {
    const site = WATCH_SITES.find((s) => s.id === 'yourdailypornvideos')!;
    expect(site.buildSearchUrl('Secret Desires')).toBe(
      'https://yourdailypornvideos.ws/?s=Secret%20Desires'
    );
  });

  it('builds valid FullPorner search URL', () => {
    const site = WATCH_SITES.find((s) => s.id === 'fullporner')!;
    expect(site.buildSearchUrl('Wild Nights')).toBe(
      'https://fullporner.com/search?q=Wild%20Nights'
    );
  });

  it('builds valid TrendyPorn search URL', () => {
    const site = WATCH_SITES.find((s) => s.id === 'trendyporn')!;
    expect(site.buildSearchUrl('Eva Elfie Passion')).toBe(
      'https://www.trendyporn.com/searchgate.php?search=Eva%20Elfie%20Passion'
    );
  });

  it('builds valid Porn4Days search URL', () => {
    const site = WATCH_SITES.find((s) => s.id === 'porn4days')!;
    expect(site.buildSearchUrl('Summer Heat')).toBe(
      'https://porn4days.pw/search/?s=Summer%20Heat'
    );
  });

  it('builds valid XMoviesForYou search URL', () => {
    const site = WATCH_SITES.find((s) => s.id === 'xmoviesforyou')!;
    expect(site.buildSearchUrl('Dangerous Curves')).toBe(
      'https://xmoviesforyou.com/search?q=Dangerous%20Curves'
    );
  });

  it('builds valid SxyPrn search URL with custom slugification', () => {
    const site = WATCH_SITES.find((s) => s.id === 'sxyprn')!;
    expect(site.buildSearchUrl('Angela White & Friends #1!')).toBe(
      'https://sxyprn.com/Angela-White-Friends-1.html'
    );
  });
});

describe('slugifySxyprn', () => {
  it('replaces punctuation and multiple spaces with a single hyphen', () => {
    expect(slugifySxyprn('  Hello   World: Part 2! ')).toBe('Hello-World-Part-2');
  });

  it('falls back to default if string is entirely stripped', () => {
    expect(slugifySxyprn('!@#$%^&*()')).toBe('video');
  });
});

describe('cleanSearchTitle', () => {
  it('removes leading "Scene 1 -" prefixes', () => {
    expect(cleanSearchTitle('Scene 1 - Beautiful Encounter')).toBe('Beautiful Encounter');
    expect(cleanSearchTitle('Scene 4: Midnight Lovers')).toBe('Midnight Lovers');
  });

  it('leaves standard movie titles intact', () => {
    expect(cleanSearchTitle('In the Shadow of Love')).toBe('In the Shadow of Love');
  });
});
