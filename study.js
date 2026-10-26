/* Discussion Atlas online study portal · original Reddit text never changed.
   All participant responses remain in the browser until a deliberate JSON download.
*/
(() => {
 'use strict';
 const taskCard = document.getElementById('taskCard');
 // The live task form lives inside the viewer's left sidebar during trials.
 // Retain a direct reference when its DOM nodes are adopted into the same-origin iframe.
 const $=id=>document.getElementById(id) || (taskCard && (taskCard.id===id?taskCard:taskCard.querySelector(`[id="${id}"]`)));
 function mountTaskCard(){
  if(screen!=='trial')return false;
  const iframe=$('trialViewer');
  let frameDoc;
  try{frameDoc=iframe.contentDocument;}catch{return false;}
  const sidebar=frameDoc?.querySelector('.left-panel');
  if(!sidebar || !frameDoc.body?.classList.contains('study-embedded'))return false;
  if(taskCard.ownerDocument!==frameDoc)sidebar.prepend(frameDoc.adoptNode(taskCard));
  else if(taskCard.parentNode!==sidebar)sidebar.prepend(taskCard);
  taskCard.classList.add('embedded-task-card');
  frameDoc.body.classList.add('study-task-mounted');
  sidebar.scrollTop=0;
  return true;
 }
 function unmountTaskCard(){
  if(taskCard.ownerDocument!==document){
   const home=document.getElementById('taskCardHome');
   home.appendChild(document.adoptNode(taskCard));
  }
  taskCard.classList.remove('embedded-task-card');
 }
 // Restoring the task form before replacing an iframe prevents loss of answers and listeners.
 document.getElementById('trialViewer').addEventListener('load',()=>{mountTaskCard()});
 const groups=[
  [['structure','1k1dxwq'],['cues','10hwbau']],
  [['cues','1k1dxwq'],['structure','10hwbau']],
  [['structure','10hwbau'],['cues','1bfpjzp']],
  [['cues','10hwbau'],['structure','1bfpjzp']],
  [['structure','1bfpjzp'],['cues','1k1dxwq']],
  [['cues','1bfpjzp'],['structure','1k1dxwq']]
 ];
 const titles={'1k1dxwq':'Climate change and arsenic in rice','10hwbau':'Reusable take-out food containers','1bfpjzp':'Python farming and food production','1nyui25':'Earth reflecting less light'};
 const url=new URL(window.location.href), participant=(url.searchParams.get('p')||'').toUpperCase().trim();
 const valid=/^P(0[1-9]|1[0-2])$/.test(participant);
 // No secret invitation tokens are needed for static hosting; links use pseudonymous participant codes only.
 const group=valid?((Number(participant.slice(1))-1)%6):-1;
 let screen='welcome', practiceStep=0,trialIndex=0,taskIndex=0,selectedComment='',trialPerf=0,taskPerf=0,clock=null,viewerReady=false,submitting=false;
 const data={schema_version:'4.1-static',interface_version:'4.8',study:'Radial Tree Discussion Interface - exploration and cue evaluation',participant_id:participant,assignment_group:group+1,consent:true,
  consent_at_utc:'',practice_completed:false,completed_at_utc:null,export_mode:'download-only',activity_view_reset:'before_each_activity',
  node_size_encoding:'baseline_uniform__enhanced_bounded_sqrt_character_length_collision_safeguard',score_node_sizing:false,trials:[],final:{}};
 const taskDefs=[
  {title:'Explore the radial-tree overview', text:'Imagine you have little time to explore a long public discussion. Use the Radial Tree Discussion Interface to get an overview without reading everything. Focus on how the visual layout helps you see branches, depth, or groups of replies—not on the scientific content.', answerLabel:'Which parts of the radial-tree display helped or hindered your overview?'},
  {title:'Choose where to explore', text:'Using the interface, choose two comments in different parts of the radial tree for closer inspection. Click each node and press “Record current comment.” You may use search or visible cues. You are not being asked to judge the content or scientific value of the comments.', answerLabel:'Which interface features helped you locate and select these two comments?'},
  {title:'Follow a reply chain', text:'Choose a branch and use the radial tree and reading panel to move from a comment to an earlier reply or parent and then to a later reply. You may use search to locate comments. You are evaluating how easy the interface makes this movement, not interpreting the scientific claims.', answerLabel:'Which interface controls or displays helped you follow the reply chain, and what was difficult?'}
 ];
 const commonQuestions=[
  'The radial tree made it easy to see the overall discussion structure.',
  'The interface helped me identify where to explore without reading every comment.',
  'The radial tree and reading panel helped me follow parent–reply relationships.',
  'I could use the interface to explore the discussion efficiently.',
  'Finding and moving between comments using the interface required manageable effort.',
  'Some interface visual elements distracted me from exploring comment relationships.'
 ];
 const cueQuestions=[['length','Node size representing comment text length'],['url','Teal: URL present'],['question','Amber: question mark present'],['quote','Pink: quotation marker']];
 // One shared top-right action position throughout the participant journey.
 // Move the *existing* buttons rather than cloning them; all click/submit handlers survive.
 const navButtonIds=['welcomeNext','practiceNext','introNext','ratingSubmit','finalSubmit','downloadBackup','downloadFinalAgain'];
 const buttonHomes=new Map(navButtonIds.map(id=>{
   const button=$(id);return [id,{button,parent:button.parentNode,nextSibling:button.nextSibling}];
 }));
 const screenAction={welcome:'welcomeNext',practice:'practiceNext',introduction:'introNext',trialRatings:'ratingSubmit',finish:'finalSubmit',thankyou:'downloadFinalAgain'};
 function updateHeaderActions(screenId){
   // Restore the previous screen's controls to their own DOM location first.
   for(const {button,parent,nextSibling} of buttonHomes.values()){
     if(button.parentNode!==parent){
       if(nextSibling && nextSibling.parentNode===parent)parent.insertBefore(button,nextSibling);
       else parent.append(button);
     }
   }
   const primary=screenAction[screenId];
   if(primary)$('headerPrimaryAction').append($(primary));
   if(screenId==='finish')$('headerSecondaryActions').append($('downloadBackup'));
 }
 function show(id,label){
   if(screen==='trial' && id!=='trial')unmountTaskCard();
   for(const x of ['welcome','practice','introduction','trial','trialRatings','finish','thankyou','invalid'])$(x).classList.toggle('hidden',x!==id);
   screen=id;document.body.dataset.screen=id;
   $('stepper').textContent=label||id;
   updateHeaderActions(id);
   window.scrollTo(0,0);
 }
 function loadFrame(frame,src){frame.src=src;}
 function caseFrame(caseId,condition,practice=false){const u=new URL('index.html',location.href);for(const [k,v] of Object.entries({study:'1',embed:'1',case:caseId,condition,revision:'4.8',participant:practice?'PRACTICE':participant,task:practice?'DEMO':`TRIAL${trialIndex+1}`}))u.searchParams.set(k,v);return u.href;}
 function error(id,msg){$(id).textContent=msg;$(id).classList.remove('hidden')}
 function downloadFile(isDraft=false){
  // One response file, produced entirely client-side. No remote API or analytics.
  const payload={...data,exported_at_utc:new Date().toISOString(),export_status:isDraft?'draft':'complete'};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
  const objectURL=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=objectURL;
  a.download=`radial_tree_${participant}_${isDraft?'DRAFT_':''}responses.json`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(objectURL),15000);
 }
 function downloadBackup(){downloadFile(true)}

 function beginPractice(){practiceStep=0;renderPractice();show('practice','Practice · step 1/2')}
 function renderPractice(){
  const enhanced=practiceStep===1;
  loadFrame($('practiceViewer'),caseFrame('1nyui25',enhanced?'cues':'structure',true));
  $('practiceStatus').textContent=`Step ${practiceStep+1} of 2 · ${enhanced?'Radial tree with visual cues':'Basic radial tree'}`;
  $('practicePrompt').innerHTML=enhanced
   ?'Practice 2 · Radial tree with visual cues: use the <strong>legend</strong> on the graph to interpret amber (question mark), teal (URL), pink (quotation), and mixed-color nodes. Larger nodes contain more characters, not necessarily better comments. Gray dashed nodes mark unavailable text; their replies remain connected. Try the cue filters and search in the left panel. Search highlights <strong>tree nodes</strong>; the reading panel only changes when you select a comment or navigate to a match.'
   :'Practice 1 · Basic radial tree: the center is the original Reddit post, connections represent replies, and circles are all the same size. <strong>Gray dashed nodes indicate unavailable text</strong>; these nodes preserve the conversation path. Try clicking a comment and following its ancestor chain on the right, zooming, and searching. Search highlights nodes in the <strong>tree</strong>, not the reading-panel text. Use the search arrows to jump to a match.';
  $('practiceNext').textContent=enhanced?'Finish practice and read study introduction →':'Next: radial tree with visual cues →';
 }
 function startTrial(){
  unmountTaskCard();
  const [condition,caseId]=groups[group][trialIndex];
  data.trials.push({trial:trialIndex+1,condition,case_id:caseId,case_title:titles[caseId],node_size_encoding:condition==='structure'?'uniform_radius_5':'continuous_bounded_sqrt_character_length_collision_safeguard',started_at_utc:new Date().toISOString(),tasks:[],ratings:{},cue_ratings:{},viewer_actions:[]});
  selectedComment=''; taskIndex=0;viewerReady=false;
  $('trialEyebrow').textContent=`TRIAL ${trialIndex+1} OF 2`;
  $('trialTitle').textContent=titles[caseId];
  loadFrame($('trialViewer'),caseFrame(caseId,condition));
  $('taskNext').disabled=true;
  renderTask();show('trial',`Trial ${trialIndex+1}/2 · Activity 1/3`);
  clearInterval(clock);$('trialTimer').textContent='Loading…';
 }
 function currentTrial(){return data.trials[trialIndex]}
 function renderTask(){
  const t=taskDefs[taskIndex];$('taskLabel').textContent=`ACTIVITY ${taskIndex+1} OF 3`;
  $('taskTitle').textContent=t.title;$('taskInstructions').textContent=t.text;
  $('taskError').classList.add('hidden');
  $('taskNext').textContent=taskIndex===2?'Finish this trial →':'Save response & continue →';
  const a=$('taskAnswerArea');a.replaceChildren();
  if(taskIndex===1){
   const holder=document.createElement('div');holder.className='task-capture';
   for(const idx of [1,2]){
    const b=document.createElement('button');b.type='button';b.textContent=`Record selected comment ${idx}`;
    const c=document.createElement('code');c.id=`capture${idx}`;c.textContent='Not recorded';
    b.onclick=()=>{if(!selectedComment || selectedComment.startsWith('post:')){error('taskError','Please click an actual comment in the visualization first.');return;}
      c.textContent=selectedComment;$('taskError').classList.add('hidden');};
    holder.append(b,c);
   }
   a.append(holder);
  }
  const label=document.createElement('label');label.setAttribute('for','taskAnswer');label.textContent=t.answerLabel;
  const ta=document.createElement('textarea');ta.id='taskAnswer';ta.rows=2;ta.placeholder='One or two sentences are enough…';
  a.append(label,ta);
  taskPerf=performance.now();
 }
 function saveTask(){
  const answer=$('taskAnswer').value.trim();if(answer.length<8){error('taskError','Please describe your experience of the interface before continuing.');return false;}
  let ids=[];
  if(taskIndex===1){ids=[$('capture1').textContent,$('capture2').textContent];if(ids.includes('Not recorded')||ids[0]===ids[1]){error('taskError','Please record two different comments using the buttons above.');return false;}}
  const duration=Math.round(performance.now()-taskPerf);
  currentTrial().tasks.push({activity:taskIndex+1,type:['overview','focus_selection','context_tracing'][taskIndex],answer,selected_comment_ids:ids,elapsed_ms:duration,completed_at_utc:new Date().toISOString()});
  return true;
 }
 function nextTask(){
  if(!saveTask())return;
  if(taskIndex<2){
   // Preserve the previous answer and viewer event log, but begin the next
   // activity from the original post with no selected/highlighted branch.
   taskIndex++;
   selectedComment=''; // Prevent the selection task from reusing a prior activity's node.
   renderTask();
   try{$('trialViewer').contentDocument?.querySelector('.left-panel')?.scrollTo({top:0,behavior:'instant'});}catch{}
   $('stepper').textContent=`Trial ${trialIndex+1}/2 · Activity ${taskIndex+1}/3`;
   $('taskNext').disabled=true; // Reenable only when the iframe confirms its reset.
   $('trialViewer').contentWindow?.postMessage({type:'ATLAS_RESET_ACTIVITY',
     activity:taskIndex+1},location.origin);
  }else{
   currentTrial().completed_exploration_at_utc=new Date().toISOString();currentTrial().total_trial_elapsed_ms=Math.round(performance.now()-trialPerf);
   $('trialViewer').contentWindow?.postMessage({type:'ATLAS_STOP'},'*');clearInterval(clock);renderRatings();show('trialRatings',`Trial ${trialIndex+1}/2 · Feedback`);
  }}
 function ratingRow(key,label,allowZero=false){const row=document.createElement('div');row.className='rating';const title=document.createElement('div');title.textContent=label;const scale=document.createElement('div');scale.className='scale';
  const start=allowZero?0:1;for(let n=start;n<=5;n++){const l=document.createElement('label');const i=document.createElement('input');i.type='radio';i.name=key;i.value=String(n);const sp=document.createElement('span');sp.textContent=String(n);l.append(i,sp);scale.append(l)}row.append(title,scale);return row;}
 function renderRatings(){
  $('ratingEyebrow').textContent=`RADIAL TREE FEEDBACK · TRIAL ${trialIndex+1} OF 2`;
  const items=$('ratingsItems');items.replaceChildren();commonQuestions.forEach((q,i)=>items.append(ratingRow(`rating_${i}`,q)));
  const cues=$('cueItems');cues.replaceChildren();const enhanced=currentTrial().condition==='cues';$('specificCues').classList.toggle('hidden',!enhanced);
  if(enhanced)cueQuestions.forEach(([k,v])=>cues.append(ratingRow(`cue_${k}`,v,true)));
  const searchRating=$('searchRatingItem');searchRating.replaceChildren();searchRating.append(ratingRow('search_helpfulness','If you used search, how helpful was highlighting matches in the radial tree? (0 = did not use search)',true));
  $('ratingComment').value='';$('cueExplanation').value='';$('ratingConfidence').value='';
  $('ratingSubmit').textContent=trialIndex===0?'Continue to second trial →':'Continue to final questionnaire →';
 }
 function saveRatings(){
  const f=$('ratingForm'),ratings={};
  for(let i=0;i<commonQuestions.length;i++){const v=f.querySelector(`input[name="rating_${i}"]:checked`);if(!v){alert('Please answer all six experience statements before continuing.');return false;}ratings[`Q${i+1}`]=Number(v.value)}
  const sr=f.querySelector('input[name="search_helpfulness"]:checked');if(!sr){alert('Please rate search or select 0 if you did not use it.');return false;}
  const confidence=Number($('ratingConfidence').value);if(!confidence){alert('Please select your overall confidence rating.');return false;}
  currentTrial().ratings={...ratings,search_usefulness:Number(sr.value),confidence,comment:$('ratingComment').value.trim()};
  if(currentTrial().condition==='cues'){
   for(const [k] of cueQuestions){const v=f.querySelector(`input[name="cue_${k}"]:checked`);if(!v){alert('Please give a rating or 0 = not noticed for each added cue.');return false;}currentTrial().cue_ratings[k]=Number(v.value)}
   currentTrial().cue_explanation=$('cueExplanation').value.trim();
  }
  return true;
 }
 function stopAndNext(){if(!saveRatings())return;if(trialIndex===0){trialIndex=1;startTrial();}else show('finish','Final comparison')}
 function startClock(){trialPerf=performance.now();taskPerf=trialPerf;clearInterval(clock);clock=setInterval(()=>{const t=Math.floor((performance.now()-trialPerf)/1000);$('trialTimer').textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`},1000);}
 function submitFinal(){
  if(submitting)return;
  const preference=$('finalPreference').value,why=$('finalWhy').value.trim();
  if(!preference||why.length<8){$('submitMessage').className='failure';$('submitMessage').textContent='Please select an interface preference and provide a short explanation.';return;}
  data.final={preference,reason:why,recommended_change:$('finalChange').value.trim()};
  data.completed_at_utc=new Date().toISOString();
  submitting=true;
  $('finalSubmit').disabled=true;
  downloadFile(false);
  $('receipt').textContent=`Participant ${participant}: your JSON response file should now appear in your Downloads folder. Filename: radial_tree_${participant}_responses.json`;
  show('thankyou','Completed · Save & send JSON');
 }

 window.addEventListener('message',e=>{
  // Only accept messages from the currently displayed, same-origin viewer frame.
  if(e.origin!==location.origin)return;
  if(!e.data||typeof e.data.type!=='string')return;
  const isTrial=screen==='trial' && e.source===$('trialViewer').contentWindow;
  if(e.data.type==='ATLAS_READY' && isTrial && !viewerReady){
   mountTaskCard();
   viewerReady=true;startClock();$('taskNext').disabled=false;
   $('trialViewer').contentWindow.postMessage({type:'ATLAS_START'},location.origin);
  }
  if(e.data.type==='ATLAS_SELECTION' && isTrial)selectedComment=e.data.node_id;
  if(e.data.type==='ATLAS_ACTIVITY_RESET' && isTrial &&
     e.data.case_id===currentTrial().case_id && e.data.condition===currentTrial().condition &&
     e.data.activity===taskIndex+1){
    selectedComment='';
    taskPerf=performance.now(); // Timer for the new activity starts after reset.
    $('taskNext').disabled=false;
  }
  if(e.data.type==='ATLAS_STOPPED' && e.source===$('trialViewer').contentWindow){
   const tr=data.trials.find(t=>t.case_id===e.data.case_id && t.condition===e.data.condition);
   if(tr){tr.viewer_actions=e.data.actions||[];tr.viewer_exploration_ms=e.data.exploration_ms||0;}
  }
 });
 $('welcomeNext').addEventListener('click',()=>{if(!$('consent').checked){alert('Please read the participation information and choose whether to consent.');return;}data.consent_at_utc=new Date().toISOString();beginPractice()});
 $('practiceNext').addEventListener('click',()=>{if(practiceStep===0){practiceStep=1;renderPractice();$('stepper').textContent='Practice · step 2/2';}else{data.practice_completed=true;$('practiceViewer').src='about:blank';show('introduction','Study introduction')}});
 $('introNext').addEventListener('click',startTrial);
 $('taskNext').addEventListener('click',nextTask);
 $('ratingForm').addEventListener('submit',e=>{e.preventDefault();stopAndNext()});
 $('finalSubmit').addEventListener('click',submitFinal);$('downloadBackup').addEventListener('click',downloadBackup);$('downloadFinalAgain').addEventListener('click',()=>downloadFile(false));
 window.addEventListener('beforeunload',e=>{if(data.consent_at_utc && !data.completed_at_utc){e.preventDefault();e.returnValue='';}});
 if(valid){$('participantCode').textContent=participant;show('welcome','Welcome · Consent');}else show('invalid','Invalid link');
})();
