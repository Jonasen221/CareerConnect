import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { KEYWORD_CLUSTERS } from '@/lib/keywordClusters';

// Chip-style picker for keyword tagging. Reuses the same look as the existing
// skills picker on the profile page. Combines preset cluster suggestions with
// freeform input (Enter to add). Stores keywords as lowercase strings.
//
// Props:
//   value:        string[]  current keywords
//   onChange:     (next: string[]) => void
//   label:        optional section label
//   maxClusters:  show only this many cluster sections at once (default 3,
//                 with a "more" toggle)
//
// The matching algorithm in src/lib/keywordScore.js is case-insensitive, so
// we always normalise to lowercase here.
const normalise = (kw) => String(kw || '').trim().toLowerCase();

export default function KeywordPicker({
  value = [],
  onChange,
  label = 'Keywords',
  description = 'Pick from the suggestions or add your own — these power search and ranking.',
}) {
  const [custom, setCustom] = useState('');
  const [showAllClusters, setShowAllClusters] = useState(false);

  const selected = useMemo(() => new Set((value || []).map(normalise)), [value]);
  const visibleClusters = showAllClusters ? KEYWORD_CLUSTERS : KEYWORD_CLUSTERS.slice(0, 3);

  const toggle = (kw) => {
    const norm = normalise(kw);
    if (!norm) return;
    if (selected.has(norm)) {
      onChange((value || []).filter(v => normalise(v) !== norm));
    } else {
      onChange([...(value || []), norm]);
    }
  };

  const addCustom = () => {
    const norm = normalise(custom);
    if (!norm) return;
    if (!selected.has(norm)) onChange([...(value || []), norm]);
    setCustom('');
  };

  const customSelected = (value || []).filter(v => {
    const norm = normalise(v);
    return !KEYWORD_CLUSTERS.some(c => c.keywords.some(k => normalise(k) === norm));
  });

  return (
    <div>
      {label && (
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
      )}
      {description && (
        <p className="text-xs text-slate-400 mb-3">{description}</p>
      )}

      {customSelected.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-[#3D87AA] uppercase tracking-wider mb-1.5">Your custom keywords</p>
          <div className="flex flex-wrap gap-2">
            {customSelected.map(kw => (
              <button
                key={kw}
                type="button"
                onClick={() => toggle(kw)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#5BA4C4] text-white hover:bg-[#3D87AA] transition-colors"
                title="Remove"
              >
                {kw} ×
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {visibleClusters.map(cluster => (
          <div key={cluster.id}>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{cluster.label}</p>
            <div className="flex flex-wrap gap-2">
              {cluster.keywords.map(kw => {
                const norm = normalise(kw);
                const active = selected.has(norm);
                return (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => toggle(kw)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active ? 'bg-[#5BA4C4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-[#EAF5FB] hover:text-[#3D87AA]'}`}
                  >
                    {kw}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {KEYWORD_CLUSTERS.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAllClusters(v => !v)}
          className="mt-3 text-xs text-[#3D87AA] hover:text-[#2d6d8e] font-semibold"
        >
          {showAllClusters ? 'Show fewer categories' : `Show all ${KEYWORD_CLUSTERS.length} categories`}
        </button>
      )}

      <div className="flex gap-2 mt-4">
        <Input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Add a custom keyword and press Enter..."
          className="h-8 text-sm"
        />
        <button
          type="button"
          onClick={addCustom}
          className="px-3 py-1 bg-slate-100 hover:bg-[#EAF5FB] text-slate-600 hover:text-[#3D87AA] rounded-lg text-sm font-medium transition-all"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
