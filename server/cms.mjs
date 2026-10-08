import fs from 'node:fs';
import {seriesFields} from '../src/series.mjs';
import path from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dateError} from '../src/date.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function createCMS({directory=path.join(root,'.cms')}={}){
 fs.mkdirSync(directory,{recursive:true,mode:0o700});
 const dbFile=path.join(directory,'content.json'),authFile=path.join(directory,'auth.json');
 const baselineVersions=JSON.parse(fs.readFileSync(path.join(root,'server/copy-versions.json'),'utf8'));
 const read=()=>{const db=JSON.parse(fs.readFileSync(fs.existsSync(dbFile)?dbFile:path.join(root,'server/seed.json'),'utf8'));db.copyVersions=[...baselineVersions,...(db.copyVersions||[]).filter(v=>!baselineVersions.some(b=>b.id===v.id))];return db;};
 const write=(file,value)=>{fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2),{mode:0o600});fs.renameSync(file+'.tmp',file);};
 const sessions=new Map(),attempts=new Map();
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
 const body=async req=>{let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>8*1024*1024)fail('文件過大，最多5MB',413);}try{return JSON.parse(data||'{}');}catch{fail('請求格式無效');}};
 const session=req=>{const token=req.headers.cookie?.match(/(?:^|; )anitime_session=([a-f0-9]+)/)?.[1];return sessions.get(token)>Date.now()?token:null;};
 const login=res=>{const token=randomBytes(32).toString('hex');sessions.set(token,Date.now()+8*3600000);res.setHeader('Set-Cookie',`anitime_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);};
 const safeUrl=v=>!v||/^https?:\/\//i.test(v);
 return async function cms(req,res,next=()=>json(res,404,{error:'不存在'})){
  const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/api/'))return next();
  try{
   if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)fail('請求來源不匹配',403);
   if(url.pathname==='/api/session'&&req.method==='GET')return json(res,200,{authenticated:!!session(req),setup:!fs.existsSync(authFile)});
   if(['/api/setup','/api/login'].includes(url.pathname)&&req.method==='POST'){
    const ip=req.socket.remoteAddress;const recent=(attempts.get(ip)||[]).filter(t=>t>Date.now()-60000);if(recent.length>=8)fail('嘗試過於頻繁，請一分鐘後重試',429);attempts.set(ip,[...recent,Date.now()]);
    const {password}=await body(req);if(typeof password!=='string'||password.length<10||password.length>200)fail('密碼需爲10—200個字符');
    if(url.pathname==='/api/setup'){
     if(fs.existsSync(authFile))fail('管理員已設置',409);
     if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip))fail('首次設置僅允許在本機完成',403);
     const salt=randomBytes(16).toString('hex');write(authFile,{salt,hash:scryptSync(password,salt,64).toString('hex')});
    }else{
     if(!fs.existsSync(authFile))fail('請先設置管理員');const auth=JSON.parse(fs.readFileSync(authFile));if(!timingSafeEqual(scryptSync(password,auth.salt,64),Buffer.from(auth.hash,'hex')))fail('密碼不正確',401);
    }
    login(res);return json(res,200,{ok:true});
   }
   if(url.pathname==='/api/public'&&req.method==='GET'){const db=read();return json(res,200,{regions:db.regions,periods:db.periods,works:db.works.filter(w=>w.status!=='trash'&&w.published).map(w=>{const {notes,published,...publicWork}=w.published;return publicWork;})});}
   if(!session(req))fail('請先登錄',401);
   if(url.pathname==='/api/logout'&&req.method==='POST'){sessions.delete(session(req));res.setHeader('Set-Cookie','anitime_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
   if(url.pathname==='/api/admin'&&req.method==='GET')return json(res,200,read());
   if(url.pathname==='/api/copy-version'&&req.method==='POST'){
    const input=await body(req),db=read();if(input.revision!==db.revision)fail('內容已被其他窗口修改，請重新加載後再保存',409);
    const at=new Date().toISOString();
    const snapshot=name=>({id:randomBytes(12).toString('hex'),name,createdAt:at,descriptions:Object.fromEntries(db.works.filter(w=>w.status!=='trash').map(w=>[w.id,w.description]))});
    if(input.action==='create'){
     if(typeof input.name!=='string'||!input.name.trim()||input.name.length>80)fail('請填寫版本名稱（最多80字）');
     db.copyVersions.push(snapshot(input.name.trim()));
    }else if(input.action==='restore'){
     const version=db.copyVersions.find(v=>v.id===input.versionId);if(!version)fail('版本不存在',404);
     db.copyVersions.push(snapshot('還原前自動備份 · '+version.name));
     for(const w of db.works)if(w.status!=='trash'&&typeof version.descriptions[w.id]==='string'){w.description=version.descriptions[w.id];w.updatedAt=at;}
    }else fail('操作無效');
    db.revision++;db.history=[{at,action:input.action==='create'?'copy-snapshot':'copy-restore',name:input.action==='create'?input.name:db.copyVersions.find(v=>v.id===input.versionId).name},...(db.history||[])].slice(0,200);
    write(dbFile,db);return json(res,200,db);
   }
   if(url.pathname==='/api/upload'&&req.method==='POST'){
    const {data}=await body(req);const match=typeof data==='string'&&data.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);if(!match)fail('僅支持PNG、JPEG、WebP圖片');
    const buffer=Buffer.from(match[2],'base64');if(buffer.length>5*1024*1024)fail('圖片不能超過5MB');
    const valid=match[1]==='png'?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):match[1]==='jpeg'?buffer[0]===255&&buffer[1]===216:buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP';if(!valid)fail('圖片格式無效');
    const name=randomBytes(12).toString('hex')+'.'+match[1];const dir=path.join(root,'public/uploads');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name),buffer);return json(res,200,{image:'/uploads/'+name});
   }
   if(url.pathname==='/api/work'&&req.method==='POST'){
    const input=await body(req),db=read();if(input.revision!==db.revision)fail('內容已被其他窗口修改，請重新加載後再保存',409);
    const index=db.works.findIndex(w=>w.id===input.work?.id),old=db.works[index],action=input.action;
    if(!['save','publish','unpublish','trash','restore'].includes(action))fail('操作無效');
    let w;
    if(['trash','restore','unpublish'].includes(action)){
     if(!old)fail('作品不存在',404);w={...old};if(action==='trash')w.status='trash';if(action==='restore'){w.status='draft';w.published=null;}if(action==='unpublish'){w.status='draft';w.published=null;}
    }else{
     const fields=['name','original','regions','periodIds','date','source','description','medium','nature','image','imageSource','width','height','evidenceUrl','evidence','notes'];w=Object.fromEntries(fields.map(k=>[k,input.work[k]]));
     try{Object.assign(w,seriesFields(input.work));}catch(e){fail(e.message);}
     if(w.seriesId&&db.works.some(x=>x.id!==old?.id&&x.seriesId===w.seriesId&&x.seriesName!==w.seriesName))fail('同一系列標識應使用相同的系列名稱');
     if(typeof w.name!=='string'||!w.name.trim())fail('請填寫中文名');w.name=w.name.trim();if(w.name.includes('|'))fail('作品名不能包含豎線字符');
     for(const k of ['original','source','description','medium','nature','image','imageSource','evidenceUrl','evidence','notes']){if(typeof w[k]!=='string'||w[k].length>10000)fail('字段格式無效');}
     if(db.works.some(x=>x.id!==old?.id&&x.name===w.name))fail('作品名稱已存在');
     if(!Array.isArray(w.regions)||!w.regions.length||w.regions.some(r=>!db.regions.includes(r)))fail('請選擇地域');
     if(!Array.isArray(w.periodIds)||!w.periodIds.length||w.periodIds.some(id=>!db.periods.some(p=>p.id===id&&w.regions.includes(p.region))))fail('請選擇對應地域的時期');
     const error=dateError(w.date);if(error)fail(error);
     for(const k of ['source','imageSource','evidenceUrl'])if(!safeUrl(w[k]))fail('鏈接必須以http或https開頭');
     if(w.image&&!/^\/(covers|uploads)\/[a-zA-Z0-9_.-]+$/.test(w.image))fail('請上傳封面圖片');
     if(action==='publish'&&(!w.description.trim()||!w.source||!w.image))fail('發佈前請補齊介紹、官方鏈接和封面');
     w.id=old?.id||randomBytes(12).toString('hex');w.published=old?.published||null;w.status=w.published?'published':'draft';
     if(action==='publish'){w.status='published';w.published={...w,published:undefined};}
    }
    w.updatedAt=new Date().toISOString();if(index<0)db.works.push(w);else db.works[index]=w;
    db.revision++;db.history=[{at:w.updatedAt,action,name:w.name,id:w.id},...(db.history||[])].slice(0,200);write(dbFile,db);return json(res,200,db);
   }
   return json(res,404,{error:'接口不存在'});
  }catch(e){json(res,e.status||500,{error:e.status?e.message:'保存失敗，請重試'});}
 };
}
export function cmsPlugin(){return {name:'anitime-cms',configureServer(server){server.middlewares.use(createCMS());}};}
