import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarkdownFurigana from '../components/MarkdownFurigana';
import { useApp } from '../AppContext';

const MAX_FILE_SIZE_MB = 20;

function FileChip({ file, onRemove }) {
  const isImage = file.type.startsWith('image/');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'var(--bg-input)', border: '1px solid var(--border-light)',
      borderRadius: 8, padding: '4px 8px', maxWidth: 160,
    }}>
      {preview ? (
        <img src={preview} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4 }} />
      ) : (
        <span style={{ fontSize: '1rem' }}>📄</span>
      )}
      <span style={{
        fontSize: '0.72rem', color: 'var(--text-muted)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
      }}>{file.name}</span>
      <button onClick={onRemove} style={{
        background: 'none', border: 'none', color: 'var(--text-dim)',
        cursor: 'pointer', fontSize: '0.8rem', padding: 0, flexShrink: 0,
      }}>✕</button>
    </div>
  );
}

function Message({ msg, furiganaEnabled, onGoToContent }) {
  const isUser = msg.role === 'user';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 8, marginBottom: 12, alignItems: 'flex-end',
    }}>
      {/* Avatar */}
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Noto Sans JP', sans-serif", fontSize: '0.75rem', color: '#fff',
        }}>日</div>
      )}

      <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: 4, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {/* Fitxers adjunts del missatge */}
        {msg.files && msg.files.map((f, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 10px', fontSize: '0.78rem',
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>📎</span> {f}
          </div>
        ))}

        {/* Bubble */}
        <div style={{
          background: isUser ? 'var(--accent)' : 'var(--bg-card)',
          border: isUser ? 'none' : '1px solid var(--border)',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '10px 14px',
          color: isUser ? '#fff' : 'var(--text)',
          fontSize: '0.88rem', lineHeight: 1.6,
        }}>
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
          ) : (
            <div className="markdown" style={{ fontSize: '0.88rem' }}>
              <MarkdownFurigana furiganaEnabled={furiganaEnabled}>
                {msg.content}
              </MarkdownFurigana>
            </div>
          )}
        </div>

        {/* Botó "Veure a Контент" si s'ha generat contingut */}
        {msg.content_id && (
          <button
            onClick={() => onGoToContent(msg.content_id)}
            style={{
              background: 'var(--correct-dim)', border: '1px solid var(--correct)',
              borderRadius: 8, padding: '6px 14px',
              color: 'var(--correct)', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 600,
            }}
          >
            ✓ Открыть в Контент →
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();
  const { furiganaEnabled } = useApp();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f => {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`${f.name} supera ${MAX_FILE_SIZE_MB}MB`);
        return false;
      }
      return true;
    });
    setFiles(prev => [...prev, ...valid]);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles = [];
    for (const item of items) {
      if (item.kind === 'file') pastedFiles.push(item.getAsFile());
    }
    if (pastedFiles.length) handleFiles(pastedFiles);
  };

  const send = async () => {
    const text = input.trim();
    if (!text && files.length === 0) return;
    if (loading) return;

    const userMsg = {
      role: 'user',
      content: text,
      files: files.map(f => f.name),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setFiles([]);
    setLoading(true);

    try {
      // Historial sense els noms de fitxers (el backend no els necessita)
      const historyForApi = newMessages.map(m => ({ role: m.role, content: m.content }));

      const formData = new FormData();
      formData.append('messages', JSON.stringify(historyForApi));
      files.forEach(f => formData.append('files', f));

      const res = await fetch('/api/chat', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        content_id: data.content_id || null,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Ошибка: ${err.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh',
      paddingBottom: 'var(--nav-height)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(13,13,13,0.95)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Noto Sans JP', sans-serif", fontSize: '0.9rem', color: '#fff',
        }}>日</div>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>ReelNihon AI</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Спроси что угодно или попроси создать урок
          </div>
        </div>
      </div>

      {/* Missatges */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-dim)' }}>
            <div style={{
              fontFamily: "'Noto Sans JP', sans-serif",
              fontSize: '2.5rem', marginBottom: 12, opacity: 0.2,
            }}>話</div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
              Pregunta sobre gramática, vocabulario<br />
              o pide que cree un temario sobre cualquier tema.<br />
              También puedes adjuntar PDFs o imágenes.
            </p>
            {/* Sugerencias */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
              {[
                'Explica la partícula は vs が',
                'Genera un temario sobre saludos informales',
                '¿Cómo se pide la cuenta en un restaurante?',
              ].map(s => (
                <button key={s} onClick={() => setInput(s)} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  fontSize: '0.82rem', textAlign: 'left',
                  transition: 'border-color 0.2s',
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message
            key={i}
            msg={msg}
            furiganaEnabled={furiganaEnabled}
            onGoToContent={(id) => navigate(`/content/${id}`)}
          />
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Noto Sans JP', sans-serif", fontSize: '0.75rem', color: '#fff',
            }}>日</div>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '16px 16px 16px 4px', padding: '12px 16px',
              display: 'flex', gap: 4, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--text-dim)',
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Zona d'input */}
      <div style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
        padding: '10px 12px',
      }}>
        {/* Fitxers adjunts */}
        {files.length > 0 && (
          <div style={{
            display: 'flex', gap: 6, flexWrap: 'wrap',
            marginBottom: 8,
          }}>
            {files.map((f, i) => (
              <FileChip key={i} file={f} onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {/* Botó adjuntar */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'var(--bg-input)', border: '1px solid var(--border-light)',
              borderRadius: 10, width: 38, height: 38, flexShrink: 0,
              cursor: 'pointer', fontSize: '1.1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >＋</button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Спроси что-нибудь... (Enter для отправки)"
            rows={1}
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-light)',
              borderRadius: 10, padding: '9px 12px',
              color: 'var(--text)', fontSize: '0.9rem',
              resize: 'none', outline: 'none',
              fontFamily: "'Inter', 'Noto Sans JP', sans-serif",
              lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
            }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />

          {/* Botó enviar */}
          <button
            onClick={send}
            disabled={loading || (!input.trim() && files.length === 0)}
            style={{
              background: (loading || (!input.trim() && files.length === 0))
                ? 'var(--bg-input)' : 'var(--accent)',
              border: 'none', borderRadius: 10,
              width: 38, height: 38, flexShrink: 0,
              cursor: loading ? 'default' : 'pointer',
              fontSize: '1rem', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >→</button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
