import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchContent, deleteContent } from '../api';
import MarkdownFurigana from '../components/MarkdownFurigana';
import Furigana from '../components/Furigana';
import ExercisePlayer from '../components/ExercisePlayer';
import { useApp } from '../AppContext';

const TAB = { SUMMARY: 'summary', EXERCISES: 'exercises' };

function MediaViewer({ folderPath, contentId }) {
  const [files, setFiles] = useState([]);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    // Demanem la llista de fitxers al backend
    fetch(`/api/media-list/${contentId}`)
      .then(r => r.json())
      .then(setFiles)
      .catch(() => {});
  }, [contentId]);

  if (!files.length) return null;

  const isVideo = files[0].endsWith('.mp4') || files[0].endsWith('.mov') || files[0].endsWith('.webm');

  return (
    <div style={{ marginBottom: 20 }}>
      {isVideo ? (
        <video
          src={`/api/media/${contentId}/${files[0]}`}
          controls playsInline
          style={{
            width: '100%', borderRadius: 'var(--radius)',
            maxHeight: 360, background: '#000',
            display: 'block',
          }}
        />
      ) : (
        <div>
          <div style={{
            borderRadius: 'var(--radius)', overflow: 'hidden',
            background: 'var(--bg-card)',
            aspectRatio: '1/1', position: 'relative',
          }}>
            <img
              src={`/api/media/${contentId}/${files[imgIdx]}`}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          {files.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {files.map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)} style={{
                  width: 8, height: 8, borderRadius: '50%', border: 'none',
                  background: i === imgIdx ? 'var(--accent)' : 'var(--border-light)',
                  cursor: 'pointer', padding: 0,
                }} />
              ))}
            </div>
          )}
          {files.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <button
                onClick={() => setImgIdx(i => Math.max(0, i - 1))}
                disabled={imgIdx === 0}
                style={{
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '6px 16px',
                  color: imgIdx === 0 ? 'var(--text-dim)' : 'var(--text)',
                  cursor: imgIdx === 0 ? 'default' : 'pointer', fontSize: '0.85rem',
                }}
              >← Назад</button>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', alignSelf: 'center' }}>
                {imgIdx + 1} / {files.length}
              </span>
              <button
                onClick={() => setImgIdx(i => Math.min(files.length - 1, i + 1))}
                disabled={imgIdx === files.length - 1}
                style={{
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '6px 16px',
                  color: imgIdx === files.length - 1 ? 'var(--text-dim)' : 'var(--text)',
                  cursor: imgIdx === files.length - 1 ? 'default' : 'pointer', fontSize: '0.85rem',
                }}
              >Вперёд →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ContentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { furiganaEnabled, markCompleted } = useApp();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(TAB.SUMMARY);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetchContent(id)
      .then(setContent)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await deleteContent(id).catch(() => {});
    navigate('/');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
      <span style={{ fontFamily: "'Noto Sans JP', sans-serif", color: 'var(--text-dim)', fontSize: '1.2rem' }}>
        読み込み中...
      </span>
    </div>
  );

  if (!content) return null;

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 'calc(var(--nav-height) + 16px)' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,13,13,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', padding: '4px 0', fontSize: '0.85rem',
            }}
          >
            ← Назад
          </button>

          {/* Botó eliminar */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {confirmDelete ? (
              <>
                <button onClick={handleDelete} disabled={deleting} style={{
                  background: 'var(--wrong-dim)', border: '1px solid var(--wrong)',
                  borderRadius: 6, padding: '4px 12px',
                  color: 'var(--wrong)', cursor: 'pointer', fontSize: '0.78rem',
                }}>
                  {deleting ? '...' : 'Удалить'}
                </button>
                <button onClick={() => setConfirmDelete(false)} style={{
                  background: 'none', border: '1px solid var(--border-light)',
                  borderRadius: 6, padding: '4px 10px',
                  color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem',
                }}>
                  Отмена
                </button>
              </>
            ) : (
              <button onClick={handleDelete} style={{
                background: 'none', border: 'none',
                color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.1rem',
              }}>🗑</button>
            )}
          </div>
        </div>

        <h2 style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: 8, lineHeight: 1.4 }}>
          {content.title}
        </h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {[
          { key: TAB.SUMMARY, label: '📚 Темарий' },
          { key: TAB.EXERCISES, label: `🏋️ Упражнения (${content.exercises?.length || 0})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '10px 0',
              background: 'none', border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t.key ? 'var(--text)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
              transition: 'color 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contingut */}
      {tab === TAB.SUMMARY && (
        <div style={{ padding: '16px' }}>
          {/* Contingut original */}
          <MediaViewer contentId={content.id} folderPath={content.folder_path} />

          {/* Warning natural DINS del temari */}
          {content.natural_warning && (
            <div style={{
              background: 'rgba(249,202,36,0.08)',
              border: '1px solid rgba(249,202,36,0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '0.8rem',
              color: '#F9CA24',
              marginBottom: 20,
              lineHeight: 1.5,
            }}>
              <span style={{ fontFamily: "'Noto Sans JP', sans-serif", marginRight: 6 }}>⚠️ 注意 —</span>
              <Furigana text={content.natural_warning} enabled={furiganaEnabled} />
            </div>
          )}

          <div className="markdown">
            <MarkdownFurigana furiganaEnabled={furiganaEnabled}>
              {content.summary}
            </MarkdownFurigana>
          </div>
        </div>
      )}

      {tab === TAB.EXERCISES && (
        <ExercisePlayer exercises={content.exercises} contentId={content.id} onCompleted={() => markCompleted(content.id)} />
      )}
    </div>
  );
}
