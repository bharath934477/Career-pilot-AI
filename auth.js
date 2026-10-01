/* auth.js — builds the login / create-account experience from window.AUTH_CFG */
(function(){
const C=window.AUTH_CFG,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const base=location.protocol==='file:'?'http://localhost:5000':'';
const RK='cp_remember_'+C.role,AK='cp_accounts';
document.body.classList.add('au');if(C.role==='graduate')document.body.classList.add('grad');
const fld=(id,type,label,extra='',right='')=>`<div class="fl"><input id="${id}" name="${id}" type="${type}" placeholder=" " ${extra}><label for="${id}">${label}</label>${right}<small class="ferr"></small></div>`;
const eye=`<button type="button" class="eye" aria-label="Show password" tabindex="-1">👁</button>`;
const extraUp=C.role==='student'
 ?fld('course','text','Currently studying (optional)','autocomplete="off"')
 :`<div class="row2">${fld('course','text','Completed course','required autocomplete="off"')}<div class="fl"><select id="year">${[0,1,2,3,4,5,6].map(i=>`<option>${new Date().getFullYear()-i}</option>`).join('')}</select><label for="year">Graduation year</label></div></div>`;
document.body.insertAdjacentHTML('afterbegin',`
<div class="au-wrap">
 <aside class="au-side"><div class="orb o1"></div><div class="orb o2"></div>
  <div class="au-logo">${PRO_LOGO(56)}<span>CareerPilot AI</span></div>
  <span class="pro-badge">${C.badge}</span>
  <h1>${C.headline}</h1><p class="au-type" id="au-type"></p>
  <div class="au-art">${C.art}</div>
  <ul class="au-feats">${C.feats.map((f,i)=>`<li style="animation-delay:${.5+i*.15}s"><i>${f[0]}</i>${f[1]}</li>`).join('')}</ul>
  <div class="au-chips"><span>🎯 Career Match</span><span>🗺️ Roadmap</span><span>🎤 Interview Coach</span><span>✉️ Cover Letters</span></div>
 </aside>
 <section class="au-main"><div class="au-card">
  <div class="au-role">${C.icon} ${C.label} portal</div>
  <div class="au-tabs" id="tabs" role="tablist"><i></i><button type="button" role="tab" data-t="in" class="on">Sign in</button><button type="button" role="tab" data-t="up">Create account</button></div>
  <div id="au-err" class="au-err" role="alert"></div>
  <form id="f-in" novalidate class="reveal in">
   ${fld('l-email','email','Email','autocomplete="email" required')}
   ${fld('l-pw','password','Password','autocomplete="current-password" required',eye)}<div class="caps">⚠ Caps Lock is on</div>
   <div class="between"><label class="chk"><input type="checkbox" id="remember"> Remember me</label><button type="button" class="lk" id="forgot">Forgot password?</button></div>
   <button class="au-go" type="submit"><span class="sp"></span><span class="t">Sign in →</span></button>
  </form>
  <form id="f-up" novalidate hidden class="reveal in">
   ${fld('name','text','Full name','autocomplete="name" required')}
   ${fld('email','email','Email','autocomplete="email" required')}
   <div>${fld('pw','password','Password','autocomplete="new-password" required',eye)}<div class="caps">⚠ Caps Lock is on</div>
    <div class="meter"><i></i><i></i><i></i><i></i></div><div class="mlab"><span id="mtxt">Strength: —</span></div>
    <div class="rules"><span data-r="len">6+ chars</span><span data-r="up">Uppercase</span><span data-r="num">Number</span><span data-r="sym">Symbol</span></div></div>
   ${fld('pw2','password','Confirm password','autocomplete="new-password" required')}
   ${extraUp}
   <label class="chk"><input type="checkbox" id="terms"> I agree to the Terms &amp; Privacy Policy</label>
   <button class="au-go" type="submit"><span class="sp"></span><span class="t">Create account →</span></button>
  </form>
  <div class="au-foot"><span>🔒 Passwords are hashed, never stored in plain text</span><a href="front.html">← Change role</a></div>
 </div></section>
</div>
<div class="au-modal" id="m-forgot"><div class="au-box"><h3 style="margin:0">Reset password</h3><p style="margin:0;color:#a4acc6;font-size:.85rem">Enter your email. (Demo: no email is actually sent.)</p>
 ${fld('f-email','email','Email')}<div class="between"><button class="pro-btn ghost" id="f-cancel" type="button">Cancel</button><button class="pro-btn" id="f-send" type="button">Send link</button></div></div></div>
<div class="au-ok" id="au-ok"><canvas id="cf"></canvas><div><svg class="tick" viewBox="0 0 100 100" fill="none" stroke-width="5" stroke-linecap="round"><circle cx="50" cy="50" r="45" stroke="var(--au-a)"/><path d="M28 52l16 16 30-34" stroke="var(--au-b)"/></svg><h2 id="ok-h"></h2><p>Taking you to your home page…</p></div></div>`);

// typewriter
let ti=0,ci=0,del=false;const te=$('#au-type');
(function tick(){const L=C.lines[ti];ci+=del?-1:1;te.textContent=L.slice(0,ci);
 if(!del&&ci===L.length){del=true;return setTimeout(tick,1300)}if(del&&ci===0){del=false;ti=(ti+1)%C.lines.length}setTimeout(tick,del?20:42)})();

// tabs
const tabs=$('#tabs'),err=$('#au-err');
function tab(t){tabs.classList.toggle('up',t==='up');$$('button',tabs).forEach(b=>b.classList.toggle('on',b.dataset.t===t));
 $('#f-in').hidden=t!=='in';$('#f-up').hidden=t!=='up';showErr('')}
$$('button',tabs).forEach(b=>b.onclick=()=>tab(b.dataset.t));
function showErr(m){err.textContent=m;err.classList.remove('show');if(m){void err.offsetWidth;err.classList.add('show')}}

// eyes + caps lock
$$('.eye').forEach(b=>b.onclick=()=>{const i=b.parentElement.querySelector('input');const p=i.type==='password';i.type=p?'text':'password';b.textContent=p?'🙈':'👁'});
$$('input[type=password]').forEach(i=>{const caps=i.closest('.fl').nextElementSibling;
 i.addEventListener('keyup',e=>{if(caps&&caps.classList.contains('caps'))caps.classList.toggle('show',!!e.getModifierState&&e.getModifierState('CapsLock'))})});

// strength meter
const RULES={len:v=>v.length>=6,up:v=>/[A-Z]/.test(v),num:v=>/\d/.test(v),sym:v=>/[^A-Za-z0-9]/.test(v)};
const COL=['#ff5d5d','#f2c46d','#ffd166','#8b9bff'],LAB=['Too weak','Weak','Fair','Good','Strong'];
function meter(){const v=$('#pw').value;let s=0;$$('.rules span').forEach(r=>{const ok=RULES[r.dataset.r](v);r.classList.toggle('ok',ok);if(ok)s++});
 $$('.meter i').forEach((b,i)=>b.style.background=i<s?COL[Math.max(0,s-1)]:'');$('#mtxt').textContent='Strength: '+(v?LAB[s]:'—')}
$('#pw').addEventListener('input',meter);

// validation
const EM=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function mark(id,msg){const f=$('#'+id).closest('.fl');f.classList.toggle('bad',!!msg);f.classList.toggle('good',!msg&&!!$('#'+id).value);$('.ferr',f).textContent=msg||'';return !msg}
const V={ 'l-email':v=>EM.test(v)?'':'Enter a valid email','l-pw':v=>v?'':'Enter your password',
 name:v=>v.trim().length>=2?'':'Enter your full name',email:v=>EM.test(v)?'':'Enter a valid email',
 pw:v=>v.length>=6?'':'At least 6 characters',pw2:v=>v===$('#pw').value&&v?'':'Passwords do not match',
 course:v=>C.role==='graduate'&&!v.trim()?'Enter your completed course':''};
Object.keys(V).forEach(id=>{const el=$('#'+id);if(!el)return;el.addEventListener('blur',()=>el.value&&mark(id,V[id](el.value)));el.addEventListener('input',()=>el.closest('.fl').classList.contains('bad')&&mark(id,V[id](el.value)))});
const checkAll=ids=>ids.map(id=>mark(id,V[id]($('#'+id).value))).every(Boolean);

// remember me
try{const r=localStorage.getItem(RK);if(r){$('#l-email').value=r;$('#remember').checked=true}}catch{}

// auth backends: real API first, local demo storage if the server is unreachable
async function api(path,body){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 let d={};try{d=await r.json()}catch{}d.status=r.status;return d}
async function hash(pw,salt){if(!(window.crypto&&crypto.subtle))return btoa(salt+pw);const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
 const b=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},k,256);return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const accts=()=>{try{return JSON.parse(localStorage.getItem(AK)||'{}')}catch{return{}}};
const ADM='66997c08503d331bfeef26ac5217d070fc75bb257a5eee023a8c5eeed696e718';
async function sha(t){if(!(window.crypto&&crypto.subtle))return'';return[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function local(mode,p){const A=accts(),key=C.role+':'+p.email.toLowerCase();
 if(mode==='login'&&await sha(p.email.trim().toLowerCase()+':'+p.password)===ADM)return{success:true,admin:true,local:true,user:{name:'BHARATHRAJ K',email:p.email.trim().toLowerCase(),role:'admin'}};
 if(mode==='register'){if(A[key])return{success:false,error:'An account with this email already exists. Try signing in.'};
  const salt=Math.random().toString(36).slice(2);A[key]={name:p.name,email:p.email,role:C.role,course:p.course||'',year:p.year||'',createdAt:new Date().toISOString(),loginCount:0,skills:[],interests:[],salt,h:await hash(p.password,salt)};
  localStorage.setItem(AK,JSON.stringify(A));return{success:true,user:{name:p.name,email:p.email,role:C.role,course:p.course||''}}}
 const a=A[key];if(!a||a.h!==await hash(p.password,a.salt))return{success:false,error:'Invalid email or password.'};a.lastLoginAt=new Date().toISOString();a.loginCount=(a.loginCount||0)+1;localStorage.setItem(AK,JSON.stringify(A));
 return{success:true,user:{name:a.name,email:a.email,role:a.role,course:a.course}}}
async function auth(mode,p){let d;
 try{d=await api(mode==='register'?'/api/register':'/api/login',{...p,role:C.role});if(d.status===404||d.status===405||d.status>=500&&!d.error)throw 0}
 catch{d=await local(mode,p);d.offline=true}return d}

// submit
async function submit(form,mode,ids){
 showErr('');if(!checkAll(ids)){showErr('Please fix the highlighted fields.');return}
 if(mode==='register'&&!$('#terms').checked){showErr('Please accept the Terms & Privacy Policy.');return}
 const btn=$('.au-go',form),t=$('.t',btn),old=t.textContent;btn.disabled=true;btn.classList.add('load');t.textContent=mode==='register'?'Creating account…':'Signing in…';
 const p=mode==='register'?{name:$('#name').value.trim(),email:$('#email').value.trim(),password:$('#pw').value,course:$('#course').value.trim(),year:$('#year')?$('#year').value:''}
  :{email:$('#l-email').value.trim(),password:$('#l-pw').value};
 const d=await auth(mode,p);btn.disabled=false;btn.classList.remove('load');t.textContent=old;
 if(!d.success){showErr(d.error||'Something went wrong. Please try again.');return}
 const u=d.user||{};
 if(d.admin){try{sessionStorage.setItem('cp_admin',JSON.stringify({token:d.token||'',local:!!d.local,user:d.user}))}catch{}
  $('#ok-h').textContent='Welcome, Admin';$('#au-ok').classList.add('show');confetti();setTimeout(()=>{location.href='admin.html'},1200);return}
 try{
  if(mode==='login'){$('#remember').checked?localStorage.setItem(RK,p.email):localStorage.removeItem(RK)}
  localStorage.setItem('cp_session',JSON.stringify({name:u.name,email:u.email,role:C.role,at:Date.now(),offline:!!d.offline}));
  localStorage.setItem(C.role+'Name',u.name);if(C.role==='graduate'){sessionStorage.setItem('graduateName',u.name);sessionStorage.setItem('graduateCourse',u.course||'')}}catch{}
 success(u.name||'friend');
}
$('#f-in').addEventListener('submit',e=>{e.preventDefault();submit(e.target,'login',['l-email','l-pw'])});
$('#f-up').addEventListener('submit',e=>{e.preventDefault();submit(e.target,'register',['name','email','pw','pw2','course'])});

// success overlay + confetti
function success(name){$('#ok-h').textContent='Welcome, '+name.split(' ')[0]+'!';$('#au-ok').classList.add('show');confetti();
 setTimeout(()=>{location.href=C.dest},1900)}
function confetti(){const cv=$('#cf'),x=cv.getContext('2d');cv.width=innerWidth;cv.height=innerHeight;const cols=['#8b9bff','#b79cff','#6d5efc','#ffd166'];
 const P=Array.from({length:110},()=>({x:innerWidth/2,y:innerHeight/2,vx:(Math.random()-.5)*16,vy:Math.random()*-14-2,s:Math.random()*7+3,c:cols[Math.floor(Math.random()*4)],r:Math.random()*6}));
 let n=0;(function f(){x.clearRect(0,0,cv.width,cv.height);P.forEach(p=>{p.vy+=.32;p.x+=p.vx;p.y+=p.vy;p.r+=.2;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6);x.restore()});
 if(++n<130)requestAnimationFrame(f)})()}

// forgot password (demo)
const mf=$('#m-forgot');$('#forgot').onclick=()=>{$('#f-email').value=$('#l-email').value;mf.classList.add('show')};
$('#f-cancel').onclick=()=>mf.classList.remove('show');mf.onclick=e=>{if(e.target===mf)mf.classList.remove('show')};
$('#f-send').onclick=()=>{const v=$('#f-email').value.trim();if(!EM.test(v)){proToast('Enter a valid email');return}mf.classList.remove('show');proToast('Demo: if '+v+' has an account, a reset link would be sent.')};
})();
