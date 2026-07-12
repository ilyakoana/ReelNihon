import { useEffect, useState } from 'react';
import ContentCard from '../components/ContentCard';
import { fetchContents } from '../api';

export default function ContentsPage() {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchContents()
      .then(setContents)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    // Polling cada 8s para detectar contenidos que acaban de procesar
    const interval = setInterval(() => {
      fetchContents().then(setContents).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 'calc(var(--nav-height) + 16px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: "'Noto Sans JP', sans-serif",
          fontSize: '0.75rem',
          color: 'var(--accent)',
          letterSpacing: '0.1em',
          marginBottom: 4,
        }}>
          リールにほん
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Мои материалы</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
          Отправь ссылку на Instagram в бот, чтобы добавить новый материал
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 48 }}>
          <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: '1.5rem' }}>読み込み中...</span>
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--wrong-dim)', border: '1px solid var(--wrong)',
          borderRadius: 'var(--radius)', padding: 16, color: 'var(--wrong)',
          fontSize: '0.85rem',
        }}>
          Не удалось загрузить материалы. Проверь, что бэкенд запущен.
        </div>
      )}

      {!loading && !error && contents.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '64px 16px',
          color: 'var(--text-dim)',
        }}>
          <div style={{
            fontFamily: "'Noto Sans JP', sans-serif",
            fontSize: '3rem', marginBottom: 16, opacity: 0.3,
          }}>空</div>
          <p style={{ fontSize: '0.9rem' }}>Пока ничего нет</p>
          <p style={{ fontSize: '0.8rem', marginTop: 8, color: 'var(--text-dim)' }}>
            Отправь ссылку на Instagram Reel в Telegram-бот
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {contents.map(c => (
          <ContentCard
            key={c.id}
            content={c}
            onDeleted={(id) => setContents(prev => prev.filter(x => x.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
