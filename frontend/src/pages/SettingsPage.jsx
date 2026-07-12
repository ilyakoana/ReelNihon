import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetAll } from '../api';
import { useApp } from '../AppContext';

const MODELS = [
  { id: 'gemini-2.5-flash',       label: 'Gemini 2.5 Flash',       desc: 'Быстрый, экономичный. Рекомендуется.' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview',  desc: 'Новое поколение. Puede ser inestable.' },
  { id: 'gemini-3.1-flash-lite',  label: 'Gemini 3.1 Flash Lite',   desc: 'Версия Gemini 3.1, очень быстрая.' },
  { id: 'gemini-3.5-flash',       label: 'Gemini 3.5 Flash',        desc: 'Последнее поколение Flash.' },
];

export default function SettingsPage() {
  const [model, setModel] = useState('gemini-2.5-flash');
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();
  const { furiganaEnabled, toggleFurigana, resetCompleted } = useApp();

  useEffect(() => {
    const stored = localStorage.getItem('rn_model');
    if (stored) setModel(stored);
  }, []);

  const handleReset = async () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    setResetting(true);
    try {
      await resetAll();
      resetCompleted();
      navigate('/');
    } catch {
      setResetting(false);
      setConfirmReset(false);
    }
  };

  const save = () => {
    localStorage.setItem('rn_model', model);
    // Informar al backend del modelo seleccionado
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    }).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 'calc(var(--nav-height) + 24px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36,
            background: 'var(--accent)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Noto Sans JP', sans-serif",
            fontSize: '1rem', color: '#fff', fontWeight: 700,
            flexShrink: 0,
          }}>日</div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>ReelNihon</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>リールにほん</div>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 10 }}>
          Настройки приложения
        </p>
      </div>

      {/* Secció model IA */}
      <section style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: '0.7rem', color: 'var(--accent)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          fontWeight: 600, marginBottom: 12,
        }}>
          Модель ИИ
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MODELS.map(m => (
            <div
              key={m.id}
              onClick={() => setModel(m.id)}
              style={{
                background: model === m.id ? 'var(--accent-dim)' : 'var(--bg-card)',
                border: `1px solid ${model === m.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${model === m.id ? 'var(--accent)' : 'var(--border-light)'}`,
                background: model === m.id ? 'var(--accent)' : 'transparent',
                transition: 'all 0.15s',
              }} />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{m.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Secció furigana */}
      <section style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: '0.7rem', color: 'var(--accent)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          fontWeight: 600, marginBottom: 12,
        }}>
          Фуригана
        </div>
        <div
          onClick={toggleFurigana}
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${furiganaEnabled ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'border-color 0.2s',
          }}
        >
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>
              Показывать фуригану над кандзи
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: "'Noto Sans JP', sans-serif" }}>
              {furiganaEnabled ? '日本語[にほんご] → 日本語 с чтением' : '日本語[にほんご] → 日本語'}
            </div>
          </div>
          {/* Toggle switch */}
          <div style={{
            width: 44, height: 24, borderRadius: 12, flexShrink: 0,
            background: furiganaEnabled ? 'var(--accent)' : 'var(--border-light)',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              position: 'absolute', top: 3, borderRadius: '50%',
              width: 18, height: 18, background: '#fff',
              left: furiganaEnabled ? 23 : 3,
              transition: 'left 0.2s',
            }} />
          </div>
        </div>
      </section>

      {/* Secció futur - placeholders */}
      <section style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: '0.7rem', color: 'var(--text-dim)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          fontWeight: 600, marginBottom: 12,
        }}>
          Скоро
        </div>
        {[
          { label: 'Язык интерфейса', value: 'Русский' },
          { label: 'Количество Daily-повторений', value: '5' },
          { label: 'Уведомления', value: 'Выкл.' },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0',
            borderBottom: '1px solid var(--border)',
            opacity: 0.4,
          }}>
            <span style={{ fontSize: '0.88rem' }}>{item.label}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.value}</span>
          </div>
        ))}
      </section>

      {/* Botó guardar */}
      <button onClick={save} style={{
        width: '100%', padding: '14px',
        background: saved ? 'var(--correct)' : 'var(--accent)',
        border: 'none', borderRadius: 'var(--radius-sm)',
        color: '#fff', cursor: 'pointer',
        fontSize: '0.95rem', fontWeight: 600,
        transition: 'background 0.3s',
      }}>
        {saved ? '✓ Сохранено' : 'Сохранить'}
      </button>

      {/* Zona de perill - Reset */}
      <section style={{ marginTop: 40 }}>
        <div style={{
          fontSize: '0.7rem', color: 'var(--wrong)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          fontWeight: 600, marginBottom: 12,
        }}>
          Опасная зона
        </div>
        <div style={{
          background: 'var(--wrong-dim)',
          border: '1px solid rgba(255,107,107,0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px',
        }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            Удалить все материалы, упражнения и базу данных. Начать с нуля. Это действие необратимо.
          </p>
          {confirmReset ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleReset} disabled={resetting} style={{
                flex: 1, padding: '10px',
                background: 'var(--wrong)', border: 'none',
                borderRadius: 'var(--radius-sm)', color: '#fff',
                cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600,
              }}>
                {resetting ? '...' : 'Да, удалить всё'}
              </button>
              <button onClick={() => setConfirmReset(false)} style={{
                flex: 1, padding: '10px',
                background: 'none', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: '0.88rem',
              }}>
                Отмена
              </button>
            </div>
          ) : (
            <button onClick={handleReset} style={{
              width: '100%', padding: '10px',
              background: 'none', border: '1px solid var(--wrong)',
              borderRadius: 'var(--radius-sm)', color: 'var(--wrong)',
              cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500,
            }}>
              Сбросить всё
            </button>
          )}
        </div>
      </section>

      <div style={{ marginTop: 28, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.72rem' }}>
        ReelNihon · リールにほん
      </div>
    </div>
  );
}
