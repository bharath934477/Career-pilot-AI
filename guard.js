/* guard.js — loaded in <head> of every protected page: no account / not signed in => back to the start page */
(function(){
  var P=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  var PUBLIC=['index.html','front.html','student.html','graduate.html','admin.html'];
  if(PUBLIC.indexOf(P)>-1)return;
  var s={};try{s=JSON.parse(localStorage.getItem('cp_session')||'{}')}catch(e){}
  if(!s.email){document.documentElement.style.display='none';location.replace('front.html')}
})();
