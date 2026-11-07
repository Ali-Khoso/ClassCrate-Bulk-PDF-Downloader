/** Pure business logic shared by the service worker and Node test suite. */
export function safePart(value, fallback = 'Untitled') {
  const cleaned = String(value ?? '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ').replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 96).trim();
  return cleaned && cleaned !== '.' && cleaned !== '..' ? cleaned : fallback;
}

export function getExtension(filename) {
  return String(filename ?? '').match(/\.([a-z\d]{1,12})$/i)?.[1]?.toLowerCase() || '';
}

export const GOOGLE_EXPORTS = Object.freeze({
  'application/vnd.google-apps.document': {mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',ext:'docx',label:'DOCX'},
  'application/vnd.google-apps.presentation': {mime:'application/vnd.openxmlformats-officedocument.presentationml.presentation',ext:'pptx',label:'PPTX'},
  'application/vnd.google-apps.spreadsheet': {mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ext:'xlsx',label:'XLSX'},
  'application/vnd.google-apps.drawing': {mime:'image/png',ext:'png',label:'PNG'}
});

const MIME_EXTENSIONS = Object.freeze({
  'application/pdf':'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':'pptx',
  'application/vnd.ms-powerpoint':'ppt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx',
  'application/msword':'doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx',
  'application/vnd.ms-excel':'xls',
  'text/plain':'txt','image/jpeg':'jpg','image/png':'png','application/zip':'zip'
});

export function planFile(meta, fallbackTitle = 'Attachment') {
  const mime = String(meta?.mimeType || '');
  const title = safePart(meta?.name || fallbackTitle, 'Attachment');
  const type = getExtension(title).toUpperCase() || 'FILE';
  if (meta?.capabilities?.canDownload === false) {
    return {downloadable:false,filename:title,type,reason:'File owner has disabled downloading'};
  }
  const exp = GOOGLE_EXPORTS[mime];
  if (exp) return {downloadable:true,filename:safePart(title.replace(/\.[^.]+$/,'') || title)+'.'+exp.ext,
    type:exp.label,exportMime:exp.mime,isExport:true};
  if (mime.startsWith('application/vnd.google-apps.')) {
    return {downloadable:false,filename:title,type:'GOOGLE',reason:'Unsupported Google Workspace file type'};
  }
  const ext = getExtension(title) || MIME_EXTENSIONS[mime] || '';
  return {downloadable:true,filename:getExtension(title) ? title : title+(ext ? '.'+ext : ''),
    type:ext.toUpperCase() || 'FILE',exportMime:null,isExport:false};
}

export function driveIdFromUrl(raw) {
  try {
    const url=new URL(raw);
    const host=url.hostname.toLowerCase();
    if (!['drive.google.com','docs.google.com'].includes(host)) return null;
    if (host==='docs.google.com' && !/^\/(document|presentation|spreadsheets|drawings?)\//.test(url.pathname)) return null;
    const match=url.pathname.match(/\/d\/([a-z\d_-]{8,200})(?:\/|$)/i);
    if (match) return match[1];
    if (host==='drive.google.com') {
      const id=url.searchParams.get('id');
      return id && /^[a-z\d_-]{8,200}$/i.test(id) ? id : null;
    }
    return null;
  } catch {return null;}
}

export function collectMaterials(posts) {
  const result=[], seenIds=new Set(), seenLinks=new Set();
  for (const post of posts) for (const material of post.materials || []) {
    const drive=material?.driveFile?.driveFile;
    if (drive?.id && !seenIds.has(drive.id)) {
      seenIds.add(drive.id);
      result.push({id:String(drive.id),title:drive.title || 'Drive attachment',
        postTitle:post.title || 'Classwork',source:post.kind || 'material',kind:'drive'});
      continue;
    }
    const link=material?.link;
    if (typeof link?.url==='string' && /^https?:\/\//i.test(link.url)) {
      const driveId=driveIdFromUrl(link.url);
      if (driveId && !seenIds.has(driveId)) {
        seenIds.add(driveId);
        result.push({id:driveId,title:link.title || 'Google Drive attachment',
          postTitle:post.title || 'Classwork',source:post.kind || 'material',kind:'drive'});
      } else if (!driveId && !seenLinks.has(link.url)) {
        seenLinks.add(link.url);
        result.push({id:'link:'+result.length,title:link.title || link.url,
          postTitle:post.title || 'Classwork',source:post.kind || 'material',kind:'link',url:link.url});
      }
    }
    const video=material?.youtubeVideo;
    if (video?.id && !seenLinks.has('video:'+video.id)) {
      seenLinks.add('video:'+video.id);
      result.push({id:'video:'+video.id,title:video.title || 'YouTube video',
        postTitle:post.title || 'Classwork',source:post.kind || 'material',kind:'link',
        url:'https://www.youtube.com/watch?v='+encodeURIComponent(video.id)});
    }
  }
  return result;
}

export function jobPath(courseName, file, organized=true) {
  const course=safePart(courseName,'Course');
  const filename=safePart(file.filename || file.title || 'Attachment');
  return organized
    ? 'ClassCrate/'+course+'/'+safePart(file.postTitle,'Classwork')+'/'+filename
    : 'ClassCrate/'+course+'/'+filename;
}

export function driveDownloadUrl(file) {
  if (!/^[a-z\d_-]{5,200}$/i.test(file.id)) throw new Error('Invalid Drive file ID');
  const base='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(file.id);
  return file.exportMime
    ? base+'/export?mimeType='+encodeURIComponent(file.exportMime)
    : base+'?alt=media';
}

export function summarize(job) {
  const items=job?.items || [], count=s=>items.filter(i=>i.status===s).length;
  const completed=count('complete'), failed=count('failed');
  return {total:items.length,completed,failed,waiting:count('queued')+count('starting'),
    active:count('downloading'),processed:completed+failed};
}
