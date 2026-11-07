(() => {
  if (window.__classcrate) return;
  window.__classcrate=true;
  const holder=document.createElement('div');
  holder.id='classcrate';
  holder.style.cssText='position:fixed;bottom:20px;right:20px;z-index:2147483647;';
  document.documentElement.appendChild(holder);
  const root=holder.attachShadow({mode:'open'});
  const cfg=globalThis.CLASSCRATE_CONFIG || {};
  const s={open:false,page:'welcome',configured:false,busy:false,error:'',courses:[],course:null,
    files:[],warnings:[],selected:new Set(),search:'',filter:'ALL',organized:true,job:null,summary:null,stars:0,feedback:''};
  const esc=x=>String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const css='.launcher{background:#306df1;color:white;border:0;border-radius:16px;padding:13px 18px;cursor:pointer;font-weight:800;box-shadow:0 12px 30px #0006}' +
    '.panel{width:min(450px,calc(100vw - 24px));max-height:min(690px,calc(100vh - 24px));background:#10192b;color:#edf3ff;border:1px solid #345079;border-radius:20px;box-shadow:0 24px 70px #0008;display:flex;flex-direction:column;font:14px/1.4 system-ui,sans-serif;overflow:hidden}' +
    '*{box-sizing:border-box}.header{background:linear-gradient(125deg,#2548a1,#317bf0);padding:18px;display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:17px}' +
    '.body{padding:16px;overflow-y:auto;flex:1}.footer{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;padding:12px;border-top:1px solid #30415a}' +
    '.btn{background:#1d3051;color:#f4f8ff;border:1px solid #3b5785;border-radius:10px;padding:9px 12px;font-weight:700;cursor:pointer}.btn:hover{filter:brightness(1.2)}.btn:disabled{opacity:.4;cursor:not-allowed}' +
    '.primary{background:#2f70ee;border-color:#2f70ee}.green{background:#009f78;border-color:#009f78}.close{font-size:24px;border:0;color:white;background:none;cursor:pointer}' +
    '.card{display:block;background:#17243b;color:white;border:1px solid #293f66;border-radius:12px;padding:13px;margin:8px 0;width:100%;text-align:left}.card:hover{border-color:#3c83ff}' +
    '.muted{color:#9eacc5}.small{font-size:12px}.title{font-weight:800;font-size:17px;margin-bottom:8px}.stack{display:flex;flex-direction:column;gap:12px}.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.between{justify-content:space-between}' +
    '.field{background:#0c1424;border:1px solid #355071;border-radius:9px;padding:10px;color:#e7f0ff;font:inherit;min-width:0}.grow{flex:1}.wide{width:100%}' +
    '.file-list{max-height:310px;overflow:auto;display:flex;flex-direction:column;gap:7px}.file{display:flex;align-items:center;gap:9px;padding:10px;background:#152138;border:1px solid #2b4060;border-radius:11px;cursor:pointer}.file:has(input:checked){border-color:#3b79f1}.file input{accent-color:#377cf5}' +
    '.filename{flex:1;overflow-wrap:anywhere;font-weight:700}.filename small{display:block;color:#9eacc5;font-weight:400}.tag{font-size:11px;border-radius:5px;padding:3px 5px;border:1px solid #3c689b;color:#b1d6ff}' +
    '.error{background:#512c35;border:1px solid #a84c66;color:#ffb9c3;padding:9px;border-radius:9px;margin-bottom:9px}.warn{background:#4a391f;color:#ffe29d;border-radius:8px;padding:8px}' +
    '.bar{height:11px;background:#263755;border-radius:10px;overflow:hidden}.bar>div{background:#15bb91;height:100%}.star{background:none;border:0;color:#ffd34c;font-size:30px;cursor:pointer}';
  const btn=(label,action,style='',disabled=false)=>'<button class="btn '+style+'" data-action="'+action+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
  const send=(type,data={})=>new Promise((resolve,reject)=>{
    chrome.runtime.sendMessage({type,...data},res=>{
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!res?.ok) return reject(new Error(res?.error || 'Request failed'));
      resolve(res);
    });
  });
  async function run(fn) {
    s.busy=true;s.error='';render();
    try {await fn();}
    catch(error){s.error=error.message || String(error);}
    finally {s.busy=false;render();}
  }
  function filtered() {
    const q=s.search.toLowerCase().trim();
    return s.files.filter(f=>(s.filter==='ALL' || f.type===s.filter) &&
      (!q || [f.filename,f.title,f.postTitle].some(x=>String(x || '').toLowerCase().includes(q))));
  }
  function welcome() {
    return '<div class="stack"><div class="title">Your Classroom materials, all together</div>'+
      '<p class="muted">Connect with Google, choose a subject, fetch accessible attachments and download them in their original file formats.</p>'+
      (!s.configured?'<div class="warn">Set your OAuth client ID in manifest.json first. See docs/SETUP.md.</div>':'')+
      btn('Continue with Google','login','primary wide',!s.configured || s.busy)+
      '<p class="small muted">Free and local. No ClassCrate password, account or paid hosting.</p></div>';
  }
  function courses() {
    return '<div class="stack"><div class="row between"><div class="title">Choose a subject</div>'+btn('Refresh','refresh')+'</div>'+
      '<p class="small muted">'+s.courses.length+' active subjects</p>'+
      (s.courses.map(c=>'<button class="card" data-course="'+esc(c.id)+'"><b>'+esc(c.name)+
      '</b><div class="small muted">'+esc(c.section)+'</div></button>').join('') ||
      '<p class="muted">No active subjects were returned.</p>')+'</div>';
  }
  function files() {
    const available=s.files.filter(f=>f.downloadable).length;
    const selected=s.files.filter(f=>f.downloadable && s.selected.has(f.id)).length;
    const items=filtered().map(f=>'<label class="file"><input type="checkbox" data-file="'+esc(f.id)+'"'+
      (s.selected.has(f.id)?' checked':'')+(f.downloadable?'':' disabled')+' />'+
      '<span class="tag">'+esc(f.type || 'FILE')+'</span><span class="filename">'+esc(f.filename || f.title)+
      '<small>'+esc(f.downloadable?f.postTitle:f.reason || 'Not downloadable')+'</small></span></label>').join('');
    return '<div class="stack"><div class="row between"><div class="title">'+esc(s.course?.name)+'</div>'+
      btn('Subjects','back')+'</div><p class="small muted">'+s.files.length+' materials • '+available+' downloadable</p>'+
      s.warnings.map(w=>'<div class="warn">'+esc(w)+'</div>').join('')+
      '<div class="row"><input id="cc-search" class="field grow" placeholder="Search materials" value="'+esc(s.search)+'"/>'+
      '<select id="cc-filter" class="field">'+['ALL','PDF','PPTX','DOCX','XLSX','LINK','FILE'].map(t=>
      '<option'+(s.filter===t?' selected':'')+'>'+t+'</option>').join('')+'</select></div>'+
      '<div class="row">'+btn('Select all','select')+btn('Deselect','clear')+btn('Invert','invert')+'</div>'+
      '<b>'+selected+' selected</b><div class="file-list">'+(items || '<p class="muted">No matching files</p>')+'</div>'+
      '<label class="small"><input type="checkbox" id="cc-organize"'+(s.organized?' checked':'')+
      '> Organize by Classroom post</label></div>';
  }
  function progress() {
    const t=s.summary || {total:0,completed:0,failed:0,active:0,waiting:0};
    const percent=t.total ? Math.round(100*(t.completed+t.failed)/t.total) : 0;
    return '<div class="stack"><div class="title">Downloading '+esc(s.job?.courseName || '')+'</div>'+
      '<div class="bar"><div style="width:'+percent+'%"></div></div><b>'+percent+'% processed</b>'+
      '<p class="muted">'+t.completed+' finished • '+t.active+' active • '+t.waiting+' queued • '+t.failed+' failed</p>'+
      (s.job?.items || []).map(f=>'<div class="card"><b>'+esc(f.filename)+
      '</b><div class="small muted">'+esc(f.status)+(f.error?' — '+esc(f.error):'')+'</div></div>').join('')+
      '<p class="small muted">Chrome may request permission for multiple downloads.</p></div>';
  }
  function done() {
    const t=s.summary || {total:0,completed:0,failed:0};
    return '<div class="stack"><div class="title">Download batch finished 🎉</div><div class="card">'+
      t.completed+' completed • '+t.failed+' failed of '+t.total+'</div>'+
      '<p class="muted">How was your experience? Report errors or suggest improvements.</p>'+
      '<div>'+[1,2,3,4,5].map(n=>'<button class="star" data-star="'+n+'">'+(n<=s.stars?'★':'☆')+'</button>').join('')+'</div>'+
      '<textarea id="cc-feedback" class="field wide" rows="4" placeholder="Feedback and error details...">'+esc(s.feedback)+'</textarea>'+
      '<div class="row">'+btn('Copy feedback','copy')+btn('WhatsApp','whatsapp','',!cfg.whatsappNumber)+
      btn('Chrome Store rating','rate','',!cfg.storeUrl)+'</div>'+
      '<p class="small muted">Messages are never sent automatically. Configure WhatsApp and store links before publishing.</p></div>';
  }
  function render() {
    if (!s.open) {
      root.innerHTML='<style>'+css+'</style><button class="launcher" data-action="toggle">📚 ClassCrate</button>';
      return;
    }
    const body=s.page==='courses'?courses():s.page==='files'?files():s.page==='progress'?progress():
      s.page==='done'?done():welcome();
    let footer='';
    if (s.page==='files') footer=btn('Download selected','download','primary',s.busy || !s.selected.size);
    if (s.page==='progress') footer=btn('Open Downloads','open')+btn('Cancel','cancel','',s.job?.status!=='running');
    if (s.page==='done') footer=(s.summary?.failed?btn('Retry failed','retry'):'')+btn('Open Downloads','open')+btn('Subjects','back');
    root.innerHTML='<style>'+css+'</style><div class="panel"><div class="header">📚 ClassCrate v0.2.0 '+
      '<button class="close" data-action="toggle" aria-label="Close">×</button></div><div class="body">'+
      (s.error?'<div class="error">'+esc(s.error)+'</div>':'')+body+'</div>'+
      (footer?'<div class="footer">'+footer+'</div>':'')+'</div>';
  }
  async function loadCourses() {const r=await send('COURSES');s.courses=r.courses || [];s.page='courses';}
  async function loadFiles(id) {
    const course=s.courses.find(c=>c.id===id);
    if (!course) throw new Error('Subject not found');
    const r=await send('FILES',{courseId:id});
    s.course=course;s.files=r.files || [];s.warnings=r.warnings || [];
    s.selected=new Set(s.files.filter(f=>f.downloadable).map(f=>f.id));
    s.search='';s.filter='ALL';s.page='files';
  }
  async function loadJob() {
    const r=await send('JOB');s.job=r.job;s.summary=r.summary;
    if (r.job?.status==='finished' || r.job?.status==='cancelled') s.page='done';
    else if (r.job?.status==='running') s.page='progress';
    render();
  }
  async function initialize() {
    const r=await send('STATUS');
    s.configured=r.configured;
    if (r.job?.status==='running' || r.job?.status==='finished') await loadJob();
    else s.page='welcome';
  }
  root.addEventListener('click',event=>{
    const star=event.target.closest('[data-star]');
    if (star) {s.stars=Number(star.dataset.star);render();return;}
    const subject=event.target.closest('[data-course]');
    if (subject) {void run(()=>loadFiles(subject.dataset.course));return;}
    const button=event.target.closest('[data-action]');
    if (!button) return;
    switch(button.dataset.action) {
      case 'toggle': s.open=!s.open;render();if(s.open && s.page==='welcome') void run(initialize);return;
      case 'login': return void run(async()=>{await send('CONNECT');await loadCourses();});
      case 'refresh': return void run(loadCourses);
      case 'back': return void run(loadCourses);
      case 'select': case 'clear': case 'invert':
        for (const f of filtered().filter(f=>f.downloadable)) {
          if (button.dataset.action==='select') s.selected.add(f.id);
          else if (button.dataset.action==='clear') s.selected.delete(f.id);
          else s.selected.has(f.id)?s.selected.delete(f.id):s.selected.add(f.id);
        }
        render();return;
      case 'download': return void run(async()=>{
        await send('START_DOWNLOAD',{courseId:s.course.id,selectedIds:[...s.selected],organized:s.organized});
        await loadJob();
      });
      case 'cancel': return void run(async()=>{await send('CANCEL');await loadJob();});
      case 'retry': return void run(async()=>{await send('RETRY');await loadJob();});
      case 'open': return void run(()=>send('OPEN_DOWNLOADS'));
      case 'copy': return void run(()=>navigator.clipboard.writeText('ClassCrate: '+s.stars+'/5\n'+s.feedback));
      case 'whatsapp':
        if (/^\d{8,16}$/.test(cfg.whatsappNumber || '')) window.open('https://wa.me/'+cfg.whatsappNumber+
          '?text='+encodeURIComponent('ClassCrate rating '+s.stars+'/5\n'+s.feedback),'_blank','noopener');
        return;
      case 'rate':
        if (/^https:\/\/chromewebstore\.google\.com\//.test(cfg.storeUrl || '')) window.open(cfg.storeUrl,'_blank','noopener');
        return;
    }
  });
  root.addEventListener('change',event=>{
    const el=event.target;
    if (el.hasAttribute('data-file')) {
      el.checked?s.selected.add(el.dataset.file):s.selected.delete(el.dataset.file);
      render();
    } else if(el.id==='cc-filter') {s.filter=el.value;render();}
    else if(el.id==='cc-organize') s.organized=el.checked;
  });
  root.addEventListener('input',event=>{
    const el=event.target;
    if (el.id==='cc-search') {
      const caret=el.selectionStart;s.search=el.value;render();
      const next=root.querySelector('#cc-search');
      next?.focus();next?.setSelectionRange(caret,caret);
    } else if(el.id==='cc-feedback') s.feedback=el.value;
  });
  chrome.runtime.onMessage.addListener(m=>{if(m?.type==='CLASSCRATE_TOGGLE'){s.open=!s.open;render();}});
  setInterval(()=>{if(s.open && s.page==='progress' && !s.busy) void loadJob().catch(e=>{s.error=e.message;render();});},1300);
  render();
})();
