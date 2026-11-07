import {collectMaterials, planFile, jobPath, driveDownloadUrl, summarize} from './lib/core.mjs';

const CLASSROOM='https://classroom.googleapis.com/v1';
const DRIVE='https://www.googleapis.com/drive/v3';
const JOB_KEY='classcrateDownloadJob';
const MAX_CONCURRENT=2;
let coursesCache=[];
let filesCache=new Map();
let currentCourseId='';
let jobLock=Promise.resolve();
let pumping=false;

function friendlyError(error) {
  const msg=String(error?.message || error || 'Unknown error');
  if (/oauth|invalid_client|token.*(missing|undefined)/i.test(msg)) return 'Google login configuration problem: '+msg;
  if (/403|denied|policy|permission/i.test(msg)) return 'Access blocked by Google Workspace or file permissions: '+msg;
  return msg;
}

async function auth(interactive=false) {
  const id=chrome.runtime.getManifest().oauth2?.client_id || '';
  if (!id || id.startsWith('REPLACE_WITH_')) {
    throw new Error('Google OAuth client ID not configured. See docs/SETUP.md.');
  }
  const value=await chrome.identity.getAuthToken({interactive});
  const token=typeof value==='string' ? value : value?.token;
  if (!token) throw new Error('Google sign-in returned no access token');
  return token;
}

async function googleGet(url) {
  let token=await auth(false);
  let response=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if (response.status===401) {
    await chrome.identity.removeCachedAuthToken({token});
    token=await auth(false);
    response=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  }
  if (!response.ok) {
    let detail='';
    try {detail=(await response.json())?.error?.message || '';} catch {}
    throw new Error('HTTP '+response.status+(detail ? ': '+detail : ''));
  }
  return response.json();
}

async function listPages(url,key) {
  let next='',page=0;
  const result=[];
  do {
    const request=new URL(url);
    request.searchParams.set('pageSize','100');
    if (next) request.searchParams.set('pageToken',next);
    const data=await googleGet(request.href);
    result.push(...(data[key] || []));
    next=data.nextPageToken || '';
    if (++page>40) throw new Error('Too many pages returned by Google Classroom');
  } while (next);
  return result;
}

async function listCourses() {
  const courses=await listPages(CLASSROOM+'/courses?courseStates=ACTIVE','courses');
  coursesCache=courses.map(c=>({id:String(c.id),name:c.name || 'Untitled subject',
    section:c.section || ''})).sort((a,b)=>a.name.localeCompare(b.name));
  await chrome.storage.session.set({classcrateCourses:coursesCache});
  return coursesCache;
}

async function mapLimited(items,limit,mapper) {
  let next=0;
  const out=new Array(items.length);
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while (next<items.length) {
      const i=next++;
      out[i]=await mapper(items[i]);
    }
  }));
  return out;
}

async function fetchFiles(courseId) {
  if (!/^[a-z0-9_-]{1,128}$/i.test(String(courseId))) throw new Error('Invalid Classroom subject ID');
  const base=CLASSROOM+'/courses/'+encodeURIComponent(courseId);
  const sections=[
    ['materials',base+'/courseWorkMaterials','courseWorkMaterial'],
    ['assignments',base+'/courseWork','courseWork'],
    ['announcements',base+'/announcements','announcements']
  ];
  const responses=await Promise.allSettled(sections.map(async ([kind,url,key])=>
    (await listPages(url,key)).map(row=>({...row,kind}))));
  const posts=[],warnings=[];
  responses.forEach((result,index)=>{
    if (result.status==='fulfilled') posts.push(...result.value);
    else warnings.push(sections[index][0]+': '+friendlyError(result.reason));
  });
  if (!posts.length && responses.every(r=>r.status==='rejected')) throw new Error(warnings.join(' | '));
  const materials=collectMaterials(posts);
  const enriched=await mapLimited(materials,4,async file=>{
    if (file.kind!=='drive') {
      return {...file,type:'LINK',downloadable:false,reason:'External link or YouTube video'};
    }
    try {
      const fields='id,name,mimeType,size,capabilities(canDownload)';
      const meta=await googleGet(DRIVE+'/files/'+encodeURIComponent(file.id)+'?fields='+encodeURIComponent(fields));
      return {...file,...planFile(meta,file.title),size:meta.size || null,mimeType:meta.mimeType};
    } catch(error) {
      return {...file,filename:file.title,type:'FILE',downloadable:false,reason:friendlyError(error)};
    }
  });
  filesCache=new Map(enriched.map(f=>[f.id,f]));
  currentCourseId=String(courseId);
  await chrome.storage.session.set({classcrateFiles:{courseId:currentCourseId,files:enriched}});
  return {files:enriched,warnings,postsCount:posts.length};
}

async function readJob() {return (await chrome.storage.local.get(JOB_KEY))[JOB_KEY] || null;}

function changeJob(update) {
  const operation=jobLock.then(async()=>{
    const job=await readJob();
    if (!job) return null;
    const changed=await update(job);
    if (changed!==false) await chrome.storage.local.set({[JOB_KEY]:job});
    return job;
  });
  jobLock=operation.catch(()=>{});
  return operation;
}

async function finishIfDone() {
  await changeJob(job=>{
    if (job.status!=='running') return false;
    if (!job.items.every(i=>['complete','failed','cancelled'].includes(i.status))) return false;
    job.status='finished';
    job.finishedAt=new Date().toISOString();
    return true;
  });
}

async function pumpQueue() {
  if (pumping) return;
  pumping=true;
  try {
    while (true) {
      let claimed=null;
      await changeJob(job=>{
        if (job.status!=='running') return false;
        const active=job.items.filter(i=>['starting','downloading'].includes(i.status)).length;
        if (active>=MAX_CONCURRENT) return false;
        const item=job.items.find(i=>i.status==='queued');
        if (!item) return false;
        item.status='starting';
        item.startedAt=Date.now();
        claimed={...item};
        return true;
      });
      if (!claimed) break;
      try {
        const token=await auth(false);
        const downloadId=await chrome.downloads.download({
          url:driveDownloadUrl(claimed),
          headers:[{name:'Authorization',value:'Bearer '+token}],
          filename:claimed.path,conflictAction:'uniquify',saveAs:false
        });
        if (!Number.isInteger(downloadId)) throw new Error('Chrome did not start a download');
        await changeJob(job=>{
          const item=job.items.find(i=>i.id===claimed.id);
          if (!item) return false;
          item.downloadId=downloadId;
          item.status='downloading';
          return true;
        });
      } catch(error) {
        await changeJob(job=>{
          const item=job.items.find(i=>i.id===claimed.id);
          if (!item) return false;
          item.status='failed';
          item.error=friendlyError(error);
          return true;
        });
      }
    }
    await finishIfDone();
  } finally {
    pumping=false;
  }
}

async function syncJob() {
  const existing=await readJob();
  if (existing?.status!=='running') return existing;
  const changes=[];
  for (const item of existing.items) {
    if (item.status==='downloading' && Number.isInteger(item.downloadId)) {
      const [download]=await chrome.downloads.search({id:item.downloadId});
      if (download?.state==='complete') changes.push([item.id,'complete','']);
      else if (download?.state==='interrupted') changes.push([item.id,'failed',download.error || 'Interrupted']);
      else if (!download) changes.push([item.id,'failed','Download missing from Chrome history']);
    }
    if (item.status==='starting' && Date.now()-(item.startedAt || 0)>45000) changes.push([item.id,'queued','']);
  }
  if (changes.length) {
    await changeJob(job=>{
      for (const [id,state,error] of changes) {
        const item=job.items.find(i=>i.id===id);
        if (item && ['starting','downloading'].includes(item.status)) {
          item.status=state;item.error=error;
          if (state==='queued') item.downloadId=null;
        }
      }
      return true;
    });
    await finishIfDone();
    void pumpQueue();
  }
  return readJob();
}

async function startDownload({courseId,selectedIds,organized}) {
  const existing=await readJob();
  if (existing?.status==='running') throw new Error('A download batch is already active');
  if (currentCourseId!==String(courseId)) {
    const session=(await chrome.storage.session.get('classcrateFiles')).classcrateFiles;
    if (session?.courseId===String(courseId)) {
      currentCourseId=session.courseId;
      filesCache=new Map(session.files.map(f=>[f.id,f]));
    }
  }
  if (currentCourseId!==String(courseId)) throw new Error('Fetch this subject again before downloading');
  const files=[...new Set(Array.isArray(selectedIds) ? selectedIds : [])]
    .map(id=>filesCache.get(String(id))).filter(f=>f?.kind==='drive' && f.downloadable);
  if (!files.length) throw new Error('Choose at least one downloadable file');
  if (!coursesCache.length) coursesCache=(await chrome.storage.session.get('classcrateCourses')).classcrateCourses || [];
  const course=coursesCache.find(c=>c.id===String(courseId));
  const courseName=course?.name || 'University subject';
  const job={id:'batch-'+Date.now(),status:'running',courseName,createdAt:new Date().toISOString(),
    finishedAt:null,items:files.map(f=>({id:f.id,filename:f.filename,
      postTitle:f.postTitle,type:f.type,exportMime:f.exportMime || null,
      path:jobPath(courseName,f,organized!==false),status:'queued',error:'',downloadId:null}))};
  await chrome.storage.local.set({[JOB_KEY]:job});
  void pumpQueue();
  return {id:job.id,count:job.items.length};
}

async function retryFailed() {
  const job=await changeJob(job=>{
    if (job.status!=='finished') throw new Error('Wait for the current downloads to finish');
    for (const item of job.items) if (item.status==='failed') {
      item.status='queued';item.error='';item.downloadId=null;
    }
    job.status='running';job.finishedAt=null;
    return true;
  });
  if (!job) throw new Error('No previous batch');
  void pumpQueue();
  return {success:true};
}

async function cancelJob() {
  const job=await readJob();
  if (!job || job.status!=='running') return {success:true};
  for (const item of job.items.filter(i=>i.status==='downloading' && Number.isInteger(i.downloadId))) {
    try {await chrome.downloads.cancel(item.downloadId);} catch {}
  }
  await changeJob(current=>{
    current.status='cancelled';current.finishedAt=new Date().toISOString();
    for (const item of current.items) if (['queued','starting','downloading'].includes(item.status)) item.status='cancelled';
    return true;
  });
  return {success:true};
}

chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if (!(sender.url || sender.tab?.url || '').startsWith('https://classroom.google.com/')) return;
  (async()=>{
    switch (message?.type) {
      case 'STATUS': return {configured:!chrome.runtime.getManifest().oauth2.client_id.startsWith('REPLACE_WITH_'),job:await readJob()};
      case 'CONNECT': await auth(true); return {success:true};
      case 'COURSES': return {courses:await listCourses()};
      case 'FILES': return fetchFiles(message.courseId);
      case 'START_DOWNLOAD': return startDownload(message);
      case 'JOB': {const job=await syncJob();return {job,summary:summarize(job)};}
      case 'RETRY': return retryFailed();
      case 'CANCEL': return cancelJob();
      case 'OPEN_DOWNLOADS': await chrome.tabs.create({url:'chrome://downloads/'});return {success:true};
      default: throw new Error('Unsupported request');
    }
  })().then(data=>reply({ok:true,...data}),error=>reply({ok:false,error:friendlyError(error)}));
  return true;
});

chrome.action.onClicked.addListener(async tab=>{
  if (tab?.url?.startsWith('https://classroom.google.com/') && tab.id) {
    try {await chrome.tabs.sendMessage(tab.id,{type:'CLASSCRATE_TOGGLE'});}
    catch {await chrome.tabs.reload(tab.id);}
  } else {
    await chrome.tabs.create({url:'https://classroom.google.com/'});
  }
});

chrome.downloads.onChanged.addListener(delta=>{
  if (!delta.state || !['complete','interrupted'].includes(delta.state.current)) return;
  void (async()=>{
    await changeJob(job=>{
      if (job.status!=='running') return false;
      const item=job.items.find(i=>i.downloadId===delta.id && i.status==='downloading');
      if (!item) return false;
      item.status=delta.state.current==='complete' ? 'complete' : 'failed';
      item.error=delta.state.current==='complete' ? '' : delta.error?.current || 'Download interrupted';
      return true;
    });
    await finishIfDone();
    await pumpQueue();
  })().catch(console.error);
});

chrome.runtime.onStartup.addListener(()=>{void syncJob().then(pumpQueue).catch(console.error);});
chrome.runtime.onInstalled.addListener(()=>{void syncJob().then(pumpQueue).catch(console.error);});
