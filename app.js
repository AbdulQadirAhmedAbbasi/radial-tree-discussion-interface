/* Discussion Atlas — source-faithful, dependency-free Reddit discussion viewer.
 * No network calls, external libraries, machine-learning, semantic labels, or fact checking.
 * The visualization derives observable hierarchy and literal text indicators only.
 */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const color = {normal:'#477fae',url:'#168a79',question:'#d19437',missing:'#c9d2dc',root:'#203f5b'};
  const params = new URLSearchParams(window.location.search);
  const studying = params.get('study') === '1';
  const embedded = studying && params.get('embed') === '1';
  const conditionParam = (params.get('condition') || '').toLowerCase();
  const studyCondition = ['b', 'cues', 'enhanced'].includes(conditionParam) ? 'cues' : 'structure';
  const studyCaseId = (params.get('case') || '').trim();
  const participantId = (params.get('participant') || '').trim().slice(0, 80);
  const taskId = (params.get('task') || '').trim().slice(0, 80);
  const study = {started:false,ready:false,finished:false, startedAtISO:null, startedAtPerf:null, endedAtISO:null, elapsedMs:null, explorationMs:null,
                 actions:[], answer:'', confidence:null, signalRatings:null,signalExplanation:''};
  const SOURCE_CLASSES = { direct_scholarly_url_candidate: 'Scholarly source', institutional_research_announcement_candidate:'Institutional report', science_media_research_report_candidate:'Science media'};
  const state = {
    cases: [], selectedCase: null, selectedId: null, view:'radial', cue:'all',
    sizeMode:'length', search:'', searchMatches:[], matchIndex:0,
    graph:null, positions:new Map(),
    panX:0, panY:0, scale:1, fitScale:1, dims:{w:800,h:600},
    dragging:null, hasFitted:false, autoFit:true, rootLimit:Infinity,
  };
  const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  function safeURL(raw) {
    if (typeof raw !== 'string') return '';
    try {const parsed=new URL(raw, 'https://www.reddit.com'); return ['http:','https:'].includes(parsed.protocol)?parsed.href:'';} catch{return '';}
  }
  function asList(value) {return Array.isArray(value)?value:[];}
  function num(v) { const n=Number(v); return Number.isFinite(n)?n:0; }
  function utc(value) {
    const n=Number(value); if (!Number.isFinite(n)||!n) return 'Not recorded';
    try{return new Date(n*1000).toLocaleString(undefined,{timeZone:'UTC',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})+' UTC';}catch{return 'Not recorded';}
  }
  function short(s,len=100){s=String(s??'').replace(/\s+/g,' ').trim();return s.length>len?s.slice(0,len-1)+'…':s;}
  function formatCount(n){return Number(n).toLocaleString();}
  function setStatus(s){$('status').textContent=s;}
  function recordAction(type, data={}){
    if(!studying || !study.started || study.finished) return;
    study.actions.push({ms:Math.round(performance.now()-study.startedAtPerf),type,...data});
  }
  function exportStudy(){
    const report={schema_version:'2.0',study:'Radial-context-cue-evaluation',participant_id:participantId,
      task_id:taskId,post_id:String(state.selectedCase?.post.id || ''),condition:studyCondition,
      started_at_utc:study.startedAtISO,completed_at_utc:study.endedAtISO,
      total_elapsed_ms:study.elapsedMs,exploration_elapsed_ms:study.explorationMs,answer:study.answer,confidence:study.confidence,
      signal_ratings:study.signalRatings,signal_explanation:study.signalExplanation,actions:study.actions};
    const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    const clean=x=>(x||'unknown').replace(/[^a-zA-Z0-9_-]/g,'_');
    a.href=url;a.download=`session_${clean(participantId)}_${clean(taskId)}_${clean(state.selectedCase?.post.id)}_${studyCondition}.json`;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function initStudyControls(){
    if(!studying)return;
    document.body.classList.add('study-mode');
    if (embedded) document.body.classList.add('study-embedded');
    document.body.dataset.condition=studyCondition;
    // The baseline keeps the same original content, relationship structure, inspector, search and navigation.
    // Only the additional visual/textual markers and cue highlighting change.
    state.sizeMode=studyCondition==='structure'?'uniform':'length'; // Node-size cue is shown only in the enhanced condition.
    $('studyBanner').classList.remove('hidden');
    $('studyMeta').textContent=`Participant ${participantId||'not assigned'} · Task ${taskId||'not assigned'} · Post ${studyCaseId||'not assigned'}`;
    for(const id of ['caseLibraryHeading','caseSearch','caseList','viewTabs','sizeModeLabel','sizeMode','downloadPost','fileUpload'])$(id).classList.add('hidden');
    document.querySelector('label[for="fileUpload"]').classList.add('hidden');
    if(studyCondition==='structure')for(const id of ['cueHeading','cueButtons','cueDisclaimer'])$(id).classList.add('hidden');
    else $('cueDisclaimer').textContent='Amber = a ? character; teal = a URL; pink = a Markdown quotation. Multiple colors mean multiple observed cues. Node area increases with character count (capped); no cue indicates correctness.';
    if(studyCondition==='structure')document.querySelector('.left-panel .hint').innerHTML='<b>Using the radial tree</b><br>Click a node to read the surrounding conversation. Search highlights matches in the tree; the reading panel does not change until you select a comment or navigate to a match. Gray outlined nodes represent unavailable text and still connect replies.';
    renderLegend();
    $('studyStart').addEventListener('click',()=>{
      if(study.finished||study.ready)return;
      if(!study.started){
        study.started=true;study.startedAtISO=new Date().toISOString();study.startedAtPerf=performance.now();
        $('studyStart').textContent='Ready to answer';$('studyTimer').textContent='Task in progress';
        recordAction('task_start');return;
      }
      // Exploration ends here, before the participant types the answer or rates the cues.
      recordAction('exploration_complete');study.ready=true;
      study.explorationMs=Math.round(performance.now()-study.startedAtPerf);
      $('studyStart').disabled=true;$('studyStart').textContent='Exploration finished';
      $('studyTimer').textContent=`Exploration ${(study.explorationMs/1000).toFixed(1)} s`;
      $('studyResponse').classList.remove('hidden');
      if(studyCondition==='cues')$('studyCueRatings').classList.remove('hidden');
      document.body.classList.add('study-answer-stage');
      if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
      $('studyAnswer').focus();
    });
    $('studyFinish').addEventListener('click',()=>{
      if(!study.ready||study.finished)return;
      const answer=$('studyAnswer').value.trim(),confidence=$('studyConfidence').value;
      if(!answer){alert('Please enter your task answer before finishing.');return;}
      if(!confidence){alert('Please choose a confidence rating before finishing.');return;}
      recordAction('task_finish');study.finished=true;study.answer=answer;study.confidence=Number(confidence);
      if(studyCondition==='cues'){
        study.signalRatings=Object.fromEntries(Array.from(document.querySelectorAll('#studyCueRatings [data-signal]')).map(e=>[e.dataset.signal,Number(e.value)]));
        study.signalExplanation=$('studyCueWhy').value.trim();
      }
      study.endedAtISO=new Date().toISOString();study.elapsedMs=Math.round(performance.now()-study.startedAtPerf);
      $('studyResponse').classList.add('hidden');$('studyDone').classList.remove('hidden');
      $('studyDone').innerHTML='Task completed. The response file should download to your device. <button id="studyDownloadAgain">Download response again</button>';
      $('studyDownloadAgain').addEventListener('click',exportStudy);
      $('studyTimer').textContent=`Exploration ${(study.explorationMs/1000).toFixed(1)} s`;
      exportStudy();
    });
  }
  // An activity transition clears the VIEWER, not the dataset or prior activity logs.
  // Keep the graph structure, cues assigned to this condition, and study action history.
  function resetForNextActivity(activity) {
    if (!embedded || !studying || !state.graph) return;
    const previousSelection = state.selectedId;
    const previousSearch = state.search;
    const previousCue = state.cue;
    state.selectedId = state.graph.root.id;
    state.search = '';
    state.searchMatches = [];
    state.matchIndex = 0;
    $('searchBox').value = '';
    $('matchCount').textContent = 'Search to highlight comments';
    state.cue = 'all';
    document.querySelectorAll('#cueButtons button[data-cue]').forEach(button => {
      const active = button.dataset.cue === 'all';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    state.dragging = null;
    $('treeSvg').classList.remove('dragging');
    $('tooltip').style.display = 'none';
    // Refit without recomputing different node positions: the hierarchy stays fixed.
    drawGraph(true);
    renderDetails(state.graph.root);
    $('details').scrollTop = 0;
    recordAction('activity_view_reset', {
      activity: Number(activity),
      cleared_selection: previousSelection !== state.graph.root.id,
      cleared_search: Boolean(previousSearch),
      cleared_cue: previousCue !== 'all',
      view_reset_to: 'original_post_fit'
    });
    window.parent.postMessage({type:'ATLAS_ACTIVITY_RESET', activity:Number(activity),
      case_id:studyCaseId, condition:studyCondition}, location.origin);
  }
  // Embedded evaluation portal bridge: share only observable interactions, not page content.
  if (embedded) window.addEventListener('message', e => {
    if (e.source !== window.parent || e.origin !== location.origin) return;
    if (e.data?.type === 'ATLAS_RESET_ACTIVITY') {
      resetForNextActivity(e.data.activity);
    } else if (e.data?.type === 'ATLAS_START') {
      if (!study.started) $('studyStart').click();
    } else if (e.data?.type === 'ATLAS_SNAPSHOT') {
      window.parent.postMessage({type:'ATLAS_SNAPSHOT', case_id:studyCaseId, condition:studyCondition,
        started:study.started, elapsed_ms:study.started ? Math.round(performance.now()-study.startedAtPerf) : 0,
        actions:study.actions.slice()}, '*');
    } else if (e.data?.type === 'ATLAS_STOP') {
      if (study.started && !study.ready) $('studyStart').click();
      window.parent.postMessage({type:'ATLAS_STOPPED',case_id:studyCaseId,condition:studyCondition,
        exploration_ms:study.explorationMs, actions:study.actions.slice()}, '*');
    }
  });
  function readCases(json) {
    const output=[];
    function walk(item, community='unknown'){
      if (Array.isArray(item)) {for(const obj of item) walk(obj,community);return;}
      if(!item||typeof item!=='object') return;
      if (Array.isArray(item.cases)){walk(item.cases,community);return;}
      if(item.submission && typeof item.submission==='object'){
        const p=item.submission;
        output.push({post:p,subreddit:item.subreddit||p.subreddit||community,research:item.verified_research||item.research||null});return;
      }
      if (Array.isArray(item.submissions)){walk(item.submissions,item.subreddit||community);return;}
      if(Array.isArray(item.posts)){walk(item.posts,item.subreddit||community);return;}
      if((item.id!==undefined || item.name!==undefined) && ('comments' in item || 'title' in item)){
        output.push({post:item,subreddit:item.subreddit||community,research:null});return;
      }
    }
    walk(json);
    if(!output.length) throw new Error('No Reddit submissions found. Expected a post with id/title/comments, subreddit groups, or {cases:[{submission:...}]}.');
    return output;
  }
  function makeGraph(entry){
    const post=entry.post;
    const root={id:'post:'+String(post.id??'unknown'),postId:String(post.id??'unknown'),kind:'post',body:String(post.selftext??''),title:String(post.title??'Untitled Reddit submission'), author:'Original post',score:num(post.score),depth:-1,level:0,parent:null,children:[],original:post};
    const nodes=[root], byId=new Map([[root.id,root]]);
    let missing=0,maxDepth=-1,rootCount=0,visibleEdges=0;
    const stack=[];
    for(let i=asList(post.comments).length-1;i>=0;i--) stack.push({raw:post.comments[i],parent:root,depth:0,path:String(i)});
    while(stack.length){
      const {raw,parent,depth,path}=stack.pop();if(!raw||typeof raw!=='object')continue;
      const body=raw.body==null?'':String(raw.body);
      const unavailable=body.trim()==='' || /^\[(deleted|removed)\]$/i.test(body.trim());
      const hasURL=/(?:https?:\/\/|www\.)[^\s<>()]+/i.test(body);
      const hasQuestion=body.includes('?');
      const hasQuote=/(?:^|\n)\s*>/.test(body);
      const rawId=raw.id==null ? `missing-${path}`:String(raw.id);
      let id='comment:'+rawId;if(byId.has(id)) id+=':'+path;
      const child={id,rawId,kind:'comment',body,author:raw.author===null||raw.author===undefined?'[unknown]':String(raw.author),score:num(raw.score),depth,level:depth+1,parent,children:[],original:raw,missing:unavailable,hasURL,hasQuestion,hasQuote};
      parent.children.push(child);nodes.push(child);byId.set(id,child);
      missing+=unavailable?1:0; maxDepth=Math.max(maxDepth,depth);
      if(depth===0)rootCount++;
      if(parent.kind==='comment' && !parent.missing && !child.missing)visibleEdges++;
      const children=asList(raw.replies);
      for(let i=children.length-1;i>=0;i--)stack.push({raw:children[i],parent:child,depth:depth+1,path:path+'-'+i});
    }
    // Iterative subtree sizes, allowing a preview of huge threads without truncating data.
    for(let i=nodes.length-1;i>=0;i--){const n=nodes[i];n.subtreeCount=1+n.children.reduce((sum,c)=>sum+c.subtreeCount,0);}
    return {root,nodes,byId,missing,maxDepth,rootCount,visibleEdges,captured:nodes.length-1};
  }
  function renderLegend(){
    const legend=$('visualLegend');if(!legend)return;
    const showCues=!studying || studyCondition==='cues';
    const items=[
      {cls:'legend-root',label:'Post',help:'The center node represents the original Reddit submission.'},
      {cls:'legend-normal',label:'Comment',help:'A blue node is a captured comment. Lines connect replies; rings indicate depth.'},
    ];
    if(showCues)items.push(
      {cls:'legend-question',label:'? mark',help:'Amber identifies a literal question-mark character. This does not classify a comment as a question.'},
      {cls:'legend-url',label:'URL',help:'Teal identifies a link in the comment text. It does not verify the linked source.'},
      {cls:'legend-quote',label:'Quote',help:'Pink identifies Markdown quotation markup. It does not determine what the passage means.'},
      {cls:'legend-multi',label:'Combined',help:'A split-color node contains two or more of the listed text cues.'}
    );
    items.push({cls:'legend-missing',label:'Text unavailable',help:'The source dataset contains [deleted], [removed], or no text for this comment. Its replies are still preserved. This node is part of the reply structure.'});
    legend.innerHTML=items.map(item=>`<span class="legend-item" tabindex="0" data-help="${escapeHTML(item.help)}" aria-label="${escapeHTML(item.label + ": " + item.help)}"><i class="legend-dot ${item.cls}" aria-hidden="true"></i><span>${item.label}</span></span>`).join('');
    if(showCues)legend.insertAdjacentHTML('beforeend','<span class="legend-note" tabindex="0" data-help="Node area increases with recorded character count, up to a cap. A minimum size preserves short comments. Dense branches may reduce some circles to prevent overlap." aria-label="Size tracks text length: Node area increases with recorded character count, up to a cap. A minimum size preserves short comments. Dense branches may reduce some circles to prevent overlap.">Size tracks text length</span>');
  }
  function cueColors(node){
    if(node.kind==='post' || node.missing || (studying&&studyCondition==='structure')) return [];
    const cues=[];
    if(node.hasURL)cues.push(color.url);
    if(node.hasQuestion)cues.push(color.question);
    if(node.hasQuote)cues.push('#ce5b86');
    return cues;
  }
  function assignColors(node){
    if(node.kind==='post')return color.root;
    if(node.missing)return color.missing;
    const cues=cueColors(node);
    return cues.length?cues[0]:color.normal;
  }
  // Transparent continuous scaling: circle area, not radius, increases with
  // recorded comment length (capped at 1,200 chars). A nonzero minimum radius
  // keeps short comments identifiable. Collision correction is applied later.
  function lengthRadius(characters){
    const capped=Math.min(1200,Math.max(0,Number(characters)||0));
    return 3.2*Math.sqrt(1+capped/120);
  }
  function nodeSize(node){
    if(node.kind==='post')return 14;
    if(node.missing)return (studying&&studyCondition==='structure')?5:4; // faint placeholder, no special emphasis
    if(studying)return studyCondition==='structure'?5:lengthRadius(node.body.length);
    if(state.sizeMode==='length')return lengthRadius(node.body.length);
    if(state.sizeMode==='uniform')return 5;
    if(state.sizeMode==='score')return 3.2+Math.log1p(Math.max(0,node.score))*0.85;
    return lengthRadius(node.body.length);
  }
  function matchesCue(node){
    if(node.kind==='post')return true;
    switch(state.cue){case 'url':return node.hasURL;case 'question':return node.hasQuestion;case 'quote':return node.hasQuote;default:return true;}
  }
  function isInPath(n){let c=state.graph?.byId.get(state.selectedId);while(c){if(c.id===n.id)return true;c=c.parent;}return false;}
  function makeSvg(name,attrs,parent){let e=document.createElementNS(NS,name);for(let[k,v]of Object.entries(attrs||{}))e.setAttribute(k,String(v));parent?.appendChild(e);return e;}
  function setSVGDimensions(){
    const rect=$('treeSvg').getBoundingClientRect();
    state.dims.w=Math.max(150,Math.round(rect.width));state.dims.h=Math.max(150,Math.round(rect.height));
    $('treeSvg').setAttribute('viewBox',`0 0 ${state.dims.w} ${state.dims.h}`);
  }
  function visibleLayout(){
    const graph=state.graph;
    // Positions are calculated from the complete reply tree, never the current
    // selection or whether a conversation has been expanded in the reading pane.
    // Thus clicking any comment cannot move another comment.
    const visible=graph.nodes;
    const maxDepth=Math.max(0,graph.maxDepth+1);
    const positions=new Map(),R=420;
    const rFor=d=>d<=0?0:70+Math.sqrt(d/Math.max(1,maxDepth))*(R-70);
    const stack=[{node:graph.root,a:-Math.PI/2,b:3*Math.PI/2}];
    while(stack.length){
      const {node:n,a,b}=stack.pop(),theta=(a+b)/2;
      positions.set(n.id,{x:rFor(n.level)*Math.cos(theta),y:rFor(n.level)*Math.sin(theta),angle:theta,r:rFor(n.level),node:n});
      const children=n.children;
      const divisor=Math.max(1,n.subtreeCount-1);
      const intervals=[];let cursor=a;
      for(const child of children){
        const right=cursor+(b-a)*child.subtreeCount/divisor;
        intervals.push({node:child,a:cursor,b:right});cursor=right;
      }
      for(let i=intervals.length-1;i>=0;i--)stack.push(intervals[i]);
    }
    return {positions,visible,maxDepth,R,rFor};
  }
  function edgePath(a,b){
    // Rounded radial bend makes parent-child relationships easier to follow.
    const mid=(a.r+b.r)/2;
    const xa=mid*Math.cos(a.angle),ya=mid*Math.sin(a.angle);
    const xb=mid*Math.cos(b.angle),yb=mid*Math.sin(b.angle);
    return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} C ${xa.toFixed(2)} ${ya.toFixed(2)} ${xb.toFixed(2)} ${yb.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  }
  function fit(){
    // Fit the full radial extent tightly to the *actual* canvas, not a
    // conservative 900-unit box. The outer depth ring is r=420; the extra
    // 10 units include the largest circles and selection strokes.
    setSVGDimensions();
    const {w,h}=state.dims;
    const diameter=860, inset=12;
    state.fitScale=Math.max(0.05,Math.min((w-2*inset)/diameter,(h-2*inset)/diameter));
    state.scale=state.fitScale;
    state.panX=0;state.panY=0;
    state.autoFit=true;
    applyTransform();
  }
  function applyTransform(){
    const{w,h}=state.dims;
    $('viewport').setAttribute('transform',`translate(${(w/2+state.panX).toFixed(2)},${(h/2+state.panY).toFixed(2)}) scale(${state.scale.toFixed(5)})`);
  }
  // Compute stable, non-overlapping radii using only node positions and source
  // attributes. No selected-node state or interaction history enters the calculation.
  // The baseline remains uniformly sized; enhanced length sizing is collision-safe.
  // A spatial hash avoids quadratic work on large discussion trees.
  function collisionSafeRadii(visible,positions){
    const radii=new Map(visible.map(n=>[n.id,nodeSize(n)]));
    const enhanced = !studying || studyCondition==='cues';
    if(!enhanced)return radii;
    const cellSize=27,buckets=new Map(),key=(x,y)=>`${x}:${y}`;
    for(const n of visible){
      const p=positions.get(n.id),x=Math.floor(p.x/cellSize),y=Math.floor(p.y/cellSize);
      const id=key(x,y);if(!buckets.has(id))buckets.set(id,[]);
      buckets.get(id).push(n);
    }
    const limits=new Map(visible.map(n=>[n.id,1]));
    for(const n of visible){
      const p=positions.get(n.id),cx=Math.floor(p.x/cellSize),cy=Math.floor(p.y/cellSize);
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        for(const other of (buckets.get(key(cx+dx,cy+dy))||[])){
          if(other===n)continue;
          const q=positions.get(other.id),dist=Math.hypot(p.x-q.x,p.y-q.y);
          const desired=radii.get(n.id)+radii.get(other.id);
          if(dist<desired+1){
            // Scaling both circles by this factor preserves their size ratio.
            const factor=Math.max(0.02,(dist-1)/desired);
            limits.set(n.id,Math.min(limits.get(n.id),factor));
          }
        }
      }
    }
    for(const n of visible)radii.set(n.id,Math.max(1.35,radii.get(n.id)*limits.get(n.id)));
    return radii;
  }
  // Pie-like sectors keep two or three simultaneous literal cues INSIDE the node,
  // rather than stacking rings that can collide with neighboring comment circles.
  function cueSectorPath(cx,cy,r,start,end){
    const px=a=>cx+Math.cos(a)*r,py=a=>cy+Math.sin(a)*r;
    const delta=end-start,large=delta>Math.PI?1:0;
    return `M ${cx} ${cy} L ${px(start)} ${py(start)} A ${r} ${r} 0 ${large} 1 ${px(end)} ${py(end)} Z`;
  }
  function drawGraph(resetZoom=false){
    if(!state.graph)return;
    setSVGDimensions();
    const {positions,visible,maxDepth,rFor}=visibleLayout();state.positions=positions;
    const safeRadii=collisionSafeRadii(visible,positions);
    $('rings').replaceChildren();$('edges').replaceChildren();$('nodes').replaceChildren();
    // Limit depth lines to 8 labeled rings; all individual comments remain present.
    if(maxDepth){for(let k=1;k<=Math.min(8,maxDepth);k++){
      const depth=Math.max(1,Math.round(maxDepth*k/Math.min(8,maxDepth)));
      makeSvg('circle',{r:rFor(depth)},$('rings'));
      if(k===1||k===Math.min(8,maxDepth)||k%2===0){let t=makeSvg('text',{class:'svg-depth',x:6,y:-rFor(depth)+12},$('rings'));t.textContent='depth '+(depth-1);}
    }}
    const selectedPath=new Set();let s=state.graph.byId.get(state.selectedId);while(s){selectedPath.add(s.id);s=s.parent;}
    for(const n of visible){
      if(!n.parent)continue;
      const a=positions.get(n.parent.id), b=positions.get(n.id);
      let selected=selectedPath.has(n.id)&&selectedPath.has(n.parent.id);
      const dim=(state.cue!=='all'&&!matchesCue(n)) || (!!state.search && !state.searchMatches.includes(n.id));
      makeSvg('path',{d:edgePath(a,b),class:`${selected?'focused':''} ${!selected&&dim?'dim':''}`},$('edges'));
    }
    for(const n of visible){
      const p=positions.get(n.id), size=safeRadii.get(n.id);
      let classes='node'+(n.kind==='post'?' root':'')+(n.missing?' missing':'')+(state.selectedId===n.id?' selected':'');
      const cueMismatch=state.cue!=='all' && !matchesCue(n);
      const searchMismatch=state.search!=='' && !state.searchMatches.includes(n.id) && n.kind!=='post';
      if((cueMismatch||searchMismatch)&&n.kind!=='post'&&state.selectedId!==n.id)classes+=' dim';
      if(state.search!==''&&state.searchMatches.includes(n.id))classes+=' hit';
      const nodeEl=makeSvg('circle',{cx:p.x,cy:p.y,r:size,fill:assignColors(n),class:classes,tabindex:'0',role:'button','aria-label':n.kind==='post'?'Original Reddit post':`Comment by ${n.author}, depth ${n.depth}`},$('nodes'));
      nodeEl.dataset.nodeId=n.id;
      nodeEl.addEventListener('click',event=>{event.stopPropagation();selectNode(n.id)});
      nodeEl.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectNode(n.id)}});
      nodeEl.addEventListener('mouseenter',event=>showTip(event,n));
      nodeEl.addEventListener('mousemove',event=>moveTip(event));
      nodeEl.addEventListener('mouseleave',()=>{$('tooltip').style.display='none'});
      // Multiple cues use split fills in the SAME circle: no extra outer rings.
      // The main circle retains the click/hover target and selection outline.
      const cueFills=cueColors(n);
      if(cueFills.length>1){
        const slice=2*Math.PI/cueFills.length,angle0=-Math.PI/2;
        for(let i=1;i<cueFills.length;i++){
          const a=angle0+i*slice,b=a+slice;
          makeSvg('path',{d:cueSectorPath(p.x,p.y,Math.max(0.1,size-0.45),a,b),
            fill:cueFills[i],class:'cue-sector','aria-hidden':'true'},$('nodes'));
        }
      }
    }
    if(resetZoom||!state.hasFitted){fit();state.hasFitted=true;}else{applyTransform();}
    const sizeLabel=studying?(studyCondition==='structure'?'Uniform comment nodes':'Node size = comment length'):(state.sizeMode==='uniform'?'Uniform comment nodes':state.sizeMode==='score'?'Node size = Reddit score':'Node size = comment length');
    $('mapCaption').textContent=`${formatCount(visible.length-1)} / ${formatCount(state.graph.captured)} comments · ${sizeLabel}`;
  }
  function showTip(event,node){
    const t=$('tooltip');t.replaceChildren();
    const author=node.author==='[unknown]'?'Author not recorded':`u/${node.author}`;
    const label=document.createElement('b');label.textContent=node.kind==='post'?'Original Reddit post':
      `${author} · score ${formatCount(node.score)}${(!studying||studyCondition==='cues')?` · ${formatCount(node.body.length)} characters`:''}`;
    const content=document.createElement('div');content.style.marginTop='4px';
    content.textContent=node.kind==='post'?short(node.title,165):(node.body.trim()||'[No comment text captured]');
    if(node.kind!=='post')content.textContent=short(content.textContent,180);
    t.append(label,content);
    if(node.missing){const why=document.createElement('div');why.className='tooltip-missing';why.textContent='Text unavailable in dataset · replies are still connected';t.append(why);}
    t.style.display='block';moveTip(event);
  }
  function moveTip(event){const t=$('tooltip'),r=$('viewArea').getBoundingClientRect();let x=event.clientX-r.left+14,y=event.clientY-r.top+14;const tw=t.offsetWidth,th=t.offsetHeight;if(x+tw>r.width-8)x=x-tw-30;if(y+th>r.height-8)y=y-th-30;t.style.left=Math.max(3,x)+'px';t.style.top=Math.max(3,y)+'px';}
  function selectNode(id){
    if(!state.graph||!state.graph.byId.has(id))return;
    state.selectedId=id;
    recordAction('select_node',{node_id:id});
    if(embedded)window.parent.postMessage({type:'ATLAS_SELECTION',node_id:id,case_id:studyCaseId},'*');
    // Stable tree: selecting does not remove or reposition any node.
    if(state.view==='radial')drawGraph();
    if(state.view==='list')renderList();
    renderDetails(state.graph.byId.get(id));
  }
  function makeLink(url,label){const link=safeURL(url);if(studying)return escapeHTML(label)+(link?' (URL recorded)':'');return link?`<a href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)} ↗</a>`:escapeHTML(label);}
  function metaLine(label,value){return `<dt>${escapeHTML(label)}</dt><dd>${value}</dd>`;}
  function conversationCard(n,level=0,selected=false,context=false){
    // All text is original, escaped comment content; no generated summaries or labels.
    const author=n.author==='[unknown]'?'Author not recorded':'u/'+n.author;
    const content=n.body.trim()?n.body:'[No comment text captured]';
    const marker=(!studying||studyCondition==='cues')&&!n.missing?
      [n.hasQuestion?'<span class="cue-chip question">? mark</span>':'',n.hasURL?'<span class="cue-chip url">URL</span>':'',n.hasQuote?'<span class="cue-chip quote">Quotation</span>':''].join(''):'';
    return `<article class="conversation-card${selected?' current':''}${n.missing?' unavailable':''}${context?' ancestor':''}" style="--reply-indent:${Math.min(5,level)}" data-comment-id="${escapeHTML(n.id)}">
      <div class="conversation-card-head"><button type="button" class="conversation-select" data-jump="${escapeHTML(n.id)}" aria-label="Show ${escapeHTML(author)} in the radial tree">${escapeHTML(author)}</button><span class="comment-score">Score ${escapeHTML(String(n.score))}</span></div>
      <div class="conversation-body">${escapeHTML(content)}</div>${n.missing?'<p class="missing-explanation">Comment text is unavailable in this dataset; the reply chain is preserved for context.</p>':''}${marker?`<div class="conversation-cues">${marker}</div>`:''}
    </article>`;
  }
  function renderDetails(n){
    if(!n)return;
    const div=$('details'),root=state.graph.root;
    let html='';
    if(n.kind==='post'){
      html+='<p class="inspector-guide">Select a comment in the radial tree or below. The original post stays above; the reading panel will show its reply chain and following discussion.</p>';
      html+=`<p class="section-kicker">Top-level comments (${root.children.length})</p>`;
      html+='<div class="conversation-stack">';
      for(const child of root.children)html+=conversationCard(child,0,false,false);
      html+='</div>';
    }else{
      const chain=[];let cursor=n;
      while(cursor&&cursor.kind!=='post'){chain.push(cursor);cursor=cursor.parent;}
      chain.reverse();
      html+=`<div class="conversation-section-head"><span class="section-kicker">Conversation path · ${chain.length} comment${chain.length===1?'':'s'}</span></div>`;
      html+='<div class="conversation-stack">';
      for(let i=0;i<chain.length;i++)html+=conversationCard(chain[i],i,chain[i]===n,chain[i]!==n);
      html+='</div>';
      const descendantCount=n.subtreeCount-1;
      if(descendantCount){
        // The reading-panel collapse is LOCAL and never changes the radial layout.
        html+=`<details class="reading-replies" open><summary>Replies in this branch (${descendantCount}) <span class="reading-only">· reading panel only</span></summary><div class="conversation-stack reply-stack" id="conversationReplies"></div></details>`;
      } else html+='<p class="no-followups">No captured replies to this comment.</p>';
    }
    div.innerHTML=html;
    if(n.kind!=='post'&&n.children.length){
      const target=div.querySelector('#conversationReplies');
      const subtree=[];
      const stack=[];
      for(let i=n.children.length-1;i>=0;i--)stack.push({node:n.children[i],level:1});
      while(stack.length){
        const item=stack.pop();subtree.push(item);
        for(let i=item.node.children.length-1;i>=0;i--)stack.push({node:item.node.children[i],level:item.level+1});
      }
      const batch=160;
      let offset=0;
      const addBatch=()=>{
        const slice=subtree.slice(offset,offset+batch);
        target.insertAdjacentHTML('beforeend',slice.map(item=>conversationCard(item.node,item.level,false,false)).join(''));
        offset+=slice.length;
        const existing=div.querySelector('#moreReadingReplies');if(existing)existing.remove();
        if(offset<subtree.length){
          const b=document.createElement('button');b.id='moreReadingReplies';b.className='load-more-replies';
          b.textContent=`Read more replies (${offset} of ${subtree.length} shown)`;
          b.addEventListener('click',addBatch);target.after(b);
        }
      };
      addBatch();
      div.querySelector('.reading-replies')?.addEventListener('toggle',e=>{
        recordAction('reading_replies_toggle',{node_id:n.id,open:e.currentTarget.open});
      });
    }
    // Preserve the full ancestor chain but put the *selected* card in view.
    // This scrolls only the right inspector, never the page or radial canvas.
    div.scrollTop=0;
    if(n.kind!=='post'){
      requestAnimationFrame(()=>{
        if(state.selectedId!==n.id)return; // superseded by a newer click
        const target=Array.from(div.querySelectorAll('.conversation-card'))
          .find(el=>el.dataset.commentId===n.id);
        if(!target)return;
        const panelBox=div.getBoundingClientRect(),cardBox=target.getBoundingClientRect();
        const nextTop=div.scrollTop+cardBox.top-panelBox.top-10;
        // Short leaf comments near the end of a chain otherwise cannot reach
        // the top because the inspector runs out of scrollable content.
        const maxScroll=div.scrollHeight-div.clientHeight;
        if(nextTop>maxScroll){
          const spacer=document.createElement('div');
          spacer.className='reading-tail-spacer';spacer.setAttribute('aria-hidden','true');
          spacer.style.height=Math.ceil(nextTop-maxScroll+Math.max(120,div.clientHeight*0.2))+'px';
          div.appendChild(spacer);
        }
        div.scrollTop=Math.max(0,nextTop);
      });
    }
    // Event delegation keeps all full-text cards, including newly loaded replies, navigable.
    div.onclick=event=>{
      const button=event.target.closest('button[data-jump]');
      if(button)selectNode(button.dataset.jump);
    };
  }
  function renderStats(){
    const g=state.graph,p=state.selectedCase.post;
    const vals=[['Captured comments',g.captured],['Visible comments',g.captured-g.missing],['Top-level replies',g.rootCount],['Max reply depth',Math.max(0,g.maxDepth)]];
    $('statistics').innerHTML=vals.map(([k,v])=>`<div class="stat"><strong>${formatCount(v)}</strong><span>${escapeHTML(k)}</span></div>`).join('');
    // In the study, post score remains alongside the discussion statistics;
    // it never competes for space with the selected comment in the inspector.
    $('postScoreInline').textContent=`Post score ${formatCount(num(p.score))}`;
    setStatus(`r/${state.selectedCase.subreddit} · ${formatCount(g.captured)} captured · ${formatCount(g.missing)} unavailable`);
  }
  function caseTitle(e){return e.research?.short_label || short(e.post.title||'Untitled post',76);}
  function renderCases(){
    const q=$('caseSearch').value.toLowerCase().trim();const e=$('caseList');e.replaceChildren();
    const filtered=state.cases.filter(c=>!q||((c.post.title||'')+' '+c.post.id+' '+c.subreddit).toLowerCase().includes(q));
    for(const c of filtered.slice(0,45)){
      const b=document.createElement('button');b.className='case-item'+(state.selectedCase===c?' active':'');
      const title=document.createElement('span');title.textContent=caseTitle(c);
      const sm=document.createElement('small');sm.textContent=`r/${c.subreddit} · ${String(c.post.id||'unknown')}`;
      b.append(title,sm);b.addEventListener('click',()=>selectCase(c));e.append(b);
    }
    if(filtered.length>45){const t=document.createElement('p');t.className='note';t.textContent=`Showing first 45 of ${filtered.length}. Type a title or post ID to find others.`;e.append(t);}
    if(!filtered.length)e.innerHTML='<div class="empty">No posts match this filter.</div>';
  }
  function updateMatches(){
    const q=state.search=String($('searchBox').value||'').trim().toLowerCase();
    const results=state.graph.nodes.filter(n=>n.kind==='comment'&&q&&((n.body+' '+n.author).toLowerCase().includes(q)));
    state.searchMatches=results.map(n=>n.id);state.matchIndex=0;
    recordAction('search',{query_length:q.length,matches:results.length});
    $('matchCount').textContent=q?`${formatCount(results.length)} matching comments`:'Search to highlight comments';
    if(state.view==='radial')drawGraph();
  }
  function navigateMatches(increment){
    if(!state.searchMatches.length)return;
    state.matchIndex=(state.matchIndex+increment+state.searchMatches.length)%state.searchMatches.length;
    const n=state.graph.byId.get(state.searchMatches[state.matchIndex]);
    selectNode(n.id);
    $('matchCount').textContent=`Match ${state.matchIndex+1} of ${state.searchMatches.length}`;
  }
  function selectCase(entry){
    if(studying&&state.selectedCase&&state.selectedCase!==entry)return;
    $('tooltip').style.display='none';state.selectedCase=entry;state.graph=makeGraph(entry);
    // The post title is a permanent, separately laid-out part of the reading panel.
    // Its text never changes when the selected comment changes. Only the case changes it.
    const heading=$('persistentPostTitle');
    heading.replaceChildren();
    const label=document.createElement('span');
    label.className='post-title-label';
    label.textContent=`Original Reddit post · r/${entry.subreddit}`;
    const title=document.createElement('h2');
    title.className='post-title-text';
    title.textContent=entry.post.title || 'Untitled Reddit submission';
    heading.append(label,title);
    // Keep the *original*, unsummarized submission text between the title
    // and the selected comment, even as the reader navigates replies.
    const context=$('persistentPostContext');
    context.replaceChildren();
    const bodyLabel=document.createElement('span');
    bodyLabel.className='post-context-label';
    bodyLabel.textContent='Original post text';
    const body=document.createElement('div');
    body.className='post-context-body';
    const originalText=String(entry.post.selftext??'');
    if(originalText.trim())body.textContent=originalText;
    else {body.textContent='No body text supplied (link post).';body.classList.add('post-context-empty');}
    context.append(bodyLabel,body);
    state.selectedId=state.graph.root.id;
    $('searchBox').value='';state.search='';state.searchMatches=[];state.matchIndex=0;
    $('matchCount').textContent='Search to highlight comments';
    state.hasFitted=false;drawGraph(true);renderDetails(state.graph.root);renderStats();renderCases();
    if(state.view==='json')renderJSON();else if(state.view==='list')renderList();
  }
  function renderList(){
    const container=$('listView');container.replaceChildren();
    if(!state.graph)return;
    const pre=document.createElement('div');pre.className='reader-roots';
    const header=document.createElement('div');header.className='hint';header.textContent='An indented alternative showing the same original data. It is included for inspection, not yet a controlled evaluation baseline.';pre.append(header);
    const parentStack=[{node:state.graph.root,target:pre}];
    while(parentStack.length){
      const {node,target}=parentStack.pop();
      let childrenTarget=target;
      if(node.kind!=='post'){
        const entry=document.createElement('div');entry.className='thread-entry'+(state.selectedId===node.id?' selected':'');
        const row=document.createElement('div');row.className='reader-actions';
        const a=document.createElement('button');a.textContent=(node.author==='[unknown]'?'Unknown':node.author);a.style.fontWeight='750';a.addEventListener('click',()=>selectNode(node.id));
        const score=document.createElement('span');score.className='reader-meta';score.textContent=`score ${node.score} · depth ${node.depth} · ${node.children.length} replies`;
        row.append(a,score);entry.append(row);
        const body=document.createElement('div');body.className='reader-body';body.textContent=node.body||'[empty]';entry.append(body);target.append(entry);
        childrenTarget=document.createElement('div');childrenTarget.className='reader-indent';target.append(childrenTarget);
      }
      for(let i=node.children.length-1;i>=0;i--)parentStack.push({node:node.children[i],target:childrenTarget});
    }
    container.append(pre);
  }
  function renderJSON(){if(state.selectedCase)$('jsonText').textContent=JSON.stringify(state.selectedCase.post,null,2);}
  function showView(view){
    if(studying&&view!=='radial')return;
    state.view=view;
    document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-selected',b.dataset.view===view?'true':'false');});
    $('treeSvg').classList.toggle('hidden',view!=='radial');$('listView').classList.toggle('hidden',view!=='list');$('jsonView').classList.toggle('hidden',view!=='json');
    $('mapCaption').classList.toggle('hidden',view!=='radial');$('zoomButtons').classList.toggle('hidden',view!=='radial');
    if(view==='radial')drawGraph();else if(view==='list')renderList();else renderJSON();
  }
  function changeZoom(factor){
    const min=state.fitScale*0.35,max=state.fitScale*18;
    state.autoFit=false;
    state.scale=Math.max(min,Math.min(max,state.scale*factor));applyTransform();
  }
  function downloadJSON(){
    if(!state.selectedCase)return;
    const blob=new Blob([JSON.stringify(state.selectedCase.post,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`reddit_${state.selectedCase.post.id||'post'}.json`;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  // V4.8.2: one concise hover/focus description for each left-panel cue filter.
  // Append the popup to <body> rather than the scrollable sidebar so it never
  // gets clipped by a narrow pane or by the sidebar's overflow handling.
  function installCueFilterHelp(){
    const descriptions={
      all:'Show all comments at normal emphasis. Clears the cue filter without changing the radial tree or the reading pane.',
      question:'Highlight comments containing a literal question mark (?). Other nodes stay in place but fade. This does not automatically identify a genuine question.',
      url:'Highlight comments containing a web link. A URL marker does not indicate that the source is relevant, reliable, or correct.',
      quote:'Highlight comments with Reddit Markdown quotation markers (> at the start of a line). This indicates quoted text, not its accuracy.'
    };
    const tip=document.createElement('div');
    tip.id='cueFilterHelp';tip.className='cue-filter-help-popup';tip.setAttribute('role','tooltip');tip.hidden=true;
    document.body.append(tip);
    let active=null;
    function hide(){active=null;tip.hidden=true;tip.textContent='';}
    function place(button){
      const a=button.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;
      let x=a.right+10;
      if(x+w>window.innerWidth-10)x=a.left-w-10;
      if(x<10)x=Math.max(10,a.left);
      let y=Math.min(a.top,window.innerHeight-h-10);
      y=Math.max(10,y);
      tip.style.left=Math.round(x)+'px';tip.style.top=Math.round(y)+'px';
    }
    for(const button of document.querySelectorAll('#cueButtons button[data-cue]')){
      const message=descriptions[button.dataset.cue];if(!message)continue;
      // Descriptions can also be read when navigating with a keyboard.
      const sr=document.createElement('span');sr.id='cue-desc-'+button.dataset.cue;
      sr.className='visually-hidden-cue';sr.textContent=message;
      $('cueButtons').after(sr);
      button.setAttribute('aria-describedby',sr.id);
      function show(){if(button.closest('.hidden')||getComputedStyle(button).display==='none')return;active=button;tip.textContent=message;tip.hidden=false;place(button);}
      button.addEventListener('mouseenter',show);
      button.addEventListener('mouseleave',()=>{if(active===button)hide();});
      button.addEventListener('focus',show);
      button.addEventListener('blur',()=>{if(active===button)hide();});
    }
    const panel=document.querySelector('.left-panel');
    panel?.addEventListener('scroll',()=>{if(active)hide();},{passive:true});
    window.addEventListener('resize',()=>{if(active)place(active);});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
  }
  function installInteractions(){
    $('fileUpload').addEventListener('change',async event=>{
      const file=event.target.files?.[0];if(!file)return;
      setStatus(`Reading ${file.name} (${(file.size/(1024*1024)).toFixed(1)} MB)…`);
      await new Promise(resolve=>setTimeout(resolve,20));
      try{
        const parsed=JSON.parse(await file.text());const found=readCases(parsed);
        // One upload can be a 905-post collection; the library filter remains available.
        const existing=new Set(state.cases.map(c=>String(c.post.id)));
        let added=0;
        for(const e of found)if(!existing.has(String(e.post.id))){state.cases.push(e);existing.add(String(e.post.id));added++;}
        $('caseSearch').value='';renderCases();
        if(added)selectCase(state.cases.find(c=>String(c.post.id)===String(found[0].post.id))||state.cases[state.cases.length-1]);
        setStatus(`Imported ${formatCount(added)} new posts from ${file.name}. ${formatCount(found.length-added)} already present.`);
      }catch(err){setStatus('Import failed: '+err.message);alert('Could not import Reddit JSON:\n'+err.message);}
      event.target.value='';
    });
    document.querySelector('label[for="fileUpload"]').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('fileUpload').click()}});
    $('downloadPost').addEventListener('click',downloadJSON);
    $('caseSearch').addEventListener('input',renderCases);
    $('searchBox').addEventListener('input',updateMatches);
    $('prevMatch').addEventListener('click',()=>navigateMatches(-1));
    $('nextMatch').addEventListener('click',()=>navigateMatches(1));
    $('cueButtons').addEventListener('click',ev=>{
      if(studying&&studyCondition==='structure')return;
      const b=ev.target.closest('button[data-cue]');if(!b)return;
      state.cue=b.dataset.cue;recordAction('cue_highlight',{cue:state.cue});
      document.querySelectorAll('button[data-cue]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
      drawGraph();
    });
    document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
    $('sizeMode').addEventListener('change',ev=>{state.sizeMode=ev.target.value;drawGraph()});
    $('zoomReset').addEventListener('click',()=>{recordAction('fit_view');fit()});
    $('zoomIn').addEventListener('click',()=>changeZoom(1.3));$('zoomOut').addEventListener('click',()=>changeZoom(1/1.3));
    $('treeSvg').addEventListener('wheel',ev=>{ev.preventDefault();changeZoom(ev.deltaY>0?0.9:1.1)},{passive:false});
    $('treeSvg').addEventListener('pointerdown',ev=>{
      if(ev.target.closest?.('.node'))return;
      state.dragging={x:ev.clientX,y:ev.clientY,panX:state.panX,panY:state.panY};$('treeSvg').classList.add('dragging');$('treeSvg').setPointerCapture(ev.pointerId);
    });
    $('treeSvg').addEventListener('pointermove',ev=>{
      if(!state.dragging)return;state.autoFit=false;state.panX=state.dragging.panX+ev.clientX-state.dragging.x;state.panY=state.dragging.panY+ev.clientY-state.dragging.y;applyTransform();
    });
    function stopDrag(){state.dragging=null;$('treeSvg').classList.remove('dragging');}
    $('treeSvg').addEventListener('pointerup',stopDrag);$('treeSvg').addEventListener('pointercancel',stopDrag);
    $('treeSvg').addEventListener('click',ev=>{if(ev.target===$('treeSvg')&&state.graph)selectNode(state.graph.root.id)});
    // iframe views can be laid out *after* initial rendering. When the radial
    // area gains its final dimensions, auto-fit again; otherwise the landing
    // graph remains unnecessarily small until someone presses Fit manually.
    const respondToCanvasResize=()=>{
      if(state.view!=='radial'||!state.graph)return;
      const prior={...state.dims};
      setSVGDimensions();
      if(Math.abs(state.dims.w-prior.w)>1||Math.abs(state.dims.h-prior.h)>1){
        if(state.autoFit)fit();
        else applyTransform();
      }
    };
    window.addEventListener('resize',respondToCanvasResize);
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(respondToCanvasResize).observe($('viewArea'));
  }
  async function init(){
    installInteractions();
    installCueFilterHelp();
    initStudyControls();
    if(!studying)renderLegend();
    try{
      const payload=JSON.parse($('initial-dataset').textContent);
      state.cases=readCases(payload);
      if(studying){
        const entry=state.cases.find(e=>String(e.post.id)===studyCaseId);
        if(!studyCaseId||!entry){setStatus('Study setup error: unknown or missing case ID');$('details').textContent='Use a valid case from cases.json in the study link.';return;}
        state.cases=[entry];
      }
      renderCases();selectCase(state.cases[0]);
      if(studying){$('status').textContent='Study mode';$('mapCaption').textContent='';}
      if(embedded)window.parent.postMessage({type:'ATLAS_READY',case_id:studyCaseId,condition:studyCondition},'*');
    }catch(err){setStatus('Startup error: '+err.message);$('details').textContent=String(err.stack||err);}
  }
  init();
})();
