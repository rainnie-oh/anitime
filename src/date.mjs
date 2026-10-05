export const dateTypes={year:'确切年份',range:'年份区间',decade:'年代',century:'世纪',period:'仅知历史时期',unknown:'UNKNOWN'};
const y=n=>Number(n)<0?`公元前${Math.abs(Number(n))}`:String(n);
export function formatDate(d={type:'unknown'},periods=[]){
 const prefix=d.approx?'约':'';
 switch(d.type){
 case 'year':return d.start!==''&&d.start!=null?`${prefix}${y(d.start)}年`:'UNKNOWN';
 case 'range':return `${prefix}${y(d.start)}—${y(d.end)}年`;
 case 'decade':return `${prefix}${y(d.start)}年代`;
 case 'century':return `${prefix}${y(d.start)}世纪${d.part||''}`;
 case 'period':return periods.map(p=>p.name).join('、')||'UNKNOWN';
 default:return 'UNKNOWN';
 }
}
export function dateError(d){
 if(!d||!dateTypes[d.type])return '请选择年代类型';
 if(['year','range','decade','century'].includes(d.type)&&(!Number.isInteger(Number(d.start))||d.start===''||d.start==null||Number(d.start)===0))return '请输入有效的非零整数年份或世纪';
 if(d.type==='range'&&(d.end===''||d.end==null||!Number.isInteger(Number(d.end))||Number(d.end)===0||Number(d.end)<Number(d.start)))return '结束年不能早于起始年';
 if(d.type==='decade'&&Number(d.start)%10!==0)return '年代应为整十年份，例如1940';
 if(d.type==='century'&&Math.abs(Number(d.start))>100)return '世纪数超出范围';
 return '';
}
