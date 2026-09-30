const $ = (selector) => document.querySelector(selector);
const nav = $('#subjectNav'), list = $('#lessonList'), search = $('#search');
const stateKey = 'minha-trilha-progresso-v1';
const themeKey = 'minha-trilha-theme-v1';
let catalog = [], activeSubject = '';
let saved = readSaved();

function readSaved(){try{return JSON.parse(localStorage.getItem(stateKey)||'{}')}catch{return {}}}
function save(){try{localStorage.setItem(stateKey,JSON.stringify(saved))}catch{} $('#saveStatus').textContent='Progresso salvo'}
function keyFor(subject,pdf,topic){return `${subject}::${pdf.id}::${topic.id}`}
function allTopics(subject){return subject.pdfs.flatMap(pdf=>pdf.assuntos.map(topic=>({pdf,topic})))}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function updateTheme(theme){
 document.documentElement.dataset.theme=theme;
 const dark=theme==='dark';
 $('#themeIcon').textContent=dark?'☀':'☾';
 $('#themeToggle').setAttribute('aria-label',dark?'Ativar tema claro':'Ativar tema escuro');
 $('#themeToggle').title=dark?'Mudar para tema claro':'Mudar para tema escuro';
 document.querySelector('meta[name="theme-color"]').content=dark?'#111522':'#f5f6fc';
 try{localStorage.setItem(themeKey,theme)}catch{}
}
const preferredTheme=(()=>{try{return localStorage.getItem(themeKey)}catch{return null}})();
updateTheme(preferredTheme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
$('#themeToggle').addEventListener('click',()=>updateTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
function updateOverview(){
 const topics=catalog.flatMap(allTopics);
 $('#totalSubjects').textContent=catalog.length;
 $('#totalPdfs').textContent=catalog.reduce((n,s)=>n+s.pdfs.length,0);
 $('#totalTopics').textContent=topics.length.toLocaleString('pt-BR');
}
function renderNav(){
 nav.replaceChildren();
 catalog.forEach(subject=>{
  const topics=allTopics(subject),done=topics.filter(({pdf,topic})=>saved[keyFor(subject.materia,pdf,topic)]?.done).length;
  const btn=document.createElement('button');btn.type='button';btn.className='subject-link'+(activeSubject===subject.materia?' active':'');
  btn.innerHTML=`<span class="subject-name"><span class="subject-symbol" aria-hidden="true">✦</span><span>${escapeHtml(subject.materia)}</span></span><span class="nav-count">${done}/${topics.length}</span>`;
  btn.addEventListener('click',()=>selectSubject(subject.materia));nav.appendChild(btn)
 });
 $('#subjectCount').textContent=catalog.length;
 updateOverview();
}
function selectSubject(name){activeSubject=name;$('#welcomeCard').hidden=true;$('#subjectHeader').hidden=false;$('#listHeading').hidden=false;renderNav();renderLessons()}
function displayPdfTitle(pdf){
 if(!/^(_Hlk|_Ref|_heading|[a-f0-9]{24,})/i.test(pdf.titulo))return pdf.titulo;
 const stem=pdf.arquivo.replace(/\.pdf$/i,'');
 return stem.replace(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-\d+-/,'').replace(/^[a-f0-9]{32}-/i,'').replace(/-e\d{9,}$/,'').replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
function renderLessons(){
 const subject=catalog.find(s=>s.materia===activeSubject);if(!subject)return;
 const all=allTopics(subject),done=all.filter(({pdf,topic})=>saved[keyFor(subject.materia,pdf,topic)]?.done).length;
 const pct=all.length?Math.round(done/all.length*100):0;
 $('#subjectTitle').textContent=subject.materia;$('#progressText').textContent=`${pct}%`;$('#progressBar').style.width=`${pct}%`;
 $('#progressCount').textContent=`${done} de ${all.length} assuntos concluídos`;
 $('#subjectSubtitle').textContent=`${subject.pdfs.length} PDFs · ${all.length.toLocaleString('pt-BR')} assuntos no sumário`;
 const query=search.value.trim().toLocaleLowerCase('pt-BR');
 const openPdfIds=new Set([...list.querySelectorAll('.pdf-group[open]')].map(d=>d.dataset.pdfId));
 let visibleTopics=0;list.replaceChildren();
 subject.pdfs.forEach((pdf,pdfIndex)=>{
  const pdfTitle=displayPdfTitle(pdf);
  const matches=pdf.assuntos.filter(t=>!query||pdfTitle.toLocaleLowerCase('pt-BR').includes(query)||t.titulo.toLocaleLowerCase('pt-BR').includes(query));
  if(!matches.length)return;visibleTopics+=matches.length;
  const pdfDone=pdf.assuntos.filter(t=>saved[keyFor(subject.materia,pdf,t)]?.done).length;
  const details=document.createElement('details');details.className='pdf-group';details.dataset.pdfId=pdf.id;
  details.open=Boolean(query)||openPdfIds.has(pdf.id)||(openPdfIds.size===0&&pdfIndex===0);
  const summary=document.createElement('summary');summary.className='pdf-summary';
  summary.innerHTML=`<span class="pdf-number">${String(pdfIndex+1).padStart(2,'0')}</span><span class="pdf-name">${escapeHtml(pdfTitle)}</span><span class="pdf-progress">${pdfDone}/${pdf.assuntos.length}</span>`;
  details.appendChild(summary);
  const inner=document.createElement('div');inner.className='topic-list';
  matches.forEach(topic=>{
   const data=saved[keyFor(subject.materia,pdf,topic)]||{};
   const row=document.createElement('article');row.className='topic-row'+(data.done?' done':'');row.style.setProperty('--level',topic.nivel||0);
   const check=document.createElement('label');check.className='check-wrap';
   check.innerHTML=`<input type="checkbox" aria-label="Concluir ${escapeHtml(topic.titulo)}" ${data.done?'checked':''}><span class="checkmark">✓</span>`;
   check.querySelector('input').addEventListener('change',e=>{saved[keyFor(subject.materia,pdf,topic)]={...saved[keyFor(subject.materia,pdf,topic)],done:e.target.checked};save();renderLessons();renderNav()});
   const main=document.createElement('div');main.className='topic-main';
   const title=document.createElement('p');title.className='topic-title';title.textContent=topic.titulo;
   const note=document.createElement('textarea');note.className='topic-note';note.rows=1;note.placeholder='Adicionar comentário ou lembrete…';note.value=data.note||'';note.setAttribute('aria-label',`Comentário para ${topic.titulo}`);
   note.addEventListener('input',()=>{saved[keyFor(subject.materia,pdf,topic)]={...saved[keyFor(subject.materia,pdf,topic)],note:note.value};save()});
   main.append(title,note);row.append(check,main);inner.appendChild(row)
  });
  details.appendChild(inner);list.appendChild(details)
 });
 $('#lessonCount').textContent=`${visibleTopics.toLocaleString('pt-BR')} de ${all.length.toLocaleString('pt-BR')} assuntos`;
 $('#emptyState').hidden=visibleTopics>0;
}
search.addEventListener('input',()=>{
 const query=search.value.trim().toLocaleLowerCase('pt-BR');
 if(!activeSubject&&query){const match=catalog.find(s=>s.pdfs.some(p=>displayPdfTitle(p).toLocaleLowerCase('pt-BR').includes(query)||p.assuntos.some(t=>t.titulo.toLocaleLowerCase('pt-BR').includes(query))));if(match)selectSubject(match.materia)}
 else if(activeSubject)renderLessons()
});
$('#installHelp').addEventListener('click',()=>$('#helpDialog').showModal());
catalog=window.MATERIAS||[];renderNav();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
