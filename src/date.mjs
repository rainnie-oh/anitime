export const dateTypes={year:'確切年份',range:'年份區間',decade:'年代',century:'世紀',period:'僅知歷史時期',unknown:'UNKNOWN'};
const y=n=>Number(n)<0?`公元前${Math.abs(Number(n))}`:String(n);
export function formatDate(d={type:'unknown'},periods=[]){
 const prefix=d.approx?'約':'';
 switch(d.type){
 case 'year':return d.start!==''&&d.start!=null?`${prefix}${y(d.start)}年${d.month ? `${Number(d.month)}月` : ''}${d.day ? `${Number(d.day)}日` : ''}`:'UNKNOWN';
 case 'range':return `${prefix}${y(d.start)}—${y(d.end)}年`;
 case 'decade':return `${prefix}${y(d.start)}年代`;
 case 'century':return `${prefix}${y(d.start)}世紀${d.part||''}`;
 case 'period':return periods.length?prefix+periods.map(p=>p.name).join('、'):'UNKNOWN';
 default:return 'UNKNOWN';
 }
}
export function dateError(d){
 if(!d||!dateTypes[d.type])return '請選擇年代類型';
 if(['year','range','decade','century'].includes(d.type)&&(!Number.isInteger(Number(d.start))||d.start===''||d.start==null||Number(d.start)===0))return '請輸入有效的非零整數年份或世紀';
 if(d.type==='range'&&(d.end===''||d.end==null||!Number.isInteger(Number(d.end))||Number(d.end)===0||Number(d.end)<Number(d.start)))return '結束年不能早於起始年';
 if(d.type==='decade'&&Number(d.start)%10!==0)return '年代應爲整十年份，例如1940';
 if(d.type==='century'&&Math.abs(Number(d.start))>100)return '世紀數超出範圍';
 if(d.type==='year'&&(d.month||d.day)){const m=Number(d.month),day=Number(d.day);if(!Number.isInteger(m)||m<1||m>12)return '請輸入1—12月';if(d.day&&(!Number.isInteger(day)||day<1||day>new Date(Date.UTC(Number(d.start),m,0)).getUTCDate()))return '請輸入有效日期';}
 return '';
}

// Unknown years stay near their known historical period without inventing a date.
export function dateOrder(work,period){
 const d=work.date||{};
 if(['year','range','decade'].includes(d.type)&&d.start!==''&&d.start!=null)return Number(d.start);
 if(d.type==='century')return Number(d.start)>0?(Number(d.start)-1)*100+1:Number(d.start)*100;
 return (period.start+period.end)/2;
}
