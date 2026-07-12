/**
 * Furigana.jsx
 * Parseja text amb format  漢字[よみかた]  i el renderitza com <ruby>.
 * Exemples d'entrada:
 *   "日本語[にほんご]が好[す]きです"
 *   "勉強[べんきょう]する"
 */

const FURIGANA_RE = /([^\s[\]]+)\[([^\]]+)\]/g;

export function parseFurigana(text) {
  if (!text) return [];
  const parts = [];
  let last = 0;
  let match;

  FURIGANA_RE.lastIndex = 0;
  while ((match = FURIGANA_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) });
    }
    parts.push({ type: 'ruby', kanji: match[1], reading: match[2] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ type: 'text', value: text.slice(last) });
  }
  return parts;
}

/**
 * Component inline: renderitza una cadena amb furigana.
 * Si furiganaEnabled és false, mostra el text net (sense corchets ni ruby).
 */
export default function Furigana({ text, enabled = true }) {
  if (!text) return null;

  if (!enabled) {
    // Mostra el text sense format furigana (treu els [よみ])
    return <span>{text.replace(/\[([^\]]+)\]/g, '')}</span>;
  }

  const parts = parseFurigana(text);

  return (
    <span>
      {parts.map((p, i) =>
        p.type === 'ruby' ? (
          <ruby key={i} style={{ rubyAlign: 'center' }}>
            {p.kanji}
            <rt style={{
              fontSize: '0.55em',
              color: 'var(--text-muted)',
              fontFamily: "'Noto Sans JP', sans-serif",
              letterSpacing: '0.02em',
            }}>
              {p.reading}
            </rt>
          </ruby>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </span>
  );
}
