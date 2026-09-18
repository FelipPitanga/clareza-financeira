import type {Data,Entry} from './finance.ts';
import {addDays,balance,money,obligations,sum,today,validate} from './finance.ts';
import {planMoney,spending} from './planning.ts';

export function withdrawalPlan(data:Data,sourceId:string,targetId:string,horizon=30,coverage=1,dailyBudget?:number){
 if(![7,15,30,60,90].includes(horizon)||![1,7,15,30].includes(coverage))throw Error('Período inválido.');
 if(dailyBudget!==undefined&&(!Number.isSafeInteger(dailyBudget)||dailyBudget<0))throw Error('Informe um orçamento diário válido.');
 const company=planMoney(data,'PJ','',horizon),source=company.accounts.find(a=>a.id===sourceId);
 const target=data.accounts.find(a=>a.id===targetId&&a.scope==='PF');
 // Cover deficits in other company accounts before offering any of this account's cash.
 const otherGaps=-sum(company.accounts.filter(a=>a.id!==sourceId),a=>a.gap);
 const maximum=source?Math.max(0,source.capacity-otherGaps):0;
 const until=addDays(today(),coverage-1),history=spending(data,'PF',targetId);
 const daily=dailyBudget??history.daily;
 const spentToday=sum(history.variable.filter(e=>(e.actual||e.date)===today()),e=>e.amount);
 const routine=Math.max(0,daily-spentToday)+daily*(coverage-1);
 const bills=target?obligations(data).filter(e=>e.account===target.id&&e.date<=until):[];
 const committed=sum(bills,e=>e.amount),current=target?balance(data,target.id):0;
 const reserved=target?sum(data.reserves.filter(r=>r.account===target.id),r=>r.amount):0;
 const available=current-reserved,need=target?Math.max(0,committed+routine-available):0;
 const suggested=Math.min(maximum,need);
 const transfers=data.entries.filter(e=>e.kind==='transfer'&&e.status==='paid'&&data.accounts.some(a=>a.id===e.account&&a.scope==='PJ')&&data.accounts.some(a=>a.id===e.destination&&a.scope==='PF')).sort((a,b)=>(b.actual||b.date).localeCompare(a.actual||a.date));
 return {company,source,target,otherGaps,maximum,until,history,daily,spentToday,routine,bills,committed,current,reserved,available,need,suggested,shortfall:need-suggested,transfers};
}

export function recordWithdrawal(data:Data,source:string,target:string,amount:number,horizon=30,coverage=1,dailyBudget?:number){
 const plan=withdrawalPlan(data,source,target,horizon,coverage,dailyBudget);
 if(!plan.source||!plan.target)throw Error('Selecione uma conta PJ de origem e uma conta PF de destino.');
 if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Informe um valor positivo.');
 if(amount>plan.maximum)throw Error(`A empresa pode liberar até ${money(plan.maximum)} desta conta neste cenário.`);
 const entry:Entry={id:crypto.randomUUID(),kind:'transfer',description:`Retirada PJ → PF · ${plan.target.name}`,amount,date:today(),actual:today(),scope:'PJ',account:source,destination:target,method:'Transferência',status:'paid',category:'Transferência entre contas',notes:`Retirada registrada após confirmação no banco. Proteção PJ: ${horizon} dias. Cobertura PF: ${coverage} dia(s).`};
 const next={...data,entries:[...data.entries,entry]};validate(next);return next;
}
