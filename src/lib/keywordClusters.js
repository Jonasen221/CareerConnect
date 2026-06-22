// =============================================================================
// TODO: Replace this seed list with a CMS / JSON-uploaded keyword cluster set.
// =============================================================================
// This is a placeholder so the KeywordPicker UI and the matching algorithm
// have something useful to work with in dev/MVP. The real product taxonomy
// will be uploaded later (likely as a JSON file dropped into /public, or
// fetched from a CMS endpoint), at which point this module should switch to
// reading from that source. Keep the exported shape stable:
//
//   { id: string, label: string, keywords: string[] }[]
//
// Keywords here are stored lowercase for cheap normalisation in
// scoreKeywords(). The picker shows them title-cased for display.
// =============================================================================

export const KEYWORD_CLUSTERS = [
  {
    id: 'tech',
    label: 'Tech & Engineering',
    keywords: [
      'react', 'typescript', 'javascript', 'python', 'node.js', 'go',
      'rust', 'java', 'swift', 'kotlin', 'aws', 'gcp', 'azure',
      'docker', 'kubernetes', 'sql', 'graphql', 'machine learning',
      'data engineering', 'mobile development', 'frontend', 'backend',
      'devops', 'cybersecurity', 'ai',
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Investing',
    keywords: [
      'valuation', 'm&a', 'investment banking', 'equity research',
      'private equity', 'venture capital', 'corporate finance',
      'financial modeling', 'capital markets', 'asset management',
      'trading', 'risk', 'fintech', 'accounting', 'audit', 'tax',
    ],
  },
  {
    id: 'design',
    label: 'Design & Creative',
    keywords: [
      'figma', 'ux', 'ui', 'product design', 'visual design',
      'illustration', 'motion design', 'branding', 'design systems',
      'user research', 'prototyping', 'photography', 'video editing',
    ],
  },
  {
    id: 'business',
    label: 'Business & Strategy',
    keywords: [
      'strategy', 'consulting', 'operations', 'project management',
      'product management', 'business development', 'sales',
      'go-to-market', 'analytics', 'growth', 'partnerships',
      'entrepreneurship',
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing & Communications',
    keywords: [
      'content marketing', 'seo', 'sem', 'social media', 'copywriting',
      'brand marketing', 'performance marketing', 'pr',
      'community management', 'email marketing', 'crm',
    ],
  },
  {
    id: 'science',
    label: 'Science & Research',
    keywords: [
      'biotech', 'chemistry', 'physics', 'biology', 'medicine',
      'clinical research', 'lab work', 'statistics', 'public health',
      'sustainability', 'climate', 'energy',
    ],
  },
];

// Build a quick lookup from a normalised keyword string -> its cluster id.
// Used by scoreKeywords for "same cluster" partial credit.
const KEYWORD_TO_CLUSTER = (() => {
  const map = new Map();
  for (const cluster of KEYWORD_CLUSTERS) {
    for (const kw of cluster.keywords) {
      map.set(kw.toLowerCase(), cluster.id);
    }
  }
  return map;
})();

export const getKeywordCluster = (keyword) =>
  KEYWORD_TO_CLUSTER.get(String(keyword || '').toLowerCase()) || null;

export const ALL_PRESET_KEYWORDS = KEYWORD_CLUSTERS.flatMap(c => c.keywords);
