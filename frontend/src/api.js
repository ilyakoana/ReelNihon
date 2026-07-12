const BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchContents() {
  const res = await fetch(`${BASE}/contents`);
  if (!res.ok) throw new Error('Error cargando contenidos');
  return res.json();
}

export async function fetchContent(id) {
  const res = await fetch(`${BASE}/contents/${id}`);
  if (!res.ok) throw new Error('Error cargando contenido');
  return res.json();
}

export async function deleteContent(id) {
  const res = await fetch(`${BASE}/contents/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error eliminando contenido');
  return res.json();
}

export async function fetchDailies() {
  const res = await fetch(`${BASE}/dailies`);
  if (!res.ok) throw new Error('Error cargando dailies');
  return res.json();
}

export async function completeDaily(id) {
  const res = await fetch(`${BASE}/dailies/${id}/complete`, { method: 'POST' });
  if (!res.ok) throw new Error('Error marcando daily');
  return res.json();
}

export async function regenerateContent(id) {
  const res = await fetch(`${BASE}/contents/${id}/regenerate`, { method: 'POST' });
  if (!res.ok) throw new Error('Error regenerant');
  return res.json();
}

export async function resetAll() {
  const res = await fetch(`${BASE}/settings/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Error en el reset');
  return res.json();
}
