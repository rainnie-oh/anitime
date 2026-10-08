export function filterSeries(catalog, seriesId) {
 if (!seriesId) return catalog;
 const works=catalog.works.filter(w=>w.seriesId===seriesId);
 return {...catalog,works,regions:catalog.regions.filter(r=>works.some(w=>w.regions.includes(r)))};
}
export function seriesFields(input) {
 const result={};
 for(const key of ['seriesId','seriesName','edition']) {
  const value=input[key]??'';
  if(typeof value!=='string'||value.length>120)throw new Error('系列字段格式無效');
  result[key]=value.trim();
 }
 result.cardStyle=input.cardStyle??'poster';
 if(!['poster','chapter'].includes(result.cardStyle))throw new Error('請選擇有效的節點樣式');
 if(!!result.seriesId!==!!result.seriesName)throw new Error('請同時填寫系列標識和系列名稱');
 if(result.seriesId&&!/^[a-z0-9][a-z0-9-]*$/.test(result.seriesId))throw new Error('系列標識請使用小寫字母、數字和連字符');
 if(result.cardStyle==='chapter'&&(!result.seriesId||!result.edition))throw new Error('篇章節點需要填寫系列和版本');
 return result;
}
