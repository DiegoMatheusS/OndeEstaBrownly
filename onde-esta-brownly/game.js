(() => {
  'use strict';
  const PHASES = window.BROWNLY_PHASES || [];
  const DIFF = { facil:'Fácil', medio:'Médio', hard:'Hard' };
  const STORE_RANK='brownlyRankingV1', STORE_SOUND='brownlySoundV1';
  const $=id=>document.getElementById(id);
  const screens={menu:$('menuScreen'),game:$('gameScreen'),result:$('resultScreen')};
  const state={player:'',difficulty:'facil',count:3,phases:[],index:0,startedAt:0,running:false,raf:0,lastElapsed:0,sound:localStorage.getItem(STORE_SOUND)!=='off',zoom:1,panX:0,panY:0,pointers:new Map(),pinchStart:null,pinchZoom:1,musicTimer:0,audioCtx:null};

  function show(name){Object.values(screens).forEach(s=>s.classList.remove('active'));screens[name].classList.add('active')}
  function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function fmt(ms){ms=Math.max(0,Math.floor(ms));const m=Math.floor(ms/60000),s=Math.floor(ms%60000/1000),x=ms%1000;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(x).padStart(3,'0')}`}
  function rankings(){try{return JSON.parse(localStorage.getItem(STORE_RANK)||'[]')}catch{return[]}}
  function saveRanks(r){localStorage.setItem(STORE_RANK,JSON.stringify(r.slice(0,200)))}
  function modeRows(diff,count){return rankings().filter(r=>r.difficulty===diff&&Number(r.count)===Number(count)).sort((a,b)=>a.time-b.time||a.date-b.date)}
  function renderRanking(diff=state.difficulty,count=state.count){$('rankingMode').textContent=`${DIFF[diff]} • ${count} fases`;const rows=modeRows(diff,count).slice(0,8),list=$('rankingList');list.innerHTML='';rows.forEach((r,i)=>{const li=document.createElement('li');li.innerHTML=`<strong>${i+1}º</strong><b></b><small>${fmt(r.time)}</small>`;li.querySelector('b').textContent=r.name;list.appendChild(li)});$('rankingEmpty').style.display=rows.length?'none':'block'}
  function currentSelections(){const d=document.querySelector('input[name=difficulty]:checked')?.value||'facil';const c=Number(document.querySelector('input[name=phaseCount]:checked')?.value||3);return {d,c}}
  document.querySelectorAll('input[name=difficulty],input[name=phaseCount]').forEach(i=>i.addEventListener('change',()=>{const {d,c}=currentSelections();state.difficulty=d;state.count=c;renderRanking(d,c)}));

  function initAudio(){if(!state.audioCtx){const A=window.AudioContext||window.webkitAudioContext;if(A)state.audioCtx=new A()}if(state.audioCtx?.state==='suspended')state.audioCtx.resume()}
  function tone(freq,dur=.12,vol=.025,type='triangle',delay=0){if(!state.sound)return;initAudio();if(!state.audioCtx)return;const t=state.audioCtx.currentTime+delay,o=state.audioCtx.createOscillator(),g=state.audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(state.audioCtx.destination);o.start(t);o.stop(t+dur+.03)}
  function startMusic(){stopMusic();if(!state.sound)return;initAudio();const notes=[196,247,294,330,294,247,220,262];let i=0;const tick=()=>{if(!state.sound)return;tone(notes[i++%notes.length],.22,.010,'sine');};tick();state.musicTimer=setInterval(tick,520)}
  function stopMusic(){clearInterval(state.musicTimer);state.musicTimer=0}
  function foundSound(){tone(523,.12,.04,'triangle');tone(659,.14,.035,'triangle',.10);tone(784,.22,.035,'triangle',.22)}
  function updateSound(){localStorage.setItem(STORE_SOUND,state.sound?'on':'off');$('soundMenuBtn').textContent=state.sound?'🔊 Música ligada':'🔇 Música desligada';$('soundGameBtn').textContent=state.sound?'🔊':'🔇';if(state.sound&&screens.game.classList.contains('active'))startMusic();else stopMusic()}
  $('soundMenuBtn').addEventListener('click',()=>{state.sound=!state.sound;updateSound()});$('soundGameBtn').addEventListener('click',()=>{state.sound=!state.sound;updateSound()});updateSound();

  function tick(){if(!state.running)return;state.lastElapsed=performance.now()-state.startedAt;$('timer').textContent=fmt(state.lastElapsed);state.raf=requestAnimationFrame(tick)}
  function resetView(){state.zoom=1;state.panX=0;state.panY=0;applyTransform()}
  function clampPan(){const v=$('mapViewport').getBoundingClientRect();const maxX=(v.width*(state.zoom-1))/2,maxY=(v.height*(state.zoom-1))/2;state.panX=Math.max(-maxX,Math.min(maxX,state.panX));state.panY=Math.max(-maxY,Math.min(maxY,state.panY))}
  function applyTransform(){clampPan();$('mapContent').style.transform=`translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;$('zoomLabel').textContent=`${Math.round(state.zoom*100)}%`;$('mapViewport').classList.toggle('can-pan',state.zoom>1.001)}
  function setZoom(z){state.zoom=Math.max(1,Math.min(3,z));if(state.zoom===1){state.panX=0;state.panY=0}applyTransform()}
  $('zoomInBtn').addEventListener('click',()=>setZoom(state.zoom+.25));$('zoomOutBtn').addEventListener('click',()=>setZoom(state.zoom-.25));$('zoomResetBtn').addEventListener('click',resetView);
  $('mapViewport').addEventListener('wheel',e=>{e.preventDefault();setZoom(state.zoom*(e.deltaY<0?1.12:.89))},{passive:false});
  const viewport=$('mapViewport');
  viewport.addEventListener('pointerdown',e=>{if(e.target===$('targetHitbox'))return;viewport.setPointerCapture?.(e.pointerId);state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(state.pointers.size===1&&state.zoom>1){viewport.classList.add('dragging')}if(state.pointers.size===2){const pts=[...state.pointers.values()];state.pinchStart=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);state.pinchZoom=state.zoom}});
  viewport.addEventListener('pointermove',e=>{if(!state.pointers.has(e.pointerId))return;const prev=state.pointers.get(e.pointerId);state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(state.pointers.size===2){const pts=[...state.pointers.values()];const d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(state.pinchStart)setZoom(state.pinchZoom*(d/state.pinchStart));return}if(state.zoom>1&&state.pointers.size===1){state.panX+=e.clientX-prev.x;state.panY+=e.clientY-prev.y;applyTransform()}});
  function endPointer(e){state.pointers.delete(e.pointerId);if(state.pointers.size<2)state.pinchStart=null;if(!state.pointers.size)viewport.classList.remove('dragging')}
  viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',endPointer);

  function loadPhase(){const p=state.phases[state.index];resetView();$('phaseLabel').textContent=`${state.index+1}/${state.count}`;$('difficultyLabel').textContent=DIFF[state.difficulty].toUpperCase();$('sceneImage').src=p.src;$('sceneImage').alt=`${p.name} — encontre Brownly`;$('referenceImage').src=`assets/characters/brownly-pose-${p.pose}.svg`;const h=$('targetHitbox'),t=p.target;h.style.left=`${t.x-t.w/2}%`;h.style.top=`${t.y-t.h/2}%`;h.style.width=`${t.w}%`;h.style.height=`${t.h}%`;h.setAttribute('aria-label','');$('playLayout').classList.toggle('reference-right',state.index%2===0)}

  function startGame(){const pool=PHASES.filter(p=>p.difficulty===state.difficulty);state.phases=shuffle(pool).slice(0,state.count);state.index=0;state.startedAt=performance.now();state.lastElapsed=0;state.running=true;show('game');loadPhase();startMusic();cancelAnimationFrame(state.raf);tick()}
  $('startForm').addEventListener('submit',e=>{e.preventDefault();const name=$('playerName').value.trim();if(!name){$('playerName').focus();return}const {d,c}=currentSelections();state.player=name;state.difficulty=d;state.count=c;initAudio();startGame()});

  $('targetHitbox').addEventListener('click',e=>{e.stopPropagation();if(!state.running)return;foundSound();const elapsed=performance.now()-state.startedAt;$('foundTime').textContent=fmt(elapsed);$('foundOverlay').classList.add('show');setTimeout(()=>{$('foundOverlay').classList.remove('show');if(state.index<state.phases.length-1){state.index++;loadPhase()}else finishGame()},760)});
  function finishGame(){state.running=false;cancelAnimationFrame(state.raf);stopMusic();const time=performance.now()-state.startedAt;state.lastElapsed=time;const all=rankings();all.push({name:state.player,difficulty:state.difficulty,count:state.count,time,date:Date.now()});saveRanks(all);const rows=modeRows(state.difficulty,state.count);const pos=rows.findIndex(r=>r.name===state.player&&r.time===time)+1;$('resultPlayer').textContent=`${state.player}, você encontrou Brownly em todas as fases.`;$('resultTime').textContent=fmt(time);$('resultPosition').textContent=pos>0?`#${pos}`:'—';$('resultMode').textContent=`Ranking ${DIFF[state.difficulty]} • ${state.count} fases`;show('result');renderRanking(state.difficulty,state.count);tone(523,.2,.03,'triangle');tone(659,.2,.03,'triangle',.18);tone(784,.35,.03,'triangle',.36)}
  $('playAgainBtn').addEventListener('click',()=>{initAudio();startGame()});$('backMenuBtn').addEventListener('click',()=>{show('menu');stopMusic();renderRanking(state.difficulty,state.count)});$('exitBtn').addEventListener('click',()=>{if(confirm('Voltar ao menu? O tempo desta partida será perdido.')){state.running=false;cancelAnimationFrame(state.raf);stopMusic();show('menu')}});
  window.addEventListener('resize',applyTransform);window.addEventListener('dragstart',e=>e.preventDefault());document.addEventListener('contextmenu',e=>{if(screens.game.classList.contains('active'))e.preventDefault()});
  renderRanking('facil',3);
})();
