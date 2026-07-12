import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/',         kanji: '学', label: 'Контент'   },
  { to: '/dailies',  kanji: '日', label: 'Dailies'   },
  { to: '/chat',     kanji: '話', label: 'Чат'       },
  { to: '/settings', kanji: '設', label: 'Настройки' },
];

export default function BottomNav() {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 'var(--nav-height)',
      background: 'rgba(13,13,13,0.97)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      zIndex: 100,
    }}>
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            textDecoration: 'none',
            color: isActive ? 'var(--accent)' : 'var(--text-dim)',
            transition: 'color 0.2s',
          })}
        >
          <span style={{
            fontFamily: "'Noto Sans JP', sans-serif",
            fontSize: '1.25rem', lineHeight: 1,
          }}>{t.kanji}</span>
          <span style={{ fontSize: '0.58rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {t.label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
