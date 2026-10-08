import React,{useState} from 'react';

export default function CopyVersions({db,edit,onUse,onChange,disabled}){
 const [versionId,setVersionId]=useState('copy-v2'),[workId,setWorkId]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
 const versions=db.copyVersions||[],version=versions.find(v=>v.id===versionId)||versions[0];
 const work=edit||db.works.find(w=>w.id===workId)||db.works.find(w=>w.status!=='trash');
 const saved=version?.descriptions[work?.id];
 async function act(action){setBusy(true);setError('');try{
  const response=await fetch('/api/copy-version',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,revision:db.revision,versionId:version?.id,name})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'保存失敗');onChange(result,action);if(action==='create'){setVersionId(result.copyVersions.at(-1).id);setName('');}setConfirm(false);
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <details className="cms-copy-versions"><summary>文案版本</summary><div className="cms-copy-body">
 <p>V1 保留最初生成的完整原文；V2 保留本次編輯結果。版本只包含作品介紹。</p>
 <div className="cms-fields"><label>比較版本<select value={version?.id||''} onChange={e=>{setVersionId(e.target.value);setConfirm(false);}}>{versions.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
 {!edit&&<label>作品<select value={work?.id||''} onChange={e=>setWorkId(e.target.value)}>{db.works.filter(w=>w.status!=='trash').map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>}</div>
 <div className="cms-copy-compare"><section><h4>{version?.name}</h4><p>{saved??'此版本未收錄這部作品。'}</p></section><section><h4>{edit?'正在編輯':'目前草稿'} · {work?.name}</h4><p>{work?.description||'尚未填寫介紹'}</p></section></div>
 {edit?<button type="button" disabled={disabled||saved===undefined} onClick={()=>onUse(saved)}>將此篇載入編輯器</button>:<>
 <div className="cms-copy-actions"><label>新版本名稱<input maxLength="80" value={name} onChange={e=>setName(e.target.value)} placeholder="例如 V3 · 手動修訂"/></label><button disabled={busy||disabled||!name.trim()} onClick={()=>act('create')}>保存目前全部草稿為版本</button></div>
 {!confirm?<button disabled={busy||disabled} onClick={()=>setConfirm(true)}>將此版全部載入草稿</button>:<div className="cms-copy-confirm"><p>將「{version?.name}」載入所有已收錄作品的草稿？還原前會自動備份目前文案，前臺仍顯示原發布版本。</p><button disabled={busy||disabled} onClick={()=>act('restore')}>確認載入草稿</button><button disabled={busy} onClick={()=>setConfirm(false)}>取消</button></div>}
 </>}
 {edit&&<small>載入後可繼續修改，再選擇保存草稿或發布。</small>}{error&&<p role="alert" className="cms-error">{error}</p>}
 </div></details>;
}
