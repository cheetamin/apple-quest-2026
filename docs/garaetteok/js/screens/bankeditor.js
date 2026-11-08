// 문제 관리: 교사가 문제를 추가·수정·삭제 (브라우저에 저장, JSON 내보내기/가져오기)
import { h, $, $$, onTap, esc, modal, toast, confirmBox } from '../ui.js';
import { store, downloadText } from '../core/store.js';
import { SUBJECTS } from '../data/bank.js';
import { allQuestions, validateQuestion, parseGrades } from '../data/quizbank.js';

export function bankEditor(app) {
  const f = { grade: app.settings.grade, subject: 'kor' };
  const md = modal(`<h2>📚 문제 관리</h2>
    <div class="row gap">
      <select class="txt" id="be-g">${[1, 2, 3, 4, 5, 6].map((g) => `<option value="${g}" ${g === f.grade ? 'selected' : ''}>${g}학년</option>`).join('')}</select>
      <select class="txt" id="be-s">${['kor', 'soc', 'sci', 'eng', 'ox'].map((s) => `<option value="${s}">${SUBJECTS[s].name}</option>`).join('')}</select>
      <button class="btn small" id="be-add">＋ 새 문제</button>
      <button class="btn small ghost" id="be-exp">내보내기(JSON)</button>
      <label class="btn small ghost">가져오기<input type="file" accept=".json" id="be-imp" hidden></label>
      <button class="btn small ghost" id="be-reset">기본 문제 복원</button>
    </div>
    <p class="hint">수학 연산 문제는 학년·학기별 계산 범위에 맞춰 자동으로 새로 출제돼요. 여기서는 국어·사회·과학·영어·OX 문제를 관리해요.</p>
    <div class="scroll" id="be-list"></div>`, { cls: 'wide' });
  const list = $('#be-list', md.el);
  const draw = () => {
    const qs = allQuestions(store).filter((q) => q.subject === f.subject && q.grades.includes(f.grade));
    list.innerHTML = qs.length ? `<table class="tbl small"><thead><tr><th>학기</th><th>난이도</th><th>문제</th><th>정답</th><th>오답</th><th></th></tr></thead><tbody>${qs.map((q) => `<tr>
      <td>${q.sem === 0 ? '공통' : q.sem + '학기'}</td><td>${'★'.repeat(q.level)}</td><td>${q.emoji ? esc(q.emoji) + ' ' : ''}${esc(q.q)}${q.custom ? ' <span class="chip">교사</span>' : ''}</td>
      <td>${esc(q.answer)}</td><td>${esc((q.choices || []).slice(1).join(' / '))}</td>
      <td class="nowrap"><button class="btn tiny" data-ed="${esc(q.id)}">수정</button><button class="btn tiny ghost" data-del="${esc(q.id)}">삭제</button></td></tr>`).join('')}</tbody></table>` : '<p class="empty">문제가 없어요. [＋ 새 문제]로 추가해 주세요.</p>';
    $$('[data-ed]', list).forEach((b) => onTap(b, () => edit(allQuestions(store).find((q) => q.id === b.dataset.ed))));
    $$('[data-del]', list).forEach((b) => onTap(b, async () => {
      if (!(await confirmBox('이 문제를 삭제할까요?'))) return;
      const id = b.dataset.del;
      store.set('bank_custom', store.get('bank_custom', []).filter((q) => q.id !== id));
      if (!id.startsWith('t-')) store.set('bank_disabled', [...new Set([...store.get('bank_disabled', []), id])]);
      draw();
    }));
  };
  const edit = (q) => {
    const isNew = !q;
    const ox = f.subject === 'ox';
    q = q || { id: `t-${Date.now()}`, subject: f.subject, grades: [f.grade], sem: 0, level: 1, q: '', answer: ox ? 'O' : '', choices: ox ? ['O', 'X'] : ['', '', ''], explain: '', emoji: '' };
    const e = modal(`<h2>${isNew ? '새 문제' : '문제 수정'} · ${SUBJECTS[f.subject].name}</h2>
      <div class="form">
        <label>학년(예: 3 또는 3-4)<input class="txt" id="f-g" value="${q.grades.length > 1 ? q.grades[0] + '-' + q.grades[q.grades.length - 1] : q.grades[0]}"></label>
        <label>학기<select class="txt" id="f-s">${[[0, '공통'], [1, '1학기'], [2, '2학기']].map(([v, l]) => `<option value="${v}" ${q.sem === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>난이도<select class="txt" id="f-l">${[1, 2, 3].map((v) => `<option ${q.level === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="full">문제<textarea class="txt" id="f-q">${esc(q.q)}</textarea></label>
        ${ox ? `<label>정답<select class="txt" id="f-a"><option ${q.answer === 'O' ? 'selected' : ''}>O</option><option ${q.answer === 'X' ? 'selected' : ''}>X</option></select></label>` :
          `<label>정답<input class="txt" id="f-a" value="${esc(q.choices[0] || '')}"></label>
           <label>오답 1<input class="txt" id="f-w1" value="${esc(q.choices[1] || '')}"></label>
           <label>오답 2<input class="txt" id="f-w2" value="${esc(q.choices[2] || '')}"></label>
           <label>오답 3(선택)<input class="txt" id="f-w3" value="${esc(q.choices[3] || '')}"></label>
           <label>그림 이모지(선택)<input class="txt" id="f-e" value="${esc(q.emoji || '')}"></label>`}
        <label class="full">해설<input class="txt" id="f-x" value="${esc(q.explain)}"></label>
      </div>
      <p class="err" id="f-err"></p>
      <div class="row center"><button class="btn" id="f-ok">저장</button></div>`);
    onTap($('#f-ok', e.el), () => {
      const v = (id) => ($(id, e.el) ? $(id, e.el).value.trim() : '');
      const nq = { ...q, grades: parseGrades(v('#f-g')), sem: +v('#f-s'), level: +v('#f-l'), q: v('#f-q'), explain: v('#f-x') };
      delete nq.custom;
      if (ox) { nq.answer = v('#f-a'); nq.choices = ['O', 'X']; }
      else { nq.choices = [v('#f-a'), v('#f-w1'), v('#f-w2'), v('#f-w3')].filter(Boolean); nq.answer = nq.choices[0]; nq.emoji = v('#f-e'); }
      const errs = validateQuestion(nq);
      if (errs.length) { $('#f-err', e.el).textContent = errs.join(' '); return; }
      const custom = store.get('bank_custom', []).filter((x) => x.id !== nq.id);
      custom.push(nq); store.set('bank_custom', custom);
      e.close(); draw(); toast('저장했어요.');
    });
  };
  $('#be-g', md.el).addEventListener('change', (e) => { f.grade = +e.target.value; draw(); });
  $('#be-s', md.el).addEventListener('change', (e) => { f.subject = e.target.value; draw(); });
  onTap($('#be-add', md.el), () => edit(null));
  onTap($('#be-exp', md.el), () => downloadText('가래떡_문제은행_교사.json', JSON.stringify({ custom: store.get('bank_custom', []), disabled: store.get('bank_disabled', []) }, null, 2), 'application/json'));
  $('#be-imp', md.el).addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const good = (data.custom || []).filter((q) => !validateQuestion(q).length);
      store.set('bank_custom', good); store.set('bank_disabled', data.disabled || []);
      toast(`${good.length}개 문제를 가져왔어요.`); draw();
    } catch { toast('파일을 읽지 못했어요.'); }
  });
  onTap($('#be-reset', md.el), async () => { if (await confirmBox('삭제한 기본 문제를 모두 되살릴까요? (교사가 추가한 문제는 유지)')) { store.set('bank_disabled', []); draw(); } });
  draw();
}
