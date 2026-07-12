import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteContent, regenerateContent } from '../api';
import { useApp } from '../AppContext';

const STATUS_COLOR = {
  ready: 'var(--correct)',
  processing: '#F9CA24',
  error: 'var(--wrong)',
};

export default function ContentCard({ content, onDeleted }) {
  const navigate = useNavigate();
  const { completed } = useApp();
  const isReady = content.status === 'ready';
  const isDone = isReady && !!completed[content.id];
  const canRegenerate = content.status === 'error';
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const date = new Date(content.created_at);
  const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    try {
      await deleteContent(content.id);
      onDeleted(content.id);
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const handleRegenerate = async (e) => {
    e.stopPropagation();
    setRegenerating(true);
    try {
      await regenerateContent(content.id);
      // El polling de ContentsPage ja detectarà el canvi d'estat
    } catch {
      setRegenerating(false);
    }
  };

  const cancelDelete = (e) => {
    e.stopPropagation();
    setConfirming(false);
  };

  const accentColor = isDone ? 'var(--correct)' : isReady ? 'var(--accent)' : STATUS_COLOR[content.status];

  return (
    <div
      onClick={() => isReady && navigate(`/content/${content.id}`)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isDone ? 'rgba(78,205,196,0.3)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        cursor: isReady ? 'pointer' : 'default',
        opacity: content.status === 'error' ? 0.5 : 1,
        transition: 'border-color 0.2s, background 0.2s',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {/* Accent line esquerra */}
      <div style={{
        width: 3, flexShrink: 0,
        background: accentColor,
        borderRadius: '12px 0 0 12px',
        transition: 'background 0.3s',
      }} />

      {/* Thumbnail */}
      {content.thumbnail && (
        <div style={{
          width: 72, flexShrink: 0,
          overflow: 'hidden',
          background: 'var(--border)',
        }}>
          {content.thumbnail.endsWith('.mp4') ? (
            <video
              src={content.thumbnail}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              muted playsInline preload="metadata"
            />
          ) : (
            <img
              src={content.thumbnail}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>
      )}

      {/* Contingut */}
      <div style={{ flex: 1, padding: '12px 12px 12px 12px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 style={{
            fontSize: '0.88rem', fontWeight: 500,
            color: isReady ? 'var(--text)' : 'var(--text-muted)',
            lineHeight: 1.4, flex: 1,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {content.title || '処理中...'}
          </h3>
        </div>

        <div style={{
          marginTop: 8, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            <span>{dateStr}</span>
            {content.status === 'processing' && (
              <span style={{ color: '#F9CA24', fontFamily: "'Noto Sans JP', sans-serif" }}>処理中</span>
            )}
            {content.status === 'error' && (
              <span style={{ color: 'var(--wrong)' }}>Ошибка</span>
            )}
            {isDone && (
              <span style={{ color: 'var(--correct)' }}>✓ Сделано</span>
            )}
          </div>

          {/* Botons: visibles en tots els estats menys processing */}
          {content.status !== 'processing' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
              {canRegenerate && (
                <button onClick={handleRegenerate} disabled={regenerating} title="Regenerar" style={{
                  background: 'none', border: 'none',
                  color: '#F9CA24', cursor: regenerating ? 'default' : 'pointer',
                  fontSize: '1rem', padding: '2px 4px', lineHeight: 1,
                  opacity: regenerating ? 0.5 : 1,
                }}>
                  {regenerating ? '…' : '🔄'}
                </button>
              )}
              {confirming ? (
                <>
                  <button onClick={handleDelete} disabled={deleting} style={{
                    background: 'var(--wrong-dim)', border: '1px solid var(--wrong)',
                    borderRadius: 6, padding: '3px 10px',
                    color: 'var(--wrong)', cursor: 'pointer', fontSize: '0.72rem',
                  }}>
                    {deleting ? '...' : 'Удалить'}
                  </button>
                  <button onClick={cancelDelete} style={{
                    background: 'none', border: '1px solid var(--border-light)',
                    borderRadius: 6, padding: '3px 8px',
                    color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.72rem',
                  }}>
                    Отмена
                  </button>
                </>
              ) : (
                <button onClick={handleDelete} title="Eliminar" style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-dim)', cursor: 'pointer',
                  fontSize: '1rem', padding: '2px 6px', lineHeight: 1,
                }}>
                  🗑
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
