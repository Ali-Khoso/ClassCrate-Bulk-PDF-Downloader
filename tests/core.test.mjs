import test from 'node:test';
import assert from 'node:assert/strict';
import {
  safePart,getExtension,planFile,collectMaterials,driveIdFromUrl,
  jobPath,driveDownloadUrl,summarize
} from '../extension/lib/core.mjs';

test('safe names cannot escape the Chrome Downloads folder',()=>{
  assert.equal(safePart(' ../A:B*<C>.. '),'_A_B__C_');
  assert.equal(safePart('...'),'Untitled');
  assert.equal(safePart('Topic / Week 7'),'Topic _ Week 7');
  assert.equal(getExtension('Topic.pdf'),'pdf');
});

test('PDF, PowerPoint and Word attachments keep their original formats',()=>{
  for (const [name,mime,type] of [
    ['Lecture.pdf','application/pdf','PDF'],
    ['Quick Sort.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation','PPTX'],
    ['Quiz.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document','DOCX']
  ]) {
    const file=planFile({name,mimeType:mime});
    assert.equal(file.filename,name);
    assert.equal(file.type,type);
    assert.equal(file.exportMime,null);
  }
});

test('native Google documents export to compatible Office files',()=>{
  const doc=planFile({name:'Notes',mimeType:'application/vnd.google-apps.document'});
  const slides=planFile({name:'Slides',mimeType:'application/vnd.google-apps.presentation'});
  assert.equal(doc.filename,'Notes.docx');
  assert.equal(slides.filename,'Slides.pptx');
  assert.equal(doc.isExport,true);
});

test('file owner download restrictions are honored',()=>{
  assert.equal(planFile({name:'private.pdf',mimeType:'application/pdf',
    capabilities:{canDownload:false}}).downloadable,false);
});

test('duplicate Classroom attachments are removed across posts',()=>{
  const posts=[
    {kind:'materials',title:'lectures',materials:[
      {driveFile:{driveFile:{id:'file12345',title:'Merge.pptx'}}},
      {link:{title:'Website',url:'https://example.org'}}]},
    {kind:'assignments',title:'quiz',materials:[
      {driveFile:{driveFile:{id:'file12345',title:'Merge.pptx'}}}]}
  ];
  const files=collectMaterials(posts);
  assert.equal(files.length,2);
  assert.equal(files[0].postTitle,'lectures');
  assert.equal(files[1].kind,'link');
});

test('download paths are grouped by subject and post',()=>{
  assert.equal(jobPath('Analysis of Algorithm (CS23-B)',{postTitle:'lectures',filename:'Merge Sort.pptx'}),
    'ClassCrate/Analysis of Algorithm (CS23-B)/lectures/Merge Sort.pptx');
  assert.equal(jobPath('Algorithms',{postTitle:'quiz',filename:'Quiz.pdf'},false),
    'ClassCrate/Algorithms/Quiz.pdf');
});

test('Drive download URL supports raw bytes and Workspace exports',()=>{
  assert.equal(driveDownloadUrl({id:'abcde12345',exportMime:null}),
    'https://www.googleapis.com/drive/v3/files/abcde12345?alt=media');
  assert.match(driveDownloadUrl({id:'abcde12345',exportMime:'application/pdf'}),
    /\/export\?mimeType=application%2Fpdf$/);
  assert.throws(()=>driveDownloadUrl({id:'../evil'}));
});

test('progress counts completed, failed, downloading and queued items',()=>{
  const count=summarize({items:[
    {status:'complete'},{status:'failed'},{status:'downloading'},
    {status:'queued'},{status:'starting'}
  ]});
  assert.deepEqual(count,{total:5,completed:1,failed:1,waiting:2,active:1,processed:2});
});

test('recognizes Google Drive links but not external lookalikes',()=>{
  assert.equal(driveIdFromUrl('https://drive.google.com/file/d/1LongDriveIdabcde_123/view'),
    '1LongDriveIdabcde_123');
  assert.equal(driveIdFromUrl('https://docs.google.com/presentation/d/slideDeck12345678/edit'),
    'slideDeck12345678');
  assert.equal(driveIdFromUrl('https://example.org/file/d/otherid1234'),null);
  assert.equal(driveIdFromUrl('https://drive.google.com/drive/folders/folderabc1234'),null);
});
