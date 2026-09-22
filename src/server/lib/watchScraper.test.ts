import { describe, it, expect } from 'vitest';
import {
  parsePorneec,
  parseYourDailyPornVideos,
  parseFullPorner,
  parseTrendyPorn,
  parsePorn4Days,
  parseXMoviesForYou,
  parseSxyPrn,
  scrapeAllWatchSites,
} from './watchScraper';

describe('watchScraper Parsers', () => {
  describe('parsePorneec', () => {
    it('parses porneec video preview items and caps at 3', () => {
      const sampleItem = (idx: number) => `
        <article class="col-6 col-sm-4 col-md-3 video-preview-item">
          <a href="/video/scene-${idx}/" title="Angela White Scene ${idx}">
            <img src="/thumb-preview.jpg" data-main-thumb="https://porneec.com/thumbs/${idx}.jpg" alt="Angela White Scene ${idx}" />
          </a>
          <span class="duration">15:20</span>
        </article>
      `;
      const html = `<div>${sampleItem(1)}${sampleItem(2)}${sampleItem(3)}${sampleItem(4)}${sampleItem(5)}</div>`;

      const results = parsePorneec(html);
      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Angela White Scene 1');
      expect(results[0].url).toBe('https://porneec.com/video/scene-1/');
      expect(results[0].thumbUrl).toBe('https://porneec.com/thumbs/1.jpg');
      expect(results[0].duration).toBe('15:20');
      expect(results[0].siteId).toBe('porneec');
    });

    it('returns empty array on empty HTML', () => {
      expect(parsePorneec('')).toEqual([]);
      expect(parsePorneec('<div>No results found</div>')).toEqual([]);
    });
  });

  describe('parseYourDailyPornVideos', () => {
    it('parses td_module_wrap items and caps at 3', () => {
      const sampleItem = (idx: number) => `
        <div class="td_module_wrap td_module_10">
          <div class="td-module-thumb">
            <a href="https://yourdailypornvideos.ws/video-${idx}/" rel="bookmark" title="Hot Movie Part ${idx}">
              <img class="entry-thumb" src="" data-img-url="https://yourdailypornvideos.ws/img/poster${idx}.jpg" />
            </a>
          </div>
          <h3 class="entry-title td-module-title">
            <a href="https://yourdailypornvideos.ws/video-${idx}/" rel="bookmark" title="Hot Movie Part ${idx}">Hot Movie Part ${idx}</a>
          </h3>
          <span class="video-duration">22:10</span>
        </div>
      `;
      const html = `<div>${sampleItem(1)}${sampleItem(2)}${sampleItem(3)}${sampleItem(4)}</div>`;

      const results = parseYourDailyPornVideos(html);
      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Hot Movie Part 1');
      expect(results[0].url).toBe('https://yourdailypornvideos.ws/video-1/');
      expect(results[0].thumbUrl).toBe('https://yourdailypornvideos.ws/img/poster1.jpg');
      expect(results[0].duration).toBe('22:10');
      expect(results[0].siteId).toBe('yourdailypornvideos');
    });
  });

  describe('parseFullPorner', () => {
    it('parses fullporner video cards and caps at 3', () => {
      const sampleItem = (idx: number) => `
        <div class="video-card">
          <a href="/watch/angela-white-${idx}">
            <img data-src="https://fullporner.com/media/preview-${idx}.jpg" alt="Angela White Special ${idx}">
          </a>
          <span class="time">35:40</span>
          <a href="/watch/angela-white-${idx}" class="title">Angela White Special ${idx}</a>
        </div>
      `;
      const html = `<div>${sampleItem(1)}${sampleItem(2)}${sampleItem(3)}${sampleItem(4)}</div>`;

      const results = parseFullPorner(html);
      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Angela White Special 1');
      expect(results[0].url).toBe('https://fullporner.com/watch/angela-white-1');
      expect(results[0].thumbUrl).toBe('https://fullporner.com/media/preview-1.jpg');
      expect(results[0].duration).toBe('35:40');
      expect(results[0].siteId).toBe('fullporner');
    });
  });

  describe('parseTrendyPorn', () => {
    it('parses trendyporn video links and caps at 3', () => {
      const sampleItem = (idx: number) => `
        <div class="item">
          <a href="/video/angela-white-scene-${idx}.html" title="Angela White Big Scene ${idx}">
            <img data-original="https://cdn.trendyporn.com/thumbs/${idx}.jpg" alt="Thumb ${idx}" />
            <span class="duration">18:05</span>
          </a>
        </div>
      `;
      const html = `<div>${sampleItem(1)}${sampleItem(2)}${sampleItem(3)}${sampleItem(4)}</div>`;

      const results = parseTrendyPorn(html);
      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Angela White Big Scene 1');
      expect(results[0].url).toBe('https://www.trendyporn.com/video/angela-white-scene-1.html');
      expect(results[0].thumbUrl).toBe('https://cdn.trendyporn.com/thumbs/1.jpg');
      expect(results[0].duration).toBe('18:05');
      expect(results[0].siteId).toBe('trendyporn');
    });
  });

  describe('parsePorn4Days', () => {
    it('parses porn4days items and caps at 3', () => {
      const sampleItem = (idx: number) => `
        <article class="post">
          <a href="https://porn4days.pw/video-clip-${idx}/" title="Exclusive Angela Scene ${idx}">
            <img data-src="https://porn4days.pw/wp-content/uploads/thumb-${idx}.jpg" />
            <span class="duration">12:30</span>
          </a>
        </article>
      `;
      const html = `<div>${sampleItem(1)}${sampleItem(2)}${sampleItem(3)}${sampleItem(4)}</div>`;

      const results = parsePorn4Days(html);
      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Exclusive Angela Scene 1');
      expect(results[0].url).toBe('https://porn4days.pw/video-clip-1/');
      expect(results[0].thumbUrl).toBe('https://porn4days.pw/wp-content/uploads/thumb-1.jpg');
      expect(results[0].duration).toBe('12:30');
      expect(results[0].siteId).toBe('porn4days');
    });
  });

  describe('parseXMoviesForYou', () => {
    it('parses xmoviesforyou video items and caps at 3', () => {
      const sampleItem = (idx: number) => `
        <div class="video-preview">
          <a href="/video/angela-feature-${idx}" class="group flex flex-col">
            <img src="https://xmoviesforyou.com/posters/${idx}.webp" alt="Angela Feature ${idx}" />
            <span class="duration">42:15</span>
            <h3 class="text-sm">Angela Feature ${idx}</h3>
          </a>
        </div>
      `;
      const html = `<div>${sampleItem(1)}${sampleItem(2)}${sampleItem(3)}${sampleItem(4)}</div>`;

      const results = parseXMoviesForYou(html);
      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Angela Feature 1');
      expect(results[0].url).toBe('https://xmoviesforyou.com/video/angela-feature-1');
      expect(results[0].thumbUrl).toBe('https://xmoviesforyou.com/posters/1.webp');
      expect(results[0].duration).toBe('42:15');
      expect(results[0].siteId).toBe('xmoviesforyou');
    });
  });

  describe('parseSxyPrn', () => {
    it('parses sxyprn post elements and caps at 3', () => {
      const sampleItem = (idx: number) => `
        <div class="post_el_small">
          <a href="/post/angela-white-show-${idx}.html">
            <img data-src="https://sxyprn.com/cdn/post-${idx}.jpg" alt="Poster ${idx}" />
          </a>
          <span class="duration_small">28:00</span>
          <div class="post_text">
            <a href="/post/angela-white-show-${idx}.html">Angela White Show Episode ${idx}</a>
          </div>
        </div>
      `;
      const html = `<div>${sampleItem(1)}${sampleItem(2)}${sampleItem(3)}${sampleItem(4)}</div>`;

      const results = parseSxyPrn(html);
      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Angela White Show Episode 1');
      expect(results[0].url).toBe('https://sxyprn.com/post/angela-white-show-1.html');
      expect(results[0].thumbUrl).toBe('https://sxyprn.com/cdn/post-1.jpg');
      expect(results[0].duration).toBe('28:00');
      expect(results[0].siteId).toBe('sxyprn');
    });
  });

  describe('scrapeAllWatchSites empty query', () => {
    it('returns empty result when query is blank', async () => {
      const res = await scrapeAllWatchSites('   ');
      expect(res.totalFound).toBe(0);
      expect(res.videos).toEqual([]);
      expect(res.siteStatuses).toHaveLength(7);
      expect(res.siteStatuses.every((s) => s.status === 'empty')).toBe(true);
    });
  });
});
