import test from 'node:test';
import assert from 'node:assert/strict';

/** Offline integration test: Google APIs and Chrome are mocked. */
test('fetches a Classroom subject and completes a native Chrome download',async()=>{
  const handlers={},store={},session={},downloads=new Map();
  let nextId=40;
  const storage=state=>({
    async get(key){return {[key]:state[key]};},
    async set(data){Object.assign(state,data);}
  });
  globalThis.chrome={
    runtime:{
      getManifest:()=>({oauth2:{client_id:'test.apps.googleusercontent.com'}}),
      onMessage:{addListener(fn){handlers.message=fn;}},
      onStartup:{addListener(){}},onInstalled:{addListener(){}}
    },
    identity:{
      getAuthToken:async()=>({token:'mocktoken'}),
      removeCachedAuthToken:async()=>{}
    },
    storage:{local:storage(store),session:storage(session)},
    action:{onClicked:{addListener(){}}},
    tabs:{create:async()=>({})},
    downloads:{
      onChanged:{addListener(fn){handlers.download=fn;}},
      async download(opts){
        assert.equal(opts.filename,'ClassCrate/Algorithms/lectures/Merge.pdf');
        assert.equal(opts.headers[0].name,'Authorization');
        assert.equal(opts.headers[0].value,'Bearer mocktoken');
        const id=nextId++;
        downloads.set(id,{id,state:'in_progress'});
        return id;
      },
      async search(q){return downloads.has(q.id)?[downloads.get(q.id)]:[];},
      async cancel(id){if(downloads.has(id)) downloads.get(id).state='interrupted';}
    }
  };

  const originalFetch=globalThis.fetch;
  globalThis.fetch=async url=>{
    const u=String(url);
    let body;
    if (u.includes('/v1/courses?')) body={courses:[{id:'2026',name:'Algorithms',section:'B'}]};
    else if (u.includes('/courseWorkMaterials')) body={courseWorkMaterial:[
      {id:'20',title:'lectures',materials:[
        {driveFile:{driveFile:{id:'file1234567',title:'Merge.pdf'}}}]}]};
    else if (u.includes('/announcements')) body={announcements:[]};
    else if (u.includes('/courseWork')) body={courseWork:[]};
    else if (u.includes('/drive/v3/files/file1234567')) body={
      id:'file1234567',name:'Merge.pdf',mimeType:'application/pdf',
      capabilities:{canDownload:true}
    };
    else throw new Error('Unexpected API URL: '+u);
    return {ok:true,status:200,json:async()=>body};
  };
  try {
    await import('../extension/background.js');
    const send=msg=>new Promise(resolve=>handlers.message(
      msg,{url:'https://classroom.google.com/h'},resolve
    ));
    let response=await send({type:'COURSES'});
    assert.equal(response.ok,true);
    assert.equal(response.courses[0].name,'Algorithms');

    response=await send({type:'FILES',courseId:'2026'});
    assert.equal(response.ok,true);
    assert.equal(response.files[0].filename,'Merge.pdf');

    response=await send({type:'START_DOWNLOAD',courseId:'2026',
      selectedIds:['file1234567'],organized:true});
    assert.equal(response.ok,true);

    for(let i=0;i<40 && downloads.size===0;i++) await new Promise(r=>setTimeout(r,10));
    assert.equal(downloads.size,1);

    downloads.get(40).state='complete';
    handlers.download({id:40,state:{current:'complete'}});
    let job;
    for(let i=0;i<40;i++){
      const result=await send({type:'JOB'});
      job=result.job;
      if(job?.status==='finished') break;
      await new Promise(r=>setTimeout(r,10));
    }
    assert.equal(job.status,'finished');
    assert.equal(job.items[0].status,'complete');
  } finally {
    globalThis.fetch=originalFetch;
    delete globalThis.chrome;
  }
});
