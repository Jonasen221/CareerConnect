import { getKeywordCluster } from './keywordClusters';

const normalise = (kw) => String(kw || '').trim().toLowerCase();

// scoreKeywords(viewer, target) -> number >= 0
//
// Returns a weighted relevance score between a viewer's keyword set (e.g. a
// student's profile keywords) and a target's keyword set (e.g. a job, project,
// or another student).
//
// Weighting (per the F5 spec: "exact match > partial match > category match"):
//   - exact match                  : +3
//   - substring/partial match      : +1
//   - same-cluster (category)      : +0.5
//
// Both inputs are normalised to lowercase and trimmed; non-array inputs are
// treated as empty. Skill/required_skills arrays can safely be passed in as
// fallbacks when `keywords` itself is empty.
export function scoreKeywords(viewerKeywords, targetKeywords) {
  const viewer = Array.isArray(viewerKeywords) ? viewerKeywords.map(normalise).filter(Boolean) : [];
  const target = Array.isArray(targetKeywords) ? targetKeywords.map(normalise).filter(Boolean) : [];
  if (viewer.length === 0 || target.length === 0) return 0;

  const targetSet = new Set(target);
  const targetClusters = new Set(target.map(getKeywordCluster).filter(Boolean));

  let score = 0;
  for (const kw of viewer) {
    if (targetSet.has(kw)) {
      score += 3;
      continue;
    }
    // Partial / substring match (either direction).
    let partial = false;
    for (const t of target) {
      if (t.includes(kw) || kw.includes(t)) { partial = true; break; }
    }
    if (partial) {
      score += 1;
      continue;
    }
    const cluster = getKeywordCluster(kw);
    if (cluster && targetClusters.has(cluster)) {
      score += 0.5;
    }
  }
  return score;
}

// Sort helper: pass an array + functions to extract each side's keywords and
// returns a new array sorted by descending relevance (stable for ties).
export function sortByKeywordRelevance(items, getItemKeywords, viewerKeywords) {
  const decorated = items.map((item, i) => ({
    item,
    i,
    score: scoreKeywords(viewerKeywords, getItemKeywords(item)),
  }));
  decorated.sort((a, b) => (b.score - a.score) || (a.i - b.i));
  return decorated.map(d => d.item);
}
