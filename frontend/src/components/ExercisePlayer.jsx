import { useState } from 'react';
import Furigana from './Furigana';
import { useApp } from '../AppContext';

// ─── Utils ────────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Tipos de ejercicio ───────────────────────────────────────────────────────

function MultipleChoice({ exercise, onAnswer, furiganaEnabled }) {
  const [selected, setSelected] = useState(null);
  const options = exercise._shuffled || exercise.options;

  const choose = (opt) => {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => onAnswer(opt === exercise.answer), 900);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((opt, i) => {
        const isCorrect = opt === exercise.answer;
        const isSelected = opt === selected;
        let bg = 'var(--bg-input)';
        let border = 'var(--border-light)';
        let color = 'var(--text)';
        if (selected) {
          if (isCorrect) { bg = 'var(--correct-dim)'; border = 'var(--correct)'; color = 'var(--correct)'; }
          else if (isSelected) { bg = 'var(--wrong-dim)'; border = 'var(--wrong)'; color = 'var(--wrong)'; }
          else { border = 'var(--border)'; color = 'var(--text-muted)'; }
        }
        return (
          <button key={i} onClick={() => choose(opt)} style={{
            background: bg, border: `1px solid ${border}`,
            borderRadius: 'var(--radius-sm)', padding: '14px 16px',
            color, cursor: selected ? 'default' : 'pointer',
            textAlign: 'left', fontSize: '0.9rem',
            fontFamily: "'Noto Sans JP', 'Inter', sans-serif",
            transition: 'all 0.2s', lineHeight: 1.8,
          }}>
            <Furigana text={opt} enabled={furiganaEnabled} />
          </button>
        );
      })}
    </div>
  );
}

function FillBlankChoice({ exercise, onAnswer, furiganaEnabled }) {
  return <MultipleChoice exercise={exercise} onAnswer={onAnswer} furiganaEnabled={furiganaEnabled} />;
}

function TranslateChoice({ exercise, onAnswer, furiganaEnabled }) {
  return <MultipleChoice exercise={exercise} onAnswer={onAnswer} furiganaEnabled={furiganaEnabled} />;
}

function NaturalOrNot({ exercise, onAnswer, furiganaEnabled }) {
  return <MultipleChoice exercise={exercise} onAnswer={onAnswer} furiganaEnabled={furiganaEnabled} />;
}

function OrderWords({ exercise, onAnswer, furiganaEnabled }) {
  const [pool, setPool] = useState(() => shuffle(exercise.options));
  const [chosen, setChosen] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(null);

  const pick = (word) => {
    if (submitted) return;
    setPool(p => { const idx = p.indexOf(word); const a = [...p]; a.splice(idx, 1); return a; });
    setChosen(c => [...c, word]);
  };

  const unpick = (idx) => {
    if (submitted) return;
    const word = chosen[idx];
    setChosen(c => c.filter((_, i) => i !== idx));
    setPool(p => [...p, word]);
  };

  const submit = () => {
    if (chosen.length === 0) return;
    const isCorrect = chosen.join(',') === exercise.answer;
    setCorrect(isCorrect);
    setSubmitted(true);
    setTimeout(() => onAnswer(isCorrect), 1000);
  };

  return (
    <div>
      {/* Zona de construir la frase */}
      <div style={{
        minHeight: 52, background: 'var(--bg-input)',
        border: `1px solid ${submitted ? (correct ? 'var(--correct)' : 'var(--wrong)') : 'var(--border-light)'}`,
        borderRadius: 'var(--radius-sm)', padding: '10px 12px',
        display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12,
        transition: 'border-color 0.2s',
      }}>
        {chosen.length === 0 && (
          <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Нажимай слова по порядку...</span>
        )}
        {chosen.map((word, i) => (
          <button key={i} onClick={() => unpick(i)} style={{
            background: submitted
              ? (correct ? 'var(--correct-dim)' : 'var(--wrong-dim)')
              : 'rgba(255,71,87,0.15)',
            border: `1px solid ${submitted ? (correct ? 'var(--correct)' : 'var(--wrong)') : 'var(--accent)'}`,
            borderRadius: 6, padding: '4px 10px',
            color: submitted ? (correct ? 'var(--correct)' : 'var(--wrong)') : 'var(--accent)',
            cursor: submitted ? 'default' : 'pointer',
            fontSize: '0.9rem',
            fontFamily: "'Noto Sans JP', sans-serif",
          }}><Furigana text={word} enabled={furiganaEnabled} /></button>
        ))}
      </div>

      {/* Palabras disponibles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {pool.map((word, i) => (
          <button key={i} onClick={() => pick(word)} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-light)',
            borderRadius: 6, padding: '6px 14px',
            color: 'var(--text)', cursor: 'pointer', fontSize: '0.9rem',
            fontFamily: "'Noto Sans JP', sans-serif",
            transition: 'background 0.15s',
          }}><Furigana text={word} enabled={furiganaEnabled} /></button>
        ))}
      </div>

      {!submitted && (
        <button onClick={submit} disabled={chosen.length === 0} style={{
          width: '100%', padding: '14px',
          background: chosen.length > 0 ? 'var(--accent)' : 'var(--bg-input)',
          border: 'none', borderRadius: 'var(--radius-sm)',
          color: chosen.length > 0 ? '#fff' : 'var(--text-dim)',
          cursor: chosen.length > 0 ? 'pointer' : 'default',
          fontSize: '0.95rem', fontWeight: 600,
          transition: 'background 0.2s',
        }}>Проверить</button>
      )}
    </div>
  );
}

function MatchPairs({ exercise, onAnswer, furiganaEnabled }) {
  const pairs = exercise.options; // [{left, right}]
  const [shuffledRight] = useState(() => shuffle(pairs.map(p => p.right)));
  const [leftSel, setLeftSel] = useState(null);
  const [rightSel, setRightSel] = useState(null);
  const [matched, setMatched] = useState({}); // {left: right}
  const [wrong, setWrong] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const pickLeft = (left) => {
    if (submitted || matched[left]) return;
    setLeftSel(left);
    setWrong(null);
    if (rightSel) tryMatch(left, rightSel);
  };

  const pickRight = (right) => {
    if (submitted || Object.values(matched).includes(right)) return;
    setRightSel(right);
    setWrong(null);
    if (leftSel) tryMatch(leftSel, right);
  };

  const tryMatch = (left, right) => {
    const correctPair = pairs.find(p => p.left === left);
    if (correctPair && correctPair.right === right) {
      setMatched(m => ({ ...m, [left]: right }));
      setLeftSel(null); setRightSel(null);
      const newMatched = { ...matched, [left]: right };
      if (Object.keys(newMatched).length === pairs.length) {
        setSubmitted(true);
        setTimeout(() => onAnswer(true), 700);
      }
    } else {
      setWrong(`${left}-${right}`);
      setTimeout(() => { setLeftSel(null); setRightSel(null); setWrong(null); }, 800);
    }
  };

  const isLeftMatched = (left) => left in matched;
  const isRightMatched = (right) => Object.values(matched).includes(right);

  const btnStyle = (active, matchedOk, wrongOk) => ({
    padding: '10px 12px', borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center',
    fontFamily: "'Noto Sans JP', 'Inter', sans-serif",
    border: `1px solid ${matchedOk ? 'var(--correct)' : wrongOk ? 'var(--wrong)' : active ? 'var(--accent)' : 'var(--border-light)'}`,
    background: matchedOk ? 'var(--correct-dim)' : wrongOk ? 'var(--wrong-dim)' : active ? 'var(--accent-dim)' : 'var(--bg-input)',
    color: matchedOk ? 'var(--correct)' : wrongOk ? 'var(--wrong)' : active ? 'var(--accent)' : 'var(--text)',
    transition: 'all 0.15s',
    lineHeight: 1.4,
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pairs.map(p => (
          <button key={p.left} onClick={() => pickLeft(p.left)}
            style={btnStyle(leftSel === p.left, isLeftMatched(p.left), wrong && wrong.startsWith(p.left + '-'))}>
            <Furigana text={p.left} enabled={furiganaEnabled} />
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shuffledRight.map(right => (
          <button key={right} onClick={() => pickRight(right)}
            style={btnStyle(rightSel === right, isRightMatched(right), wrong && wrong.endsWith('-' + right))}>
            <Furigana text={right} enabled={furiganaEnabled} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Player principal ─────────────────────────────────────────────────────────

const EXERCISE_COMPONENTS = {
  multiple_choice: MultipleChoice,
  fill_blank_choice: FillBlankChoice,
  translate_choice: TranslateChoice,
  natural_or_not: NaturalOrNot,
  order_words: OrderWords,
  match_pairs: MatchPairs,
};

const TYPE_LABEL = {
  multiple_choice: 'Выбери правильный ответ',
  fill_blank_choice: 'Заполни пропуск',
  translate_choice: 'Выбери перевод',
  natural_or_not: 'Что звучит естественнее?',
  order_words: 'Составь фразу',
  match_pairs: 'Составь пары',
};

export default function ExercisePlayer({ exercises, contentId, onCompleted }) {
  const [current, setCurrent] = useState(0);
  const [results, setResults] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(null);
  const [finished, setFinished] = useState(false);
  const { furiganaEnabled } = useApp();

  const prepared = exercises.map(ex => ({
    ...ex,
    _shuffled: ex.options ? shuffle(ex.options) : null,
  }));

  const handleAnswer = (correct) => {
    setLastCorrect(correct);
    setShowExplanation(true);
    setResults(r => [...r, correct]);
  };

  const next = () => {
    setShowExplanation(false);
    setLastCorrect(null);
    if (current + 1 >= prepared.length) {
      setFinished(true);
      if (onCompleted) onCompleted();
    } else {
      setCurrent(c => c + 1);
    }
  };

  if (finished) {
    const score = results.filter(Boolean).length;
    const pct = Math.round((score / results.length) * 100);
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Noto Sans JP', sans-serif",
          fontSize: '4rem', marginBottom: 8,
        }}>
          {pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}
        </div>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 8 }}>
          {score} / {results.length}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {pct >= 80 ? 'Отличная работа!' : pct >= 50 ? 'Неплохо, продолжай!' : 'Попробуй ещё раз!'}
        </p>
        <button
          onClick={() => { setCurrent(0); setResults([]); setFinished(false); setShowExplanation(false); }}
          style={{
            marginTop: 24, padding: '12px 32px',
            background: 'var(--accent)', border: 'none',
            borderRadius: 'var(--radius-sm)', color: '#fff',
            cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600,
          }}
        >
          Повторить
        </button>
      </div>
    );
  }

  const ex = prepared[current];
  const Component = EXERCISE_COMPONENTS[ex.type] || MultipleChoice;

  return (
    <div style={{ padding: '16px' }}>
      {/* Progreso */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {prepared.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < current
              ? (results[i] ? 'var(--correct)' : 'var(--wrong)')
              : i === current
                ? 'var(--accent)'
                : 'var(--border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Tipo de ejercicio */}
      <div style={{
        fontSize: '0.7rem', color: 'var(--accent)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: 12, fontWeight: 500,
      }}>
        {TYPE_LABEL[ex.type] || ex.type}
      </div>

      {/* Pregunta */}
      <p style={{
        fontSize: '1rem', lineHeight: 1.8,
        fontFamily: "'Noto Sans JP', 'Inter', sans-serif",
        marginBottom: 20, fontWeight: 400,
      }}>
        <Furigana text={ex.question} enabled={furiganaEnabled} />
      </p>

      {/* Componente de ejercicio */}
      <Component key={current} exercise={ex} onAnswer={handleAnswer} furiganaEnabled={furiganaEnabled} />

      {/* Explicación + botón siguiente */}
      {showExplanation && (
        <div style={{ marginTop: 16 }}>
          {ex.explanation && (
            <div style={{
              background: lastCorrect ? 'var(--correct-dim)' : 'var(--wrong-dim)',
              border: `1px solid ${lastCorrect ? 'var(--correct)' : 'var(--wrong)'}`,
              borderRadius: 'var(--radius-sm)', padding: '12px 14px',
              fontSize: '0.85rem', color: lastCorrect ? 'var(--correct)' : 'var(--wrong)',
              marginBottom: 12, lineHeight: 1.6,
            }}>
              <strong>{lastCorrect ? '✓ Верно! ' : '✗ Неверно. '}</strong>
              <Furigana text={ex.explanation} enabled={furiganaEnabled} />
            </div>
          )}
          <button onClick={next} style={{
            width: '100%', padding: '14px',
            background: lastCorrect ? 'var(--correct)' : 'var(--accent)',
            border: 'none', borderRadius: 'var(--radius-sm)',
            color: '#fff', cursor: 'pointer',
            fontSize: '0.95rem', fontWeight: 600,
            transition: 'background 0.2s',
          }}>
            {current + 1 >= prepared.length ? 'Посмотреть результат' : 'Дальше →'}
          </button>
        </div>
      )}
    </div>
  );
}
