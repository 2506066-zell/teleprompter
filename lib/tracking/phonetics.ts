/**
 * Indonesian Phonetic Representation & Similarity Engine
 * Designed for natural speech variations and non-punitive pronunciation awareness.
 */

// Common Indonesian colloquial equivalence pairs (informal vs formal)
const COLLOQUIAL_PAIRS: [string, string][] = [
  ['tidak', 'nggak'],
  ['tidak', 'gak'],
  ['tidak', 'ndak'],
  ['nggak', 'gak'],
  ['sudah', 'udah'],
  ['belum', 'belom'],
  ['pakai', 'pake'],
  ['bagaimana', 'gimana'],
  ['kenapa', 'mengapa'],
  ['saja', 'aja'],
  ['hanya', 'cuma'],
  ['tetapi', 'tapi'],
  ['kalau', 'kalo'],
  ['sampai', 'sampe'],
  ['bisa', 'bisakah'],
  ['apa', 'apakah'],
  ['ini', 'nih'],
  ['itu', 'tuh'],
  ['sedang', 'lagi'],
  ['sangat', 'banget'],
  ['memang', 'emang'],
];

/**
 * Extracts special terminology marked with brackets like [AI], [Supabase], [Neuroscience].
 * Returns clean text for display alongside the extracted important terms.
 */
export function extractImportantWords(text: string): { cleanText: string; importantWords: string[] } {
  const importantWords: string[] = [];
  const regex = /\[(.*?)\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]?.trim()) {
      importantWords.push(match[1].trim());
    }
  }

  // Remove the brackets for clean display reading
  const cleanText = text.replace(/\[(.*?)\]/g, '$1');

  return { cleanText, importantWords };
}

/**
 * Checks whether two words are accepted colloquial or regional equivalents in Indonesian.
 */
export function isColloquialEquivalent(wordA: string, wordB: string): boolean {
  const a = wordA.toLowerCase().trim();
  const b = wordB.toLowerCase().trim();
  if (a === b) return true;

  for (const [formal, informal] of COLLOQUIAL_PAIRS) {
    if ((a === formal && b === informal) || (a === informal && b === formal)) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes Indonesian phonetic representation.
 * Handles common consonant transformations (v/f/p, sy/s, kh/k, z/j, x/ks)
 * and vowel sound reductions without penalizing natural accents.
 */
export function toIndonesianPhonetic(raw: string): string {
  if (!raw) return '';

  let p = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim();

  // 1. Indonesian V/F/P loanword equivalences (e.g. produktivitas / produktifitas, aktif / aktip)
  p = p.replace(/v/g, 'f');
  p = p.replace(/p(?=($|t|k|s|f))/g, 'f'); // syllable codas often alternate p/f in regional ID

  // 2. Digraph reductions
  p = p.replace(/sy/g, 's');
  p = p.replace(/kh/g, 'k');
  p = p.replace(/ng(?=[aeiou])/g, 'ng'); // keep medial ng
  p = p.replace(/ny/g, 'n');

  // 3. Foreign letters in Indonesian speech
  p = p.replace(/x/g, 'ks');
  p = p.replace(/z/g, 'j');

  // 4. Diphthong colloquial collapse (ai -> e, au -> o)
  p = p.replace(/ai(?=($|[^aeiou]))/g, 'e');
  p = p.replace(/au(?=($|[^aeiou]))/g, 'o');

  // 5. Deduplicate adjacent consonants (e.g., gg -> g, ll -> l)
  p = p.replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, '$1');

  // 6. Glottal stop or h at ending often dropped in natural Indonesian speech
  p = p.replace(/h$/g, '');
  p = p.replace(/k$/g, '');

  return p;
}

/**
 * Standard Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Bigram Dice similarity between two strings.
 */
function bigramSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length < 2 || str2.length < 2) return str1 === str2 ? 1.0 : 0.0;

  const getBigrams = (s: string) => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bigram = s.substring(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
    return bigrams;
  };

  const b1 = getBigrams(str1);
  const b2 = getBigrams(str2);

  let intersection = 0;
  b1.forEach((count1, bigram) => {
    if (b2.has(bigram)) {
      intersection += Math.min(count1, b2.get(bigram)!);
    }
  });

  const total = (str1.length - 1) + (str2.length - 1);
  return (2.0 * intersection) / total;
}

/**
 * Compares detected speech word against expected target word using sound/phonetic similarity.
 * Returns a score between 0.0 and 1.0.
 *
 * Examples:
 * - produktivitas vs produktifitas => ~0.95 (phonetically identical)
 * - efektif vs efektip => ~0.95
 * - tidak vs gak => 1.0 (colloquial match)
 * - teknologi vs tekhnologi => 1.0
 */
export function calculatePhoneticSimilarity(detectedWord: string, targetWord: string): number {
  const cleanDetected = detectedWord.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').trim();
  const cleanTarget = targetWord.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').trim();

  if (!cleanDetected || !cleanTarget) return 0;
  if (cleanDetected === cleanTarget) return 1.0;

  // 1. Check colloquial equivalence
  if (isColloquialEquivalent(cleanDetected, cleanTarget)) {
    return 1.0;
  }

  // 2. Phonetic representation transformation
  const phonDetected = toIndonesianPhonetic(cleanDetected);
  const phonTarget = toIndonesianPhonetic(cleanTarget);

  if (phonDetected === phonTarget) {
    return 0.96;
  }

  // 3. Levenshtein distance on phonetic representations
  const maxLen = Math.max(phonDetected.length, phonTarget.length, 1);
  const dist = levenshteinDistance(phonDetected, phonTarget);
  const levScore = Math.max(0, 1.0 - dist / maxLen);

  // 4. Character Bigram Dice similarity
  const diceScore = bigramSimilarity(phonDetected, phonTarget);

  // Weighted harmonic combination
  const combined = levScore * 0.6 + diceScore * 0.4;
  return Number(Math.min(1.0, Math.max(0.0, combined)).toFixed(3));
}
