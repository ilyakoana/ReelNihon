/**
 * MarkdownFurigana.jsx
 * Renderitza markdown aplicant furigana (漢字[よみ]) a tot el text.
 * Usa react-markdown amb components personalitzats per injectar <ruby>.
 */

import ReactMarkdown from 'react-markdown';
import { parseFurigana } from './Furigana';

/**
 * Renderitza un string amb furigana com a array de nodes React.
 */
function renderWithFurigana(text, enabled) {
  if (!enabled) return text.replace(/\[([^\]]+)\]/g, '');
  const parts = parseFurigana(text);
  return parts.map((p, i) =>
    p.type === 'ruby' ? (
      <ruby key={i}>
        {p.kanji}
        <rt style={{
          fontSize: '0.55em',
          color: 'var(--text-muted)',
          fontFamily: "'Noto Sans JP', sans-serif",
        }}>
          {p.reading}
        </rt>
      </ruby>
    ) : (
      <span key={i}>{p.value}</span>
    )
  );
}

/**
 * Processa els fills d'un element react-markdown i aplica furigana als strings.
 */
function processChildren(children, enabled) {
  if (!children) return children;
  return Array.isArray(children)
    ? children.map((child, i) =>
        typeof child === 'string'
          ? <span key={i}>{renderWithFurigana(child, enabled)}</span>
          : child
      )
    : typeof children === 'string'
      ? renderWithFurigana(children, enabled)
      : children;
}

export default function MarkdownFurigana({ children, furiganaEnabled = true }) {
  const components = {
    p: ({ children }) => <p>{processChildren(children, furiganaEnabled)}</p>,
    li: ({ children }) => <li>{processChildren(children, furiganaEnabled)}</li>,
    strong: ({ children }) => <strong>{processChildren(children, furiganaEnabled)}</strong>,
    em: ({ children }) => <em>{processChildren(children, furiganaEnabled)}</em>,
    code: ({ children }) => <code>{processChildren(children, furiganaEnabled)}</code>,
    h1: ({ children }) => <h1>{processChildren(children, furiganaEnabled)}</h1>,
    h2: ({ children }) => <h2>{processChildren(children, furiganaEnabled)}</h2>,
    h3: ({ children }) => <h3>{processChildren(children, furiganaEnabled)}</h3>,
  };

  return (
    <div className="markdown">
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
