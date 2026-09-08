/* MR JOO LIVE EXAM — final live overlay */
const QUESTIONS = Array.isArray(window.MR_JOO_QUESTIONS) ? window.MR_JOO_QUESTIONS : [];
const TOTAL = QUESTIONS.length || 500;
const DEFAULT_WS_BASE = 'wss://api.tik.tools';
const $ = id => document.getElementById(id);

const setupModal = $('setupModal');
const usernameInput = $('liveUsername');
let ws = null, reconnectTimer = null, currentUsername = '';
let qIndex = Number(localStorage.getItem('mrjoo_q_index') || 0);
let solved = Number(localStorage.getItem('mrjoo_solved') || 0);
let totalLikes = Number(localStorage.getItem('mrjoo_likes') || 0);
let totalSupport = Number(localStorage.getItem('mrjoo_support') || 0);
let viewers = Number(localStorage.getItem('mrjoo_viewers') || 24700);
const users = new Map();
let arrowCount = 0;
let advancing = false;

const current = () => QUESTIONS[Math.min(Math.max(qIndex,0), Math.max(TOTAL-1,0))] || {category:'عام',question:'جاهز…',answer:'',aliases:[]};

function escapeHtml(s){return String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function norm(s){return String(s ?? '').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/[أ-ي]/g,m=>m).replace(/[^\p{L}\p{N}]+/gu,'').trim();}
function answers(q){return [q.answer,...(q.aliases||[])].map(norm).filter(Boolean);}
function formatNum(n){return Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n);}
function save(){localStorage.setItem('mrjoo_q_index',qIndex);localStorage.setItem('mrjoo_solved',solved);localStorage.setItem('mrjoo_likes',totalLikes);localStorage.setItem('mrjoo_support',totalSupport);localStorage.setItem('mrjoo_viewers',viewers);}
function setConnected(ok){$('connection').textContent=ok?'LIVE • متصل سحابيًا':'غير متصل';document.querySelector('.connection .pulse')?.classList.toggle('live',ok);}
function saveUser(u){localStorage.setItem('mrjoo_cloud_username',u)}
function loadUser(){return localStorage.getItem('mrjoo_cloud_username')||''}
function showToast(msg){const t=$('toast'); if(!t)return; t.textContent=msg; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');}
function flash(cls='impact'){document.body.classList.remove('live-hit','live-gift','live-like');void document.body.offsetWidth;document.body.classList.add(cls==='gift'?'live-gift':cls==='like'?'live-like':'live-hit');}

function renderQuestion(){
  const q=current();
  $('category').textContent=q.category||'عام';
  $('question').textContent=q.question||'';
  $('qCount').textContent=String(qIndex+1).padStart(3,'0')+' / '+TOTAL;
  $('answerState').textContent='في انتظار الإجابات…';
  $('solvedCount').textContent=solved;
  $('totalLikes').textContent=formatNum(totalLikes);
  $('totalSupport').textContent=formatNum(totalSupport);
  $('viewerCount').textContent=formatNum(viewers);
  $('arrowCount').textContent=arrowCount+'/5';
  const emoji=$('emojiClue'); emoji.textContent=q.emoji||'';
  const grid=$('wordGrid'); grid.classList.add('hidden'); grid.replaceChildren();
  $('hintNote').textContent=q.emoji?'خمن الفيلم من الإيموجي 🎬':'الحروف مخفية — حل السؤال من الكومنت.';
}

function updateRankings(){
  const list=[...users.values()];
  const topLikes=[...list].sort((a,b)=>b.likes-a.likes).slice(0,3);
  const topSupport=[...list].sort((a,b)=>b.support-a.support).slice(0,3);
  const topActive=[...list].sort((a,b)=>(b.likes+b.support*10+b.comments*2)-(a.likes+a.support*10+a.comments*2)).slice(0,3);
  const row=(u,i,kind)=>`<div class="rank-row"><b class="medal">${['🥇','🥈','🥉'][i]||''}</b><span class="mini-avatar">${escapeHtml((u.name||'?').slice(0,1))}</span><span class="u">${escapeHtml(u.name)}</span><strong>${kind==='likes'?'❤️ '+formatNum(u.likes):kind==='support'?'🪙 '+formatNum(u.support):'⚡ '+formatNum(u.likes+u.comments+u.support*10)}</strong></div>`;
  $('likerList').innerHTML=topLikes.map((u,i)=>row(u,i,'likes')).join('')||'<div class="empty">في انتظار التفاعل…</div>';
  $('supporterList').innerHTML=topSupport.map((u,i)=>row(u,i,'support')).join('')||'<div class="empty">في انتظار الدعم…</div>';
  $('activeList').innerHTML=topActive.map((u,i)=>row(u,i,'active')).join('')||'<div class="empty">في انتظار التفاعل…</div>';
}
function user(name){const key=String(name||'مشاهد').trim()||'مشاهد'; if(!users.has(key))users.set(key,{name:key,likes:0,support:0,comments:0});return users.get(key);}
function addChat(name,text){const box=$('commentList'); const row=document.createElement('div'); row.className='chat-row'; row.innerHTML=`<b>${escapeHtml(name)}</b>${escapeHtml(text)}`; box.prepend(row);while(box.children.length>7)box.lastElementChild.remove();}
function spotlight(name,msg){$('spotText').textContent=msg; $('spotlight').classList.remove('spot-pulse');void $('spotlight').offsetWidth;$('spotlight').classList.add('spot-pulse');}
function pin(msg){const p=$('sharePin');p.textContent=msg;p.classList.remove('show');void p.offsetWidth;p.classList.add('show');}

function likeEvent(e){const name=e.uniqueId||e.nickname||e.user?.uniqueId||e.user?.nickname||e.user?.name||'مشاهد';const u=user(name);const count=Number(e.likeCount||e.count||e.likes||1)||1;u.likes+=count;totalLikes+=count;viewers=Math.max(viewers,1);$('totalLikes').textContent=formatNum(totalLikes);$('viewerCount').textContent=formatNum(viewers);updateRankings();flash('like');$('eventMsg').textContent=`❤️ ${name} ضغط ${formatNum(count)} إعجاب — شكرًا يا بطل!`;}
function commentEvent(e){const name=e.uniqueId||e.nickname||e.user?.uniqueId||e.user?.nickname||e.user?.name||'مشاهد';const text=e.comment??e.text??e.message??e.content??'';const u=user(name);u.comments++;addChat(name,text);updateRankings();$('eventMsg').textContent=`💬 ${name}: ${text}`; if(checkAnswer(name,text)) return;}
function giftEvent(e){const name=e.uniqueId||e.nickname||e.user?.uniqueId||e.user?.nickname||e.user?.name||'مشاهد';const u=user(name);const repeat=Number(e.repeatCount||e.repeat_count||e.count||1)||1;const diamonds=Number(e.diamondCount||e.diamond_count||e.diamonds||e.value||1)||1;const total=Math.max(1,diamonds*repeat);u.support+=total;totalSupport+=total;arrowCount=Math.min(5,arrowCount+Math.max(1,Math.min(5,repeat)));$('totalSupport').textContent=formatNum(totalSupport);$('arrowCount').textContent=arrowCount+'/5';updateRankings();flash('gift');const gift=e.giftName||e.gift_name||e.gift?.name||'هدية';$('eventMsg').textContent=`🎁 شكرًا ${name} على ${gift} ×${repeat}`;spotlight(name,`شكرًا يا ${name} ❤️ دعمك وصل!`);if(arrowCount>=5){revealLetters();arrowCount=0;}}
function shareEvent(e){const name=e.uniqueId||e.nickname||e.user?.uniqueId||e.user?.nickname||'مشاهد';user(name);pin(`📣 ${name} شارك البث — شكرًا على النشر!`);$('eventMsg').textContent=`🔁 ${name} شارك البث — تسلم يا بطل!`;}
function followEvent(e){const name=e.uniqueId||e.nickname||e.user?.uniqueId||e.user?.nickname||'مشاهد';user(name);pin(`💙 أهلاً ${name} — شكرًا على المتابعة!`);$('eventMsg').textContent=`💙 شكرًا ${name} على المتابعة!`;}
function viewerEvent(e){const n=Number(e.viewerCount||e.viewers||e.viewer_count||e.count);if(Number.isFinite(n)&&n>0){viewers=n;save();$('viewerCount').textContent=formatNum(viewers);}}
function revealLetters(){const q=current(),grid=$('wordGrid');grid.classList.remove('hidden');grid.replaceChildren();[...String(q.answer||'').replace(/\s/g,'')].slice(0,12).forEach(ch=>{const d=document.createElement('span');d.textContent=ch;grid.appendChild(d)});$('hintNote').textContent='🎯 سهم الشهرة اكتمل — الحروف اتفتحت!';showToast('🌟 5 أسهم شهرة — الحروف اتفتحت');}
function checkAnswer(name,text){const value=norm(text);if(!value)return false;const ok=answers(current()).some(a=>value===a || (value.length>=4&&a.length>=4&&value.includes(a)));if(!ok)return false;if(advancing)return true;advancing=true;solved++;$('answerState').textContent=`✅ إجابة صحيحة — ${name}!`;$('questionCard').classList.add('correct');flash('hit');spotlight(name,`🏆 ${name} جاوب صح! +100 نقطة`);$('eventMsg').textContent=`🏆 ${name} جاوب صح — السؤال التالي بعد لحظة!`;setTimeout(()=>{qIndex=(qIndex+1)%TOTAL;save();renderQuestion();updateRankings();advancing=false;},850);return true;}

function normalizeIncoming(raw){
  let e=raw; if(typeof raw==='string'){try{e=JSON.parse(raw)}catch{return null}}
  if(!e||typeof e!=='object')return null;
  if(e.data&&typeof e.data==='object'&&!e.type&&!e.eventName&&!e.event)e=Object.assign({},e,e.data);
  const t=String(e.type||e.eventName||e.event||e.event_type||e.action||'').toLowerCase();
  if(t.includes('comment')||t.includes('chat')) return Object.assign({},e,{type:'comment'});
  if(t.includes('gift')||t.includes('donat')) return Object.assign({},e,{type:'gift'});
  if(t.includes('like')) return Object.assign({},e,{type:'like'});
  if(t.includes('share')) return Object.assign({},e,{type:'share'});
  if(t.includes('follow')) return Object.assign({},e,{type:'follow'});
  if(t.includes('viewer')||t.includes('room')) return Object.assign({},e,{type:'viewer'});
  return e.type?t?Object.assign({},e,{type:t}):e:null;
}
function handleEvent(raw){const e=normalizeIncoming(raw);if(!e)return;switch(e.type){case'comment':commentEvent(e);break;case'gift':giftEvent(e);break;case'like':likeEvent(e);break;case'share':shareEvent(e);break;case'follow':followEvent(e);break;case'viewer':viewerEvent(e);break;default:if(e.data&&e.data.type)handleEvent(e.data)}}

async function mintJwt(username){const r=await fetch('/.netlify/functions/tik-jwt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username})});const j=await r.json().catch(()=>({}));if(!r.ok||!j.token)throw new Error(j.error||'JWT failed');return j.token;}
async function connectCloud(username){clearTimeout(reconnectTimer);username=(username||'').replace(/^@/,'').trim();if(!username){setConnected(false);return}currentUsername=username;saveUser(username);setConnected(false);$('connection').textContent='تجهيز الاتصال…';try{const token=await mintJwt(username);ws=new WebSocket(`${DEFAULT_WS_BASE}?uniqueId=${encodeURIComponent(username)}&jwtKey=${encodeURIComponent(token)}`);ws.onopen=()=>{setConnected(true);setupModal.classList.add('hidden');showToast('☁️ MR JOO LIVE متصل');};ws.onmessage=e=>handleEvent(e.data);ws.onerror=()=>setConnected(false);ws.onclose=()=>{setConnected(false);ws=null;reconnectTimer=setTimeout(()=>connectCloud(currentUsername),5000)}}catch(err){setConnected(false);$('connection').textContent='فشل الاتصال';showToast('❌ '+err.message)}}
function connect(){const u=loadUser();if(u){usernameInput.value=u;connectCloud(u)}else{setupModal.classList.remove('hidden');setConnected(false)}}
function demo(){const names=['Shadow','Luna','Ahmed','Sara','Youssef','Mona'];let timer=setInterval(()=>{const u=names[Math.floor(Math.random()*names.length)],r=Math.random();if(r<.5)likeEvent({uniqueId:u,likeCount:Math.ceil(Math.random()*12)});else if(r<.75)commentEvent({uniqueId:u,comment:current().answer});else if(r<.9)giftEvent({uniqueId:u,giftName:'سهم الشهرة',repeatCount:1,diamondCount:1});else shareEvent({uniqueId:u,nickname:u})},2200);setTimeout(()=>clearInterval(timer),120000)}
$('connectCloud').addEventListener('click',()=>{const u=usernameInput.value.trim();if(!u){showToast('أدخل Username TikTok أولًا');return}connectCloud(u)});
$('demoCloud').addEventListener('click',()=>{setupModal.classList.add('hidden');showToast('🧪 Demo mode');demo()});
$('helpBtn').addEventListener('click',()=>showToast('👥 استعانة بصديق — 10 🪙'));
renderQuestion();updateRankings();connect();if(new URLSearchParams(location.search).has('demo'))demo();
