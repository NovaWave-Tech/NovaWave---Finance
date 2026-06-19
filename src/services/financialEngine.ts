import type { FinanceRecord, FinanceTable } from '../types/database';

export type FinanceData = Record<FinanceTable, FinanceRecord[]>;
const sum = (items: FinanceRecord[], field: keyof FinanceRecord = 'valor') => items.reduce((total,item)=>total+(Number(item[field])||0),0);
const active = (item: FinanceRecord) => !['cancelada','cancelado','estornada'].includes(item.status??'');
const inMonth = (item: FinanceRecord, month: string, field: keyof FinanceRecord='data') => String(item[field]??'').startsWith(month);
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;

export function calculateFinancialSnapshot(data: FinanceData, reference = new Date()) {
  const today=reference.toISOString().slice(0,10), currentMonth=monthKey(reference);
  const receivedAll=data.receitas.filter(x=>active(x)&&x.status!=='pendente'&&(x.data??'')<=today);
  const paidExpensesAll=data.despesas.filter(x=>active(x)&&x.status==='pago'&&x.tipo!=='pagamento_cartao'&&(x.data??'')<=today);
  const paidInvoicesAll=data.faturas_cartao.filter(x=>x.status==='paga');
  const contributionsAll=data.aportes_metas.filter(x=>(x.data??'')<=today);
  const confirmedMoves=data.movimentacoes_investimentos.filter(x=>x.status!=='pendente'&&x.status!=='cancelada'&&(x.data??'')<=today);
  const applicationsAll=confirmedMoves.filter(x=>x.tipo==='aplicacao');
  const redemptionsAll=confirmedMoves.filter(x=>x.tipo==='resgate');
  const availableBalance=sum(receivedAll)-sum(paidExpensesAll)-sum(paidInvoicesAll)-sum(contributionsAll)-sum(applicationsAll)+sum(redemptionsAll);
  const goalsTotal=sum(data.metas_financeiras,'valor_atual');
  const investedTotal=data.investimentos.reduce((total,item)=>total+(item.valor_investido??0),0);
  const monthReceived=receivedAll.filter(x=>inMonth(x,currentMonth));
  const monthPredicted=data.receitas.filter(x=>active(x)&&inMonth(x,currentMonth)&&(x.status==='pendente'||(x.data??'')>today));
  const monthPaidExpenses=paidExpensesAll.filter(x=>inMonth(x,currentMonth));
  const monthPaidInvoices=paidInvoicesAll.filter(x=>inMonth(x,currentMonth,'paga_em'));
  const monthContributions=contributionsAll.filter(x=>inMonth(x,currentMonth));
  const monthApplications=applicationsAll.filter(x=>inMonth(x,currentMonth));
  const monthRedemptions=redemptionsAll.filter(x=>inMonth(x,currentMonth));
  const pendingExpenses=data.despesas.filter(x=>active(x)&&x.status==='pendente');
  const overdueExpenses=data.despesas.filter(x=>active(x)&&x.status!=='pago'&&(x.data??'')<today);
  const openInvoices=data.faturas_cartao.filter(x=>['aberta','fechada','atrasada'].includes(x.status??''));
  const openInvoiceTotal=sum(openInvoices);
  const economy=sum(monthReceived)-sum(monthPaidExpenses)-sum(monthPaidInvoices)-sum(monthContributions)-sum(monthApplications)+sum(monthRedemptions);
  const predictedIncome=sum(monthReceived)+sum(monthPredicted);
  const predictedCommitment=sum(pendingExpenses)+openInvoiceTotal;
  const categoryMap=monthPaidExpenses.reduce<Record<string,number>>((acc,item)=>{const key=item.categoria??'Sem categoria';acc[key]=(acc[key]??0)+(item.valor??0);return acc},{});
  const paymentMap=monthPaidExpenses.reduce<Record<string,number>>((acc,item)=>{const key=item.forma_pagamento??'Não informado';acc[key]=(acc[key]??0)+(item.valor??0);return acc},{});
  const months=Array.from({length:6},(_,index)=>{const date=new Date(reference.getFullYear(),reference.getMonth()-5+index,1);return {key:monthKey(date),label:new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(date).replace('.','')}});
  let running=sum(data.receitas.filter(x=>active(x)&&(x.data??'')<months[0].key))-sum(data.despesas.filter(x=>active(x)&&x.status==='pago'&&(x.data??'')<months[0].key));
  const timeline=months.map(month=>{const receitas=sum(data.receitas.filter(x=>active(x)&&x.status!=='pendente'&&inMonth(x,month.key)));const despesas=sum(data.despesas.filter(x=>active(x)&&x.status==='pago'&&inMonth(x,month.key)));const faturas=sum(data.faturas_cartao.filter(x=>x.status==='paga'&&inMonth(x,month.key,'paga_em')));running+=receitas-despesas-faturas;return {...month,receitas,despesas:despesas+faturas,faturas,saldo:running,patrimonio:running+goalsTotal+investedTotal}});
  const budgets=data.orcamentos_categoria.map(budget=>{const category=data.categorias_financeiras.find(x=>x.id===budget.categoria_id);const spent=categoryMap[category?.nome??'']??0;const limit=budget.limite??0;return {...budget,nome:category?.nome??'Categoria',gasto:spent,percentual:limit?spent/limit*100:0}});
  const alerts=[
    ...overdueExpenses.slice(0,3).map(item=>({type:'danger',title:'Despesa atrasada',description:`${item.descricao} · ${item.data}`})),
    ...openInvoices.filter(x=>(x.data_vencimento??'')>=today).slice(0,2).map(item=>({type:'warning',title:'Fatura a vencer',description:`Vencimento ${item.data_vencimento}`})),
    ...monthPredicted.slice(0,2).map(item=>({type:'info',title:'Receita pendente',description:item.descricao??'Receita prevista'})),
    ...budgets.filter(x=>x.percentual>=80).map(item=>({type:item.percentual>=100?'danger':'warning',title:'Orçamento em alerta',description:`${item.nome}: ${item.percentual.toFixed(0)}% utilizado`})),
  ];
  return {currentMonth,availableBalance,goalsTotal,investedTotal,patrimony:availableBalance+goalsTotal+investedTotal,received:sum(monthReceived),predictedRevenue:sum(monthPredicted),paidExpenses:sum(monthPaidExpenses),pendingExpenses:sum(pendingExpenses),overdueExpenses:sum(overdueExpenses),openInvoiceTotal,economy,savingsRate:sum(monthReceived)?economy/sum(monthReceived)*100:0,incomeCommitment:predictedIncome?predictedCommitment/predictedIncome*100:0,categories:Object.entries(categoryMap).map(([name,value])=>({name,value})),paymentMethods:Object.entries(paymentMap).map(([name,value])=>({name,value})),timeline,budgets,alerts};
}
