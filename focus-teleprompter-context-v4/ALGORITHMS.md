# Algorithms

## Smart Chunking
Do not split only by fixed word count.

Priority order:
1. Strong punctuation `. ! ?`
2. Soft punctuation `, : ;`
3. Natural Indonesian conjunction boundaries
4. Semantic phrase boundaries
5. Maximum length fallback

Never split words. Avoid separating short dependent phrases from their meaning.

Suggested pipeline functions:
- normalizeText
- parseParagraphs
- parseSentences
- findNaturalBreakpoints
- createReadingChunks

## Complexity score
Estimate from:
- word count
- average word length
- punctuation density
- long/complex words

The score should affect pacing modestly, not unpredictably.

## Auto-Pacing
`duration = base + punctuation + complexity + emphasis`

Base reading time derives from word count and WPM.

Manual speed multiplier applies after duration calculation and must remain available in every automatic mode.

## Fuzzy matching
Compare transcript only within a local progress window, e.g. previous/current/next 2 chunks.

Signals:
- token overlap
- sequence similarity
- keywords
- current context
- previous context

Never perform aggressive jumps based on low confidence.
