export function filterSeries(catalog, seriesId) {
 if (!seriesId) return catalog;
 const works=catalog.works.filter(w=>w.seriesId===seriesId);
 return {...catalog,works,regions:catalog.regions.filter(r=>works.some(w=>w.regions.includes(r)))};
}
export function seriesFields(input) {
 const result={};
 for(const key of ['seriesId','seriesName','edition']) {
  const value=input[key]??'';
  if(typeof value!=='string'||value.length>120)throw new Error('系列字段格式无效');
  result[key]=value.trim();
 }
 result.cardStyle=input.cardStyle??'poster';
 if(!['poster','chapter'].includes(result.cardStyle))throw new Error('请选择有效的节点样式');
 if(!!result.seriesId!==!!result.seriesName)throw new Error('请同时填写系列标识和系列名称');
 if(result.seriesId&&!/^[a-z0-9][a-z0-9-]*$/.test(result.seriesId))throw new Error('系列标识请使用小写字母、数字和连字符');
 if(result.cardStyle==='chapter'&&(!result.seriesId||!result.edition))throw new Error('篇章节点需要填写系列和版本');
 return result;
}
