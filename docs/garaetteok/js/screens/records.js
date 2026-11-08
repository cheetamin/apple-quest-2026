import { h, $, $$, onTap, esc, confirmBox, toast } from '../ui.js';
import { store, downloadText } from '../core/store.js';
import { recordsCSV } from './awards.js';

export function show(app, root) {
  const draw = () => {
    root.innerHTML = '';
    const list = store.get('records', []);
    const el = h(`<div class="screen records-screen">
      <div class="screen-title"><button class="btn small ghost" data-a="back">← 처음으로</button><h2 data-pixel="64">기록 보기</h2><span></span></div>
      <div class="card scroll-card">
        ${list.length ? `<table class="tbl"><thead><tr><th>날짜</th><th>학년</th><th>청팀</th><th>백팀</th><th>합계(1~11)</th><th>우승</th><th>시간</th></tr></thead><tbody>
        ${list.map((r) => `<tr><td>${esc(new Date(r.date).toLocaleString('ko-KR'))}</td><td>${r.grade}학년</td><td>${esc(r.teams.blue)} (${r.counts.blue}명)</td><td>${esc(r.teams.white)} (${r.counts.white}명)</td><td>${r.totals.blue} : ${r.totals.white}</td><td>${r.winner === 'tie' ? '공동 우승' : esc(r.teams[r.winner])}</td><td>${r.minutes ?? '-'}분</td></tr>`).join('')}
        </tbody></table>` : '<p class="empty">아직 저장된 기록이 없어요. 경기를 마치면 자동으로 기록돼요.</p>'}
        <p class="hint">기록에는 학년·팀 이름·인원·라운드 점수·우승팀·경기 시간만 저장돼요. 학생 이름과 카메라 영상은 저장하지 않아요. (이 컴퓨터의 브라우저에만 보관)</p>
      </div>
      <div class="row center gap"><button class="btn" data-a="csv" ${list.length ? '' : 'disabled'}>💾 전체 CSV 저장</button><button class="btn ghost" data-a="clear" ${list.length ? '' : 'disabled'}>🗑 기록 모두 지우기</button></div>
    </div>`);
    root.appendChild(el);
    const act = {
      back: () => app.go('main'),
      csv: () => { downloadText(`가래떡모션게임_기록_${new Date().toISOString().slice(0, 10)}.csv`, recordsCSV(list)); toast('CSV 파일을 저장했어요.'); },
      clear: async () => { if (await confirmBox('저장된 기록을 모두 지울까요? 되돌릴 수 없어요.', { ok: '모두 지우기' })) { store.set('records', []); draw(); } },
    };
    $$('[data-a]', el).forEach((b) => onTap(b, () => act[b.dataset.a]()));
  };
  draw();
}
