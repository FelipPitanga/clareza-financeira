import type {Data,Entry,Reserve} from './finance.ts';
import {addDays,balance,money,obligations,sum,today} from './finance.ts';

const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const expenseDate=(e:Entry)=>e.actual||e.date;
export function spending(data:Data,scope:string,account:string){
 const end=today(),start=addDays(end,-27);
 const expenses=data.entries.filter(e=>e.kind==='expense'&&e.status!=='cancelled'&&(e.status==='paid'||e.card)&&(scope==='GERAL'||e.scope===scope)&&(!account||e.account===account)&&expenseDate(e)>=start&&expenseDate(e)<=end);
 const weekly=Array.from({length:4},(_,i)=>{const from=addDays(end,-27+i*7),to=addDays(from,6);const items=expenses.filter(e=>expenseDate(e)>=from&&expenseDate(e)<=to);return {from,to,label:i===3?'Últimos 7 dias':`${28-i*7} a ${22-i*7} dias atrás`,items,total:sum(items,e=>e.amount)}});
 const groups=[...new Set(expenses.map(e=>e.category||'Sem categoria'))].map(name=>{const items=expenses.filter(e=>(e.category||'Sem categoria')===name);return {name,items,current:sum(items.filter(e=>expenseDate(e)>=addDays(end,-6)),e=>e.amount),previous:sum(items.filter(e=>expenseDate(e)>=addDays(end,-13)&&expenseDate(e)<=addDays(end,-7)),e=>e.amount),total:sum(items,e=>e.amount)}}).sort((a,b)=>b.total-a.total);
 const food=expenses.filter(e=>/alimenta|comida|ifood|restaurante|lanche|delivery|mercado|padaria|refeic/.test(normalize(e.category+' '+e.description)));
 const shopee=expenses.filter(e=>/shopee/.test(normalize(e.description+' '+(e.origin||'')+' '+e.category)));
 const variable=expenses.filter(e=>(!e.recurrence||e.recurrence==='none')&&!e.debtId&&!(e.originalAmount&&e.originalAmount!==e.amount)&&!/divida|emprestimo|aluguel|moradia|imposto|funcionario|salario|internet|energia|faculdade|financiamento|fornecedor|software/.test(normalize(e.category+' '+e.description)));
 const first=expenses.map(expenseDate).sort()[0],coverage=first?Math.min(28,Math.round((Date.parse(end)-Date.parse(first))/86400000)+1):0;
 const daily=coverage?Math.ceil(sum(variable,e=>e.amount)/coverage):0;
 return {expenses,weekly,groups,food,shopee,variable,coverage,daily,foodWeek:sum(food.filter(e=>expenseDate(e)>=addDays(end,-6)),e=>e.amount),shopeeWeek:sum(shopee.filter(e=>expenseDate(e)>=addDays(end,-6)),e=>e.amount)};
}

export function goalPace(goal:Reserve){
 const remaining=Math.max(0,goal.goal-goal.amount),days=Math.max(1,Math.ceil((Date.parse(goal.targetDate||today())-Date.parse(today()))/86400000));
 return {remaining,days,monthly:Math.ceil(remaining/Math.max(1,days/30)),weekly:Math.ceil(remaining/Math.max(1,days/7)),late:!!goal.targetDate&&goal.targetDate<today(),progress:Math.min(100,goal.amount/goal.goal*100)};
}

export function planMoney(data:Data,scope:string,account:string,horizon:number){
 const until=addDays(today(),horizon),due=obligations(data);
 const accounts=data.accounts.filter(a=>(scope==='GERAL'||a.scope===scope)&&(!account||a.id===account)).map(a=>{
  const history=spending(data,a.scope,a.id),current=balance(data,a.id),reserved=sum(data.reserves.filter(r=>r.account===a.id),r=>r.amount),bills=due.filter(e=>e.account===a.id&&e.date<=until),committed=sum(bills,e=>e.amount),routine=history.daily*horizon;
  return {...a,current,reserved,committed,routine,bills,coverage:history.coverage,capacity:Math.max(0,current-reserved-committed-routine),gap:Math.min(0,current-reserved-committed-routine)};
 });
 const goals=data.reserves.filter(r=>r.isGoal&&accounts.some(a=>a.id===r.account)).sort((a,b)=>(a.priority||2)-(b.priority||2)||(a.targetDate||'').localeCompare(b.targetDate||'')||a.id.localeCompare(b.id));
 const available=new Map(accounts.map(a=>[a.id,a.capacity]));
 const allocations=goals.map(goal=>{const pace=goalPace(goal),budget=available.get(goal.account)||0;const amount=Math.min(budget,pace.remaining,Math.ceil(pace.monthly*horizon/30));available.set(goal.account,budget-amount);return {goal,pace,amount,account:accounts.find(a=>a.id===goal.account)!}});
 const prepay=due.filter(e=>e.date>addDays(today(),7)&&e.date<=until&&accounts.some(a=>a.id===e.account&&a.gap===0&&a.current-a.reserved>=e.amount)).sort((a,b)=>b.amount-a.amount).slice(0,3);
 return {accounts,allocations,prepay,capacity:sum(accounts,a=>a.capacity),routine:sum(accounts,a=>a.routine),reserved:sum(accounts,a=>a.reserved),committed:sum(accounts,a=>a.committed),gap:sum(accounts,a=>a.gap),current:sum(accounts,a=>a.current),until};
}

export function contribute(data:Data,id:string,amount:number,horizon:number){
 const goal=data.reserves.find(r=>r.id===id&&r.isGoal);if(!goal)throw Error('Meta não encontrada.');
 const capacity=planMoney(data,'GERAL',goal.account,horizon).accounts[0]?.capacity||0;
 if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Informe um valor positivo.');
 if(amount>goal.goal-goal.amount)throw Error('O aporte excede o valor que falta para a meta.');
 if(amount>capacity)throw Error(`Neste horizonte, o valor disponível para guardar nesta conta é ${money(capacity)}. Revise seus compromissos antes de reservar mais.`);
 return {...data,reserves:data.reserves.map(r=>r.id===id?{...r,amount:r.amount+amount}:r)};
}
