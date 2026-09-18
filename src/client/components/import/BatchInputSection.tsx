import { useState } from 'react';
import type { QueueItem } from './RowByRowReviewer';
import { parseBatchInput } from '../../lib/parseBatchInput';

interface BatchInputSectionProps {
  onLoadQueue: (items: QueueItem[]) => void;
}

export default function BatchInputSection({ onLoadQueue }: BatchInputSectionProps) {
  const [inputText, setInputText] = useState('');
  const [defaultCategory, setDefaultCategory] = useState<'trans' | 'sluts' | 'twinks'>('sluts');
  const [error, setError] = useState<string | null>(null);

  function parseInput() {
    if (!inputText.trim()) {
      setError('Please paste text, links, or JSON to load characters.');
      return;
    }

    const items = parseBatchInput(inputText, defaultCategory);

    if (items.length === 0) {
      setError('Could not extract characters from input. Check format or examples below.');
      return;
    }

    setError(null);
    onLoadQueue(items);
  }

  function loadSample(type: 'json' | 'pipe' | 'urls') {
    if (type === 'json') {
      setInputText(
        JSON.stringify(
          [
            {
              name: 'Sample Model A',
              category: 'sluts',
              images: [
                'https://picsum.photos/id/1025/600/600',
                'https://picsum.photos/id/1026/600/600',
              ],
            },
            {
              name: 'Sample Model B',
              category: 'trans',
              images: [
                'https://picsum.photos/id/1027/600/600',
              ],
            },
            {
              name: 'Sample Model C',
              category: 'twinks',
              images: [
                'https://picsum.photos/id/1028/600/600',
              ],
            },
          ],
          null,
          2
        )
      );
    } else if (type === 'pipe') {
      setInputText(
        `Alex Rivera | sluts | https://picsum.photos/id/1031/600/600, https://picsum.photos/id/1032/600/600\n` +
        `Jordan Lee | trans | https://picsum.photos/id/1033/600/600\n` +
        `Taylor Cruz | twinks | https://picsum.photos/id/1035/600/600`
      );
    } else {
      setInputText(
        `https://picsum.photos/id/1040/600/600\n` +
        `https://picsum.photos/id/1041/600/600\n` +
        `https://picsum.photos/id/1042/600/600`
      );
    }
  }

  return (
    <div className="rounded-card border border-bg-hover bg-bg-card p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-fg">Batch Importer & Queue Reviewer</h2>
          <p className="text-xs text-fg-muted mt-0.5">
            Paste multiple characters, image URLs, or JSON to review them row-by-row with candidate image trays.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-dim">Default Category:</span>
          <select
            value={defaultCategory}
            onChange={(e) => setDefaultCategory(e.target.value as 'trans' | 'sluts' | 'twinks')}
            className="rounded-button border border-bg-hover bg-bg-muted px-2.5 py-1 text-xs font-semibold text-fg"
          >
            <option value="trans">Trans</option>
            <option value="sluts">Sluts</option>
            <option value="twinks">Twinks</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          rows={7}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Paste your data here...\n\nFormats supported:\n1. Name | Category | ImageURL1, ImageURL2\n2. JSON: [{"name": "...", "category": "sluts", "images": ["url1", "url2"]}]\n3. List of Direct Image URLs`}
          className="w-full rounded-button border border-bg-hover bg-bg-muted p-3 font-mono text-xs text-fg placeholder:text-fg-dim focus:border-category-trans focus:outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-fg-dim">Load sample:</span>
            <button
              type="button"
              onClick={() => loadSample('pipe')}
              className="text-category-trans hover:underline"
            >
              Text (Name | Category | URLs)
            </button>
            <span className="text-fg-dim">&bull;</span>
            <button
              type="button"
              onClick={() => loadSample('json')}
              className="text-category-trans hover:underline"
            >
              JSON Array
            </button>
            <span className="text-fg-dim">&bull;</span>
            <button
              type="button"
              onClick={() => loadSample('urls')}
              className="text-category-trans hover:underline"
            >
              URL List
            </button>
          </div>

          <button
            type="button"
            onClick={parseInput}
            className="rounded-button bg-category-trans hover:opacity-90 px-4 py-2 text-xs font-bold text-white shadow-sm transition-opacity"
          >
            Load into Review Queue &rarr;
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-button bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}
