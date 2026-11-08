// 브라우저 저장소 (학생 개인정보 최소화: 카메라 영상·사진은 절대 저장하지 않음)
const P = 'gt_';
export const store = {
  get(k, d) {
    try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch { return false; }
  },
  del(k) { try { localStorage.removeItem(P + k); } catch { /* 무시 */ } },
};

export function downloadText(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([mime.startsWith('text/csv') ? '﻿' + text : text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function toCSV(rows) {
  return rows.map((r) => r.map((c) => {
    const s = c == null ? '' : String(c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}
