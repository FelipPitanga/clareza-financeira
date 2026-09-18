import test from 'node:test';
import assert from 'node:assert/strict';
import {empty,settleDebt,balance,metrics,today,addDays,addMonths,validate} from '../lib/finance.ts';
import {planMoney,contribute,spending,goalPace} from '../lib/planning.ts';
const fixture=()=>({...structuredClone(empty),accounts:[{id:'a',name:'Nubank PF',institution:'Nubank',scope:'PF',initial:500000}],entries:[{id:'loan',description:'Empréstimo',amount:300000,date:today(),scope:'PF',account:'a',kind:'expense',method:'Pix',status:'pending',category:'Dívidas e empréstimos'}]});
test('3000 menos 1700 deixa 1300 com novo vencimento e saída única',()=>{
 const d=settleDebt(fixture(),'loan',170000,'a',today(),addDays(today(),10));
 const loan=d.entries.find(e=>e.id==='loan');assert.equal(loan.amount,130000);assert.equal(loan.originalAmount,300000);assert.equal(loan.date,addDays(today(),10));assert.equal(balance(d,'a'),330000);assert.equal(metrics(d,'PF','',7).committed,0);assert.equal(metrics(d,'PF','',30).committed,130000);
 assert.equal(d.entries.filter(e=>e.status==='paid').reduce((s,e)=>s+e.amount,0),170000);validate(d);
 const paid=settleDebt(d,'loan',130000,'a',today());assert.equal(balance(paid,'a'),200000);assert.equal(metrics(paid,'PF','',30).committed,0);assert.equal(paid.entries.filter(e=>e.status==='paid').reduce((s,e)=>s+e.amount,0),300000);validate(paid);
});
test('pagamentos repetidos, valores excessivos e vencimento inválido são rejeitados',()=>{
 assert.throws(()=>settleDebt(fixture(),'loan',310000,'a',today(),today()));assert.throws(()=>settleDebt(fixture(),'loan',-1,'a',today(),today()));assert.throws(()=>settleDebt(fixture(),'loan',170000,'a',today(),'2026-99-99'));
 const d=settleDebt(fixture(),'loan',300000,'a',today());assert.throws(()=>settleDebt(d,'loan',100,'a',today()));
});
test('pagamento de outra conta PF afeta apenas a conta escolhida',()=>{
 const d=fixture();d.accounts.push({id:'b',name:'Inter',institution:'Inter',scope:'PF',initial:200000});const paid=settleDebt(d,'loan',170000,'b',today(),addDays(today(),7));assert.equal(balance(paid,'a'),500000);assert.equal(balance(paid,'b'),30000);assert.equal(metrics(paid,'GERAL','',30).free,400000);
 d.accounts[1].scope='PJ';assert.throws(()=>settleDebt(d,'loan',10000,'b',today(),today()),/PF\/PJ/);
});
test('duas metas compartilham a margem sem duplicação e aporte reduz saldo livre',()=>{
 const d=fixture();d.entries=[];d.reserves=[{id:'g1',name:'Carro',account:'a',isGoal:true,amount:0,goal:800000,targetDate:addDays(today(),30),priority:1},{id:'g2',name:'Viagem',account:'a',isGoal:true,amount:0,goal:800000,targetDate:addDays(today(),30),priority:2}];
 const p=planMoney(d,'PF','',30);assert.equal(p.capacity,500000);assert.equal(p.allocations.reduce((s,a)=>s+a.amount,0),500000);assert.equal(p.allocations[0].goal.id,'g1');assert.equal(p.allocations[1].amount,0);
 const next=contribute(d,'g1',100000,30);validate(next);assert.equal(balance(next,'a'),500000);assert.equal(metrics(next,'PF','',30).free,400000);assert.throws(()=>contribute(next,'g2',450000,30));
});
test('recebimentos previstos não financiam metas; compromissos e rotina são protegidos',()=>{
 const d=fixture();d.entries.push({id:'r',description:'Cliente',amount:900000,date:addDays(today(),1),scope:'PF',account:'a',kind:'income',method:'Pix',status:'pending',category:'Clientes'});
 for(let i=0;i<28;i++)d.entries.push({id:'food'+i,description:'iFood',amount:1000,date:addDays(today(),-i),scope:'PF',account:'a',kind:'expense',method:'Pix',status:'paid',category:'Alimentação'});
 const p=planMoney(d,'PF','',30);assert.equal(p.routine,30000);assert.equal(p.capacity,142000);assert.equal(spending(d,'PF','').foodWeek,7000);
});
test('compras no cartão são analisadas sem repetir a quitação da fatura',()=>{
 const d=fixture();d.entries=[{id:'food',description:'Shopee',amount:20000,date:today(),scope:'PF',account:'a',kind:'expense',method:'Cartão de crédito',status:'pending',category:'Compras',card:'c',invoice:today()},{id:'pay',description:'Fatura',amount:20000,date:today(),scope:'PF',account:'a',kind:'invoice',method:'Pix',status:'paid',category:'Fatura',card:'c',invoice:today()}];
 assert.equal(spending(d,'PF','').weekly[3].total,20000);assert.equal(spending(d,'PF','').shopeeWeek,20000);
});
test('prazo e reserva da meta são validados',()=>{const d=fixture();d.reserves=[{id:'g',name:'Viagem',account:'a',isGoal:true,amount:0,goal:800000,targetDate:addMonths(today(),8),priority:2}];validate(d);assert.ok(goalPace(d.reserves[0]).monthly>0);d.reserves[0].amount=900000;assert.throws(()=>validate(d));});
