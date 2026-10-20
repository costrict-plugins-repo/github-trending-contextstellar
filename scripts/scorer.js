#!/usr/bin/env node
/**
 * ContextStellar Local Scorer
 *
 * Standalone scorer that runs without any API key or network.
 * Same algorithm as chrome-extension/lib/scorer.js and src/lib/scoring/prompt-scorer.ts.
 *
 * Usage: echo '{"content":"your prompt"}' | node scorer.js
 * Input: JSON with "content" field on stdin
 * Output: JSON with score, grade, breakdown, tips
 */

'use strict';

// ── Token estimation ──
function countTokens(text) {
  if (!text || text.length === 0) return 0;
  const segments = text.match(/\w+|[^\w\s]+|\s+/g) || [];
  let tokens = 0;
  for (const seg of segments) {
    if (/^\s+$/.test(seg)) {
      tokens += (seg.match(/\n/g) || []).length || 1;
    } else if (/^\w+$/.test(seg)) {
      tokens += seg.length <= 4 ? 1 : Math.ceil(seg.length / 4);
    } else {
      tokens += seg.length;
    }
  }
  return tokens;
}

// ── Waste patterns ──
const WASTE_PATTERNS = [
  /\b(please|thank you|thanks|kindly)\b/gi,
  /\b(I would like you to|could you|can you|would you|will you)\b/gi,
  /\b(very|really|extremely|quite|rather|absolutely)\b/gi,
  /\b(feel free to|don't hesitate to|if you don't mind)\b/gi,
  /\b(as (I |you )?mentioned|like I said|as stated|as noted)\b/gi,
  /\b(in my opinion|I think|I believe)\b/gi,
  /\b(Hi there!?|Hello there!?|Hey there!?)\b/gi,
  /(?<![a-zA-Z])\b(just|simply)\b(?![a-zA-Z])/gi,
  /!{2,}/g,
];

const CACHE_HOSTILE_PATTERNS = {
  timestamp: /\b\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}/g,
  dateRef: /\b(today is|current date|as of today|right now it is)\b/gi,
  uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  sessionId: /\b(session|request|trace|correlation)[\s_-]?(id|ID):\s*\S{8,}\b/gi,
};

const WEIGHTS = {
  tokenUtilization: 0.25,
  contentDensity: 0.17,
  structuralClarity: 0.23,
  specificity: 0.20,
  cacheFriendliness: 0.15,
};

// ── Scoring dimensions ──

function scoreTokenUtilization(text) {
  if (!text) return 100;
  let wasteTokens = 0;
  for (const pattern of WASTE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) wasteTokens += countTokens(m);
    }
  }
  const total = countTokens(text);
  if (total === 0) return 100;
  const wasteRatio = wasteTokens / total;
  return Math.round(Math.max(0, (1 - Math.pow(wasteRatio, 0.6) * 2) * 100));
}

function scoreContentDensity(text) {
  if (!text) return 100;
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 100;
  const ngrams = new Map();
  for (let i = 0; i <= words.length - 3; i++) {
    const ngram = words.slice(i, i + 3).join(' ');
    ngrams.set(ngram, (ngrams.get(ngram) || 0) + 1);
  }
  let repeats = 0;
  for (const count of ngrams.values()) {
    if (count > 1) repeats += count - 1;
  }
  const uniqueWords = new Set(words);
  const lexicalDiversity = uniqueWords.size / words.length;
  const ngramPenalty = Math.min(repeats / Math.max(words.length / 3, 1), 0.5);
  const density = lexicalDiversity * 0.6 + (1 - ngramPenalty) * 0.4;
  return Math.round(Math.max(0, Math.min(100, density * 100)));
}

function scoreStructuralClarity(text) {
  if (!text) return 40;
  let score = 40;
  if (/<\w+>/.test(text)) score += 15;
  if (/^\s*\d+[.)]\s/m.test(text)) score += 10;
  if (/^\s*[-*]\s/m.test(text)) score += 10;
  if (/^#+\s/m.test(text) || /^[A-Z][A-Z\s]+:$/m.test(text)) score += 10;
  if (/```/.test(text)) score += 15;
  if (/\b(must|ensure|require|constraint)\b/i.test(text)) score += 5;
  if (text.length > 200 && !text.includes('\n')) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function scoreSpecificity(text) {
  if (!text) return 50;
  let score = 40;
  if (/\b\d+\b/.test(text)) score += 10;
  if (/\b(json|csv|xml|yaml|markdown|table|list|code)\b/i.test(text)) score += 10;
  if (/\b(act as|you are|expert|specialist)\b/i.test(text)) score += 10;
  if (/\b(example|e\.g\.|for instance|such as)\b/i.test(text)) score += 10;
  if (/\b(don't|do not|avoid|never|exclude)\b/i.test(text)) score += 5;
  if (/\b(\d+\s*words?|\d+\s*sentences?|\d+\s*paragraphs?|brief|concise|detailed)\b/i.test(text)) score += 10;
  const vagueMatches = text.match(/\b(something|stuff|things|etc|whatever|somehow)\b/gi);
  if (vagueMatches) score -= Math.min(vagueMatches.length * 5, 20);
  return Math.max(0, Math.min(100, score));
}

function scoreCacheFriendliness(text) {
  if (!text) return 80;
  let score = 80;
  const timestamps = (text.match(CACHE_HOSTILE_PATTERNS.timestamp) || []).length;
  const dateRefs = (text.match(CACHE_HOSTILE_PATTERNS.dateRef) || []).length;
  const uuids = (text.match(CACHE_HOSTILE_PATTERNS.uuid) || []).length;
  const sessionIds = (text.match(CACHE_HOSTILE_PATTERNS.sessionId) || []).length;
  CACHE_HOSTILE_PATTERNS.timestamp.lastIndex = 0;
  CACHE_HOSTILE_PATTERNS.dateRef.lastIndex = 0;
  CACHE_HOSTILE_PATTERNS.uuid.lastIndex = 0;
  CACHE_HOSTILE_PATTERNS.sessionId.lastIndex = 0;
  score -= timestamps * 10;
  score -= dateRefs * 5;
  score -= uuids * 15;
  score -= sessionIds * 10;
  const quarterLen = Math.floor(text.length / 4);
  if (quarterLen > 0) {
    const firstQuarter = text.substring(0, quarterLen);
    const hasVolatileEarly =
      CACHE_HOSTILE_PATTERNS.timestamp.test(firstQuarter) ||
      CACHE_HOSTILE_PATTERNS.uuid.test(firstQuarter) ||
      CACHE_HOSTILE_PATTERNS.sessionId.test(firstQuarter);
    CACHE_HOSTILE_PATTERNS.timestamp.lastIndex = 0;
    CACHE_HOSTILE_PATTERNS.uuid.lastIndex = 0;
    CACHE_HOSTILE_PATTERNS.sessionId.lastIndex = 0;
    if (hasVolatileEarly) score -= 10;
  }
  if (/<\w+>/.test(text)) score += 10;
  if (/^\s*(#{1,3}\s|[A-Z][A-Z\s]+:)/m.test(text)) score += 5;
  return Math.max(0, Math.min(100, score));
}

function scoreToGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function generateTips(breakdown, text) {
  const tips = [];
  if (breakdown.cacheFriendliness < 70) tips.push('Cache-hostile patterns detected (dates, IDs). Move volatile data to the end.');
  if (breakdown.tokenUtilization < 70) tips.push('Remove filler words like "please", "just", "could you" — LLMs don\'t need them.');
  if (breakdown.contentDensity < 70) tips.push('Reduce repetition. Restate key points once, clearly.');
  if (breakdown.structuralClarity < 60) tips.push('Add structure: use XML tags, numbered lists, or clear sections.');
  if (breakdown.specificity < 60) tips.push('Be more specific: mention exact format, length, or examples.');
  if (text.length > 200 && !text.includes('\n')) tips.push('Break long prompts into paragraphs or sections.');
  if (tips.length === 0) tips.push('Solid prompt! Consider adding examples or constraints to push it further.');
  return tips.slice(0, 3);
}

// ── Main scoring function ──

function scorePrompt(text) {
  if (!text || text.trim().length === 0) {
    return { score: 0, breakdown: { tokenUtilization: 0, contentDensity: 0, structuralClarity: 0, specificity: 0, cacheFriendliness: 0 }, grade: 'F', tips: [], tokenCount: 0 };
  }
  const breakdown = {
    tokenUtilization: scoreTokenUtilization(text),
    contentDensity: scoreContentDensity(text),
    structuralClarity: scoreStructuralClarity(text),
    specificity: scoreSpecificity(text),
    cacheFriendliness: scoreCacheFriendliness(text),
  };
  const score = Math.round(
    breakdown.tokenUtilization * WEIGHTS.tokenUtilization +
    breakdown.contentDensity * WEIGHTS.contentDensity +
    breakdown.structuralClarity * WEIGHTS.structuralClarity +
    breakdown.specificity * WEIGHTS.specificity +
    breakdown.cacheFriendliness * WEIGHTS.cacheFriendliness
  );
  return { score, breakdown, grade: scoreToGrade(score), tips: generateTips(breakdown, text), tokenCount: countTokens(text) };
}

// ── Extract prompt text from tool input ──

function extractPromptText(toolInput) {
  if (!toolInput) return '';
  // Check common fields in order of specificity
  for (const field of ['command', 'content', 'new_string', 'prompt']) {
    if (typeof toolInput[field] === 'string' && toolInput[field].length > 0) {
      return toolInput[field];
    }
  }
  // Fallback: find the longest string value
  let longest = '';
  for (const val of Object.values(toolInput)) {
    if (typeof val === 'string' && val.length > longest.length) {
      longest = val;
    }
  }
  return longest;
}

// ── CLI entry point ──

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const text = input.content || extractPromptText(input.tool_input || input.toolInput || {});
    if (!text) {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      return;
    }
    const result = scorePrompt(text);
    // Format as hook response with additionalContext
    const context = `[ContextStellar] Score: ${result.score}/100 (${result.grade}) | Tokens: ~${result.tokenCount}\n` +
      `  Token Util: ${result.breakdown.tokenUtilization} | Structure: ${result.breakdown.structuralClarity} | ` +
      `Specificity: ${result.breakdown.specificity} | Density: ${result.breakdown.contentDensity} | ` +
      `Cache: ${result.breakdown.cacheFriendliness}\n` +
      (result.tips.length > 0 ? `  Tips: ${result.tips.join(' | ')}` : '');
    process.stdout.write(JSON.stringify({
      decision: 'allow',
      additionalContext: context,
    }));
  } catch {
    // On any error, allow the tool use without scoring
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  }
});
