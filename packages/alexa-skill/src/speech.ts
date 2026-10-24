/**
 * Turn agent / report text into something Alexa can speak cleanly.
 *
 * Alexa's TTS mangles markdown, emoji, code, and stray symbols, and long
 * paragraphs are unlistenable on a speaker. This strips the noise, normalises
 * a few common symbols to words, collapses whitespace, and truncates to a
 * voice-friendly length.
 */

const MAX_SPEECH_CHARS = 700;

/** Replace symbols that TTS reads badly (or drops) with spoken words. */
const SYMBOL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/%/g, ' percent'],
  [/\bms\b/g, ' milliseconds'],
  [/\bms(?=[,.)\s]|$)/g, ' milliseconds'],
  [/&/g, ' and '],
  [/@/g, ' at '],
  [/#(\w+)/g, '$1'],
  [/`/g, ''],
  [/\*\*?/g, ''],
  [/_/g, ' '],
  [/~~/g, ''],
  [/={2,}/g, ' '],
  [/>/g, ' '],
];

/** Emojis and pictographs - TTS skips or garbles these. */
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu;

/** Collapse a long dashed/bulleted list into a spoken sentence or two. */
function flattenBullets(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const bulletLines = lines.filter((l) => /^[-*•]\s+/.test(l));
  // If there are only a couple of list items, keep them; otherwise summarise.
  if (bulletLines.length > 0 && bulletLines.length <= 4) {
    const items = bulletLines.map((l) => l.replace(/^[-*•]\s+/, ''));
    return lines
      .filter((l) => !/^[-*•]\s+/.test(l))
      .concat(items.join('. '))
      .join('. ');
  }
  return text;
}

/** Strip markdown headers/section rules that add nothing spoken. */
function stripMarkdownChrome(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[=\-]{3,}\s*$/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1');
}

/**
 * Main entry: reduce arbitrary text to a short, speakable sentence block.
 */
export function toSpeech(raw: string): string {
  if (!raw) return "Sorry, I didn't get a result.";
  let text = String(raw);

  text = stripMarkdownChrome(text);
  text = flattenBullets(text);
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'); // links -> label
  text = text.replace(/```[\s\S]*?```/g, ' '); // drop code blocks
  for (const [re, rep] of SYMBOL_REPLACEMENTS) text = text.replace(re, rep);
  text = text.replace(EMOJI, '');
  text = text.replace(/\s+/g, ' ').trim();
  // Remove dangling punctuation left by stripping (", ", " -", trailing ":").
  text = text.replace(/\s*[,;:]\s*$/, '').replace(/\s*[-–—]\s*$/, '');

  if (text.length > MAX_SPEECH_CHARS) {
    const cut = text.slice(0, MAX_SPEECH_CHARS);
    const lastStop = Math.max(
      cut.lastIndexOf('. '),
      cut.lastIndexOf('? '),
      cut.lastIndexOf('! ')
    );
    text = (lastStop > 200 ? cut.slice(0, lastStop + 1) : cut.trimEnd() + '…').trim();
  }
  if (!text) return "Sorry, I didn't get a result.";
  return text;
}

/** Wrap cleaned text in a light SSML envelope with a natural pause. */
export function toSsml(speech: string): string {
  const safe = speech
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<speak>${safe}</speak>`;
}
