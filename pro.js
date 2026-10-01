/* pro.js — animated background, LEFT SIDEBAR menu, top-right profile avatar (with photo upload), login guard, helpers */
(function(){
  if(window.__proLoaded) return; window.__proLoaded=true;
  const link=document.createElement('link');link.rel='stylesheet';link.href='pro.css';document.head.appendChild(link);

  window.PRO_LOGO = (size=38)=>`
  <svg class="pro-logo" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id="pg${size}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8b9bff"/><stop offset="1" stop-color="#b79cff"/></linearGradient></defs>
    <g class="ring"><circle cx="32" cy="32" r="28" fill="none" stroke="url(#pg${size})" stroke-width="2" stroke-dasharray="6 5"/></g>
    <g class="ring2"><circle cx="32" cy="32" r="21" fill="none" stroke="#6d5efc" stroke-width="1.5" stroke-dasharray="3 6"/></g>
    <path class="core" d="M32 15 L45 23 V39 L32 49 L19 39 V23 Z" fill="none" stroke="url(#pg${size})" stroke-width="2.4"/>
    <circle class="core" cx="32" cy="32" r="5" fill="url(#pg${size})"/>
    <circle cx="32" cy="15" r="2.2" fill="#8b9bff"/><circle cx="45" cy="39" r="2.2" fill="#b79cff"/><circle cx="19" cy="39" r="2.2" fill="#6d5efc"/>
  </svg>`;

  /* ---------- advanced line icons (inline SVG, no external library) ---------- */
  const I={
    home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    hub:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    plan:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 14l2 2 4-4"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
    pulse:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    route:'<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
    mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    camera:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    chevrons:'<path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/>',
    spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>'
  };
  window.PRO_ICON=(n,s=20)=>`<svg class="ico-svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]||''}</svg>`;

  /* ---------- session / login guard ---------- */
  const PAGE=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const PUBLIC=['index.html','front.html','student.html','graduate.html','admin.html'];   // reachable without an account
  const NONAV=['index.html','student.html','graduate.html','admin.html'];                   // full-screen pages with their own layout
  const sess=()=>{try{return JSON.parse(localStorage.getItem('cp_session')||'{}')}catch{return{}}};
  const S=sess(), LOGGED=!!S.email;
  if(!PUBLIC.includes(PAGE)&&!LOGGED){document.documentElement.style.display='none';location.replace('front.html');return}
  window.cpSession=sess;

  window.cpLogout=()=>{
    try{localStorage.removeItem('cp_session');sessionStorage.removeItem('graduateName');sessionStorage.removeItem('graduateCourse')}catch{}
    location.replace('front.html');
  };

  /* ---------- profile photo (stored per account in this browser) ---------- */
  const pk=()=>'cp_photo_'+String(sess().email||'').toLowerCase();
  const initials=n=>String(n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()||'?';
  window.cpGetPhoto=()=>{try{return localStorage.getItem(pk())||''}catch{return''}};
  window.cpRenderAvatars=()=>{
    const p=cpGetPhoto(),n=sess().name;
    document.querySelectorAll('[data-cp-avatar]').forEach(el=>{
      if(p){el.style.backgroundImage=`url("${p}")`;el.textContent='';el.classList.add('has-photo')}
      else{el.style.backgroundImage='';el.textContent=initials(n);el.classList.remove('has-photo')}
    });
    const rm=document.getElementById('cp-rm-photo');if(rm)rm.hidden=!p;
  };
  window.cpPickPhoto=()=>{
    let f=document.getElementById('cp-photo-input');
    if(!f){
      f=document.createElement('input');f.type='file';f.accept='image/*';f.id='cp-photo-input';f.hidden=true;document.body.appendChild(f);
      f.addEventListener('change',()=>{
        const file=f.files&&f.files[0];f.value='';if(!file)return;
        if(!/^image\//.test(file.type)){proToast('Please choose an image file');return}
        const img=new Image(),u=URL.createObjectURL(file);
        img.onload=()=>{
          const s=Math.min(img.width,img.height),c=document.createElement('canvas');c.width=c.height=320;
          c.getContext('2d').drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,320,320);URL.revokeObjectURL(u);
          try{localStorage.setItem(pk(),c.toDataURL('image/jpeg',.85));cpRenderAvatars();proToast('Profile photo updated ✓')}
          catch{proToast('Could not save the photo')}
        };
        img.onerror=()=>{URL.revokeObjectURL(u);proToast('Could not read that image')};
        img.src=u;
      });
    }
    f.click();
  };
  window.cpRemovePhoto=()=>{try{localStorage.removeItem(pk())}catch{}cpRenderAvatars();proToast('Photo removed')};

  /* ---------- left menu ---------- */
  const careersHref=S.role==='graduate'?'grdcareer.html':'skills-interests.html';
  window.cpCareersHref=careersHref;
  const MENU=[
    ['Main',[['home.html','Home','home','#8b9bff'],['dashboard.html','AI Hub','hub','#7c6cff'],[careersHref,'Careers','compass','#4cc9f0'],['my-plan.html','My Plan','plan','#f2c46d']]],
    ['AI Tools',[['career-match.html','Career Match','target','#34d399'],['resume-analyzer.html','Skill Gap','pulse','#ff7a93'],['roadmap.html','Roadmap','route','#5eead4'],['interview-coach.html','Interview Coach','mic','#fb923c'],['cover-letter.html','Cover Letter','mail','#a78bfa']]],
    ['Account',[['profile.html','Profile','user','#b79cff']]]
  ];
  const isActive=h=>h===PAGE||(h===careersHref&&(PAGE==='skills-interests.html'||PAGE==='grdcareer.html'));

  function build(){
    // phones: full screen + notch safe-areas, browser bar colour
    let vp=document.querySelector('meta[name="viewport"]');
    if(!vp){vp=document.createElement('meta');vp.name='viewport';document.head.appendChild(vp)}
    vp.content='width=device-width,initial-scale=1,viewport-fit=cover';
    if(!document.querySelector('meta[name="theme-color"]')){const tc=document.createElement('meta');tc.name='theme-color';tc.content='#070914';document.head.appendChild(tc)}
    const bg=document.createElement('div');bg.id='pro-bg';document.body.prepend(bg);
    const cv=document.createElement('canvas');cv.id='pro-canvas';document.body.prepend(cv);
    const pr=document.createElement('div');pr.id='pro-progress';document.body.prepend(pr);

    if(!NONAV.includes(PAGE)){
      document.body.classList.add('pro-page');
      if(LOGGED){
        document.body.classList.add('pro-app');
        try{if(localStorage.getItem('cp_sb')==='1')document.body.classList.add('sb-collapsed')}catch{}
        const role=S.role==='graduate'?'Graduate':S.role==='admin'?'Admin':'Student';
        const title=(document.title||'CareerPilot AI').split(/\s[—-]\s/)[0].trim();
        const side=document.createElement('aside');side.id='pro-side';side.setAttribute('aria-label','Main menu');
        side.innerHTML=`<a class="sb-brand" href="home.html">${PRO_LOGO(38)}<span class="lb">CareerPilot AI<small>Career &amp; Education Advisor</small></span></a>
          <nav class="sb-nav">${MENU.map(([sec,items])=>`<div class="sb-sec"><span>${sec}</span></div>`+items.map(([h,t,ic,c],i)=>
            `<a href="${h}" class="${isActive(h)?'active':''}" style="--c:${c};--i:${i}" title="${t}"><i class="ic">${PRO_ICON(ic,20)}</i><span class="lb">${t}</span></a>`).join('')).join('')}</nav>
          <div class="sb-foot">
            <a class="sb-user" href="profile.html" title="My profile"><span class="av" data-cp-avatar></span><span class="lb"><b class="u-name"></b><small>${role}</small></span></a>
            <button type="button" class="sb-out" title="Log out">${PRO_ICON('logout',18)}<span class="lb">Log out</span></button>
          </div>`;
        const scrim=document.createElement('div');scrim.id='pro-scrim';
        const top=document.createElement('header');top.id='pro-top';
        top.innerHTML=`<button type="button" class="tb-btn tb-burger" aria-label="Open menu">${PRO_ICON('menu',20)}</button>
          <button type="button" class="tb-btn tb-collapse" aria-label="Collapse menu" title="Collapse / expand menu">${PRO_ICON('chevrons',18)}</button>
          <div class="tb-title">${proEscSafe(title)}</div>
          <div class="prof">
            <button type="button" class="av-btn" aria-label="Profile menu" aria-haspopup="true" aria-expanded="false"><span class="av" data-cp-avatar></span></button>
            <div class="menu" role="menu">
              <div class="m-head"><span class="av big" data-cp-avatar></span><div><b class="u-name"></b><small class="u-mail"></small><em>${role}</em></div></div>
              <a href="profile.html" role="menuitem">${PRO_ICON('user',18)}<span>View profile</span></a>
              <button type="button" role="menuitem" id="cp-add-photo">${PRO_ICON('camera',18)}<span>Add / change photo</span></button>
              <button type="button" role="menuitem" id="cp-rm-photo" hidden>${PRO_ICON('trash',18)}<span>Remove photo</span></button>
              <button type="button" role="menuitem" class="danger" id="cp-logout">${PRO_ICON('logout',18)}<span>Log out</span></button>
            </div>
          </div>`;
        document.body.prepend(scrim);document.body.prepend(top);document.body.prepend(side);

        const fillUser=()=>{const s=sess();document.querySelectorAll('.u-name').forEach(e=>e.textContent=s.name||'My account');
          const m=document.querySelector('.u-mail');if(m)m.textContent=s.email||''};
        fillUser();cpRenderAvatars();

        const setSide=o=>{document.body.classList.toggle('sb-open',o);top.querySelector('.tb-burger').setAttribute('aria-expanded',o)};
        top.querySelector('.tb-burger').onclick=e=>{e.stopPropagation();setSide(!document.body.classList.contains('sb-open'))};
        scrim.onclick=()=>setSide(false);
        side.querySelectorAll('.sb-nav a').forEach(a=>a.addEventListener('click',()=>setSide(false)));
        top.querySelector('.tb-collapse').onclick=()=>{const c=document.body.classList.toggle('sb-collapsed');try{localStorage.setItem('cp_sb',c?'1':'0')}catch{}};
        side.querySelector('.sb-out').onclick=cpLogout;

        const prof=top.querySelector('.prof'),ab=prof.querySelector('.av-btn');
        const setMenu=o=>{if(o)fillUser();prof.classList.toggle('open',o);ab.setAttribute('aria-expanded',o)};
        ab.onclick=e=>{e.stopPropagation();setMenu(!prof.classList.contains('open'))};
        document.addEventListener('click',e=>{if(!prof.contains(e.target))setMenu(false)});
        addEventListener('keydown',e=>{if(e.key==='Escape'){setMenu(false);setSide(false)}});
        addEventListener('resize',()=>{if(innerWidth>900)setSide(false)});
        prof.querySelector('#cp-add-photo').onclick=()=>{setMenu(false);cpPickPhoto()};
        prof.querySelector('#cp-rm-photo').onclick=()=>{setMenu(false);cpRemovePhoto()};
        prof.querySelector('#cp-logout').onclick=cpLogout;
        addEventListener('storage',()=>{fillUser();cpRenderAvatars()});
      }else{
        // not signed in (only the role-chooser page gets here): brand-only top bar
        const top=document.createElement('header');top.id='pro-top';top.className='solo';
        top.innerHTML=`<a class="tb-brand" href="front.html">${PRO_LOGO(36)}<span>CareerPilot AI<small>Career &amp; Education Advisor</small></span></a>`;
        document.body.prepend(top);
      }
    }
    cpRenderAvatars();

    addEventListener('scroll',()=>{const h=document.documentElement;
      pr.style.width=(h.scrollTop/(h.scrollHeight-h.clientHeight||1)*100)+'%'},{passive:true});

    // reveal on scroll
    const targets=document.querySelectorAll('.card,.phase,.form-box,.pro-card,.panel,.rec,form,h1,.reveal');
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.08});
    targets.forEach(t=>{t.classList.add('reveal');io.observe(t)});
    new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{
      if(n.nodeType===1&&n.matches&&n.matches('.phase,.rec,.card,.pro-card')){n.classList.add('reveal');requestAnimationFrame(()=>n.classList.add('in'))}
    }))).observe(document.body,{childList:true,subtree:true});

    neural(cv);
  }
  function proEscSafe(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  // neural-network particle background (mouse reactive)
  function neural(cv){
    const ctx=cv.getContext('2d');let W,H,pts=[],mouse={x:-999,y:-999};
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,touch=matchMedia('(hover: none)').matches;
    function size(){W=cv.width=innerWidth;H=cv.height=innerHeight;
      const small=W<700,n=Math.min(small?32:90,Math.floor(W*H/(small?26000:18000)));pts=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,
        vx:(Math.random()-.5)*.45,vy:(Math.random()-.5)*.45,c:['#8b9bff','#b79cff','#6d5efc'][Math.floor(Math.random()*3)]}))}
    addEventListener('resize',size);addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});size();
    let hidden=false;document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(!hidden)frame()});
    (function frame(){
      if(hidden)return;
      ctx.clearRect(0,0,W,H);
      for(const p of pts){
        if(!reduce){p.x+=p.vx;p.y+=p.vy}
        if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
        const dx=p.x-mouse.x,dy=p.y-mouse.y,d=Math.hypot(dx,dy);
        if(d<120&&!reduce&&!touch){p.x+=dx/d*1.4;p.y+=dy/d*1.4}
        ctx.beginPath();ctx.arc(p.x,p.y,1.8,0,7);ctx.fillStyle=p.c;ctx.globalAlpha=.85;ctx.fill();
      }
      for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
        const a=pts[i],b=pts[j],d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<120){ctx.globalAlpha=(1-d/120)*.35;ctx.strokeStyle=a.c;ctx.lineWidth=.7;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}
      requestAnimationFrame(frame);
    })();
  }

  // helpers
  window.proToast=(msg)=>{const t=document.createElement('div');t.className='pro-toast';t.textContent=msg;
    document.body.appendChild(t);requestAnimationFrame(()=>t.classList.add('show'));
    setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),400)},2600)};
  window.proCount=(el,to,ms=1200,suffix='')=>{const s=performance.now();
    (function f(n){const k=Math.min(1,(n-s)/ms),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e)+suffix;if(k<1)requestAnimationFrame(f)})(s)};
  window.PRO_API='http://localhost:5000';
  window.proPost=async(path,body)=>{const r=await fetch(window.PRO_API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error('HTTP '+r.status);return r.json()};
  window.proEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',build):build();
})();
/* saves skills/interests to the server (or the local demo account) so the admin page can list them */
window.cpSaveProfile=async function(skills,interests){
  let s={};try{s=JSON.parse(localStorage.getItem('cp_session')||'{}')}catch{}
  if(!s.email)return;
  try{
    const A=JSON.parse(localStorage.getItem('cp_accounts')||'{}'),k=(s.role||'student')+':'+String(s.email).toLowerCase();
    if(A[k]){A[k].skills=String(skills).split(',').map(x=>x.trim()).filter(Boolean);A[k].interests=String(interests).split(',').map(x=>x.trim()).filter(Boolean);localStorage.setItem('cp_accounts',JSON.stringify(A))}
  }catch{}
  try{await fetch((location.protocol==='file:'?'http://localhost:5000':'')+'/api/skills',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({email:s.email,skills,interests})})}catch{}
};

/* logs what each user generates (plan, roadmap, resume, interview...) to their account for the admin page */
window.cpLog=async function(type,data){
  let s={};try{s=JSON.parse(localStorage.getItem('cp_session')||'{}')}catch{}
  if(!s.email||s.role==='admin')return;
  const entry=Object.assign({at:new Date().toISOString()},data);
  try{
    const A=JSON.parse(localStorage.getItem('cp_accounts')||'{}'),k=(s.role||'student')+':'+String(s.email).toLowerCase();
    if(A[k]){A[k].activity=A[k].activity||{};(A[k].activity[type]=A[k].activity[type]||[]).push(entry);A[k].activity[type]=A[k].activity[type].slice(-25);localStorage.setItem('cp_accounts',JSON.stringify(A))}
  }catch{}
  try{await fetch((location.protocol==='file:'?'http://localhost:5000':'')+'/api/activity',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({email:s.email,type,data:entry})})}catch{}
};
