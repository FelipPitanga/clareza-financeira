# Clareza — arquitetura financeira

Aplicação React/Vinext em Cloudflare Workers. D1 guarda dados privados por usuário e R2 guarda comprovantes. A autenticação é fornecida pelo ChatGPT; endpoints recusam visitantes sem identidade. A publicação permanece privada para o proprietário.

## Modelo e integridade

- finance_users: identidade estável, revisão de concorrência e categorias.
- accounts: instituição, PF/PJ e saldo inicial em centavos.
- cards: conta de pagamento, limite, fechamento e vencimento.
- entries: fatos financeiros, obrigações, previsões, transferências e quitações; parcelas têm grupo e identificação individual.
- reserves: valores reservados em contas, com objetivo.

Chaves compostas por proprietário e identificador isolam os registros. Contas são referenciadas por cartões, movimentações e reservas. Os campos relacionais principais têm colunas SQL; detalhes opcionais ficam em payload JSON. Consultas usam parâmetros. Todas as alterações são uma transação D1 com guarda de revisão: duas abas não sobrescrevem alterações silenciosamente. O cliente calcula para apresentação e o servidor valida novamente antes de gravar.

## Regras

Valores são inteiros em centavos. Saldo é derivado do inicial e das movimentações efetivadas. Previsões não são dinheiro. Transferências próprias não são receita nem despesa. Reservas não movimentam dinheiro e reduzem apenas o livre. Livre = saldo existente − reservas − despesas pendentes e faturas pendentes até o final do horizonte (inclusive atrasadas).

Compras de cartão geram despesas categorizadas e ocupam o limite integral. Parcelas distribuem os centavos sem arredondamento perdido e vencem em faturas mensais. Faturas são agregações das compras menos pagamentos, não cópias de contas a pagar. Quitação de fatura afeta banco e recompõe limite; não entra novamente no relatório de despesas. O relatório de saídas inclui despesas categorizadas, enquanto fluxo futuro representa movimentos de caixa.

Compras na data do fechamento seguem a próxima fatura. Fechamentos e vencimentos em dias inexistentes são ajustados para o último dia do mês. É possível revisar a parcela individual. Compras de fatura paga exigem estornar a quitação antes da edição/exclusão.

Datas usam o calendário de São Paulo. Status atrasado é derivado em tempo de leitura. Projeções carregam o saldo dia a dia por até 90 dias. Pendências atrasadas entram no dia atual; recebimentos atrasados entram no cenário otimista como hipótese, não confirmação. O cenário conservador ignora todos os recebimentos futuros.

Recorrências são materializadas em quantidade explícita (até 120 ocorrências); cada ocorrência pode ser editada. Para prolongar uma série, cadastre novas ocorrências. Não há juros, tarifas ou estornos automáticos importados de bancos.

## Uso inicial

Cadastre contas com saldos iniciais, cartões, reservas, compromissos e recebimentos. Não são carregados exemplos financeiros como se fossem dados reais. A revisão financeira usa apenas seus registros. Limite do cartão jamais entra no saldo bancário ou na projeção.

## Extensões previstas

## Pagamentos parciais e planejamento

Pagamentos parciais usam o lançamento original como saldo restante. O campo `originalAmount` preserva o total original; os abatimentos são saídas efetivadas vinculadas por `debtId`. O servidor exige que restante + abatimentos corresponda ao total, e somente valores realmente pagos movimentam a conta. A última quitação efetiva o restante, sem duplicar os abatimentos. Estornar um abatimento recompõe o saldo restante; a quitação final precisa ser estornada antes de seus pagamentos anteriores. Todos esses campos são persistidos no payload já existente, com a mesma transação e proteção de revisão.

Metas são reservas com `isGoal`, custo total, prazo, prioridade e observações. O dinheiro reservado para metas participa do saldo reservado existente, uma única vez. Aportes não movimentam o banco. Edição, liberação e exclusão usam o mesmo armazenamento protegido de reservas.

O planejamento é um mecanismo explicável de regras e cálculos, não uma conversa com um modelo externo. Para cada conta, desconta reservas, obrigações até o horizonte selecionado e rotina estimada. O histórico da rotina usa despesas variáveis registradas nos últimos 28 dias, limitado à cobertura observada. Recorrências e dívidas identificadas não entram novamente nessa estimativa. Recebimentos pendentes não aumentam a capacidade de aportar. Metas repartem essa capacidade por prioridade e prazo, sem reutilizar a mesma quantia. Curto histórico e falta de caixa aparecem como alertas.

Análises semanais usam quatro janelas de 7 dias. Alimentação e Shopee são identificadas por palavras na categoria, origem e descrição; os registros permanecem acessíveis para conferência. Simulação de economia exige orçamento informado pelo usuário e não pesquisa preços. Antecipação não promete economia ou melhora do saldo final: o app apresenta contas já cobertas e explica o efeito de mudar o momento da saída.

Open Finance e WhatsApp poderão passar por uma camada de ingestão com identificação externa, idempotência e confirmação da classificação, antes de produzir os mesmos registros financeiros. A primeira versão não conecta essas integrações.

## Retirada PJ → PF

`lib/withdrawals.ts` calcula a margem da conta PJ após reservas, obrigações (incluindo faturas derivadas), rotina estimada e déficits nas outras contas PJ. Recebimentos previstos e limite de crédito não financiam retiradas. A necessidade PF cobre atrasados, contas até o último dia selecionado e rotina restante, descontando o saldo existente livre de reservas. O orçamento diário pode ser ajustado na simulação, sem alterar os registros; gastos variáveis já realizados hoje reduzem a necessidade do dia.

A recomendação é o menor valor entre necessidade PF e margem PJ. A confirmação registra uma transferência efetivada hoje apenas após confirmação do usuário de que a fez no banco. Ela utiliza o ledger e a persistência transacional existentes: reduz PJ, aumenta PF, preserva o consolidado e não cria receita/despesa. A sugestão é recalculada com os novos saldos. Transferências também aparecem na lista da conta de destino. O horizonte e as contas são locais à tela, independentes dos filtros gerais.

## Verificação

`node --experimental-strip-types --test tests/finance.test.mjs tests/planning.test.mjs tests/withdrawals.test.mjs` cobre também proteção da PJ, reservas PF, dívidas parciais, orçamento já gasto, cartão, isolamento de receita/despesa e recálculo após retirada.

`node --experimental-strip-types --test tests/finance.test.mjs` testa Pix, previsões, cartão/fatura, parcelas, transferência, reservas, isolamento PF/PJ e datas. `node node_modules/typescript/bin/tsc --noEmit` verifica os tipos. Migrações geradas ficam em drizzle/.
