export const INDONESIAN_CONJUNCTIONS = [
  'dan',
  'tetapi',
  'namun',
  'karena',
  'sehingga',
  'bahwa',
  'jika',
  'ketika',
  'untuk',
  'melainkan',
  'sedangkan',
  'walaupun',
  'meskipun',
  'padahal',
  'agar',
  'supaya',
  'sebab',
  'maka',
  'lalu',
  'kemudian',
  'serta',
  'oleh karena itu',
  'selain itu',
  'di sisi lain',
];

export const ENGLISH_CONJUNCTIONS = [
  'and',
  'but',
  'however',
  'because',
  'although',
  'therefore',
  'while',
  'since',
  'whereas',
  'furthermore',
  'moreover',
  'so that',
];

export const CHUNK_WORD_LIMITS = {
  portrait: {
    idealMin: 5,
    idealMax: 12,
    hardMax: 16,
  },
  landscape: {
    idealMin: 7,
    idealMax: 16,
    hardMax: 22,
  },
} as const;

export const PAUSE_DURATIONS = {
  sentenceEnd: 0.5, // seconds for . ! ?
  clauseBreak: 0.25, // seconds for , : ; -
  paragraphEnd: 0.8, // seconds between major paragraphs
} as const;
