import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Grid,
  Heading,
  Input,
  Progress,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  PiggyBank,
  Plus,
  WalletCards,
} from "lucide-react";
import type {
  FinanceRecord,
  FinanceTable,
  Profile,
} from "../../types/database";
import {
  calculateFinancialSnapshot,
  type FinanceData,
} from "../../services/financialEngine";
import { calculateStrategicAnalysis } from "../../services/strategicAnalysis";
import { buildFinancialCalendar } from "../../services/calendarService";
import { calculateAccountBalances } from "../../services/accountService";
import { formatCurrencyBRL, formatPercent } from "../../utils/formatters";
import { formatDateBR } from "../../utils/date";

const palette = [
  "#0F62FE",
  "#6C3BFF",
  "#35c894",
  "#f7b84b",
  "#f56565",
  "#38b2ac",
];
const panel = {
  bg: "panel",
  border: "1px solid",
  borderColor: "line",
  borderRadius: "2xl",
  boxShadow: "card",
} as const;
const ChartBox = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <Box {...panel} p="20px" minH="320px">
    <Heading size="sm">{title}</Heading>
    <Text color="muted" fontSize="sm">
      {subtitle}
    </Text>
    <Box h="245px" mt="4">
      {children}
    </Box>
  </Box>
);

export default function Dashboard({
  data,
  profile,
  onNavigate,
}: {
  data: Record<FinanceTable, FinanceRecord[]>;
  profile?: Profile | null;
  onNavigate: (
    page:
      | "receitas"
      | "despesas"
      | "cartoes"
      | "metas"
      | "saude"
      | "alertas"
      | "notificacoes"
      | "patrimonio"
      | "contas"
      | "perfil",
  ) => void;
}) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const reference = new Date(`${month}-15T12:00:00`);
  const snapshot = calculateFinancialSnapshot(
    data as FinanceData,
    reference,
    profile,
  );
  const previousReference = new Date(
    reference.getFullYear(),
    reference.getMonth() - 1,
    15,
  );
  const previous = calculateFinancialSnapshot(
    data as FinanceData,
    previousReference,
    profile,
  );
  const strategic = calculateStrategicAnalysis(data, profile, reference);
  const accounts = calculateAccountBalances(data as FinanceData);
  const accountTotal = accounts.reduce((total, account) => total + account.saldo, 0);
  const events = buildFinancialCalendar(data as FinanceData, month, profile)
    .filter((event) => (event.data ?? "") >= new Date().toISOString().slice(0, 10))
    .slice(0, 7);
  const diff = (current: number, old: number) =>
    old ? ((current - old) / Math.abs(old)) * 100 : current ? 100 : 0;
  const monthLabel = reference.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const firstName = profile?.nome?.split(" ")[0] || "tudo bem";
  const onboardingSteps = [
    { label: "Dados pessoais", done: Boolean(profile?.nome) },
    {
      label: "Salário recorrente",
      done: Boolean(profile?.salario_previsto || profile?.monthly_salary),
    },
    { label: "Cartões cadastrados", done: data.cartoes.length > 0 },
    { label: "Metas financeiras", done: data.metas_financeiras.length > 0 },
  ];
  const showOnboarding = onboardingSteps.some((step) => !step.done);
  const primaryCards = [
    [
      "Saldo disponível",
      snapshot.realBalance,
      previous.realBalance,
      <WalletCards />,
      "Movimentações confirmadas até agora",
      "brand.300",
    ],
    [
      "Receita prevista",
      snapshot.predictedRevenue,
      previous.predictedRevenue,
      <ArrowUpRight />,
      "Recebidas + entradas pendentes",
      "green.300",
    ],
    [
      "Receita recebida",
      snapshot.received,
      previous.received,
      <ArrowUpRight />,
      "Entradas efetivadas no mês",
      "green.300",
    ],
    [
      "Dinheiro comprometido",
      snapshot.committedMoney,
      previous.committedMoney,
      <CreditCard />,
      "Pendências, faturas e planos",
      "orange.300",
    ],
    [
      "Dinheiro livre",
      snapshot.freePredicted,
      previous.freePredicted,
      <PiggyBank />,
      "Sobra prevista após compromissos",
      snapshot.freePredicted >= 0 ? "green.300" : "red.300",
    ],
    [
      "Patrimônio total",
      snapshot.patrimony,
      previous.patrimony,
      <PiggyBank />,
      "Saldo + metas + investimentos",
      "purple.300",
    ],
  ];
  const currentInvoice =
    snapshot.openInvoiceTotal || snapshot.openInvoiceValue + snapshot.closedInvoiceValue;
  const nextInvoice = data.faturas_cartao
    .filter((invoice) => invoice.status !== "paga")
    .sort((a, b) =>
      (a.data_vencimento ?? "").localeCompare(b.data_vencimento ?? ""),
    )[0];
  return (
    <>
      <Flex
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap="4"
        mb="7"
      >
        <Box>
          <Text color="muted" fontSize="sm" fontWeight="700">
            DASHBOARD FINANCEIRA
          </Text>
          <Heading size="lg">Olá, {firstName} 👋</Heading>
          <Text color="muted" mt="1">
            Aqui está o resumo financeiro de{" "}
            <Text as="span" textTransform="capitalize">
              {monthLabel}
            </Text>
            .
          </Text>
        </Box>
        <Flex gap="2" wrap="wrap" align="center">
          <Input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            maxW="180px"
            bg="panel"
            borderColor="line"
          />
          <Button size="sm" variant="outline" onClick={() => onNavigate("receitas")}>
            Nova receita
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("despesas")}>
            Nova despesa
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate("cartoes")}>
            Nova compra
          </Button>
          <Button size="sm" leftIcon={<Plus size={16} />} onClick={() => onNavigate("metas")}>
            Novo aporte
          </Button>
        </Flex>
      </Flex>
      {showOnboarding && (
        <Box
          {...panel}
          p="20px"
          mb="4"
          bg="linear-gradient(135deg,rgba(53,200,148,.14),rgba(15,98,254,.10))"
        >
          <Flex
            justify="space-between"
            align={{ base: "flex-start", md: "center" }}
            direction={{ base: "column", md: "row" }}
            gap="4"
          >
            <Box>
              <Badge colorScheme="green">Primeiros passos</Badge>
              <Heading size="sm" mt="2">
                Configure a base real do NovaWave Finance
              </Heading>
              <Text color="muted" fontSize="sm" mt="1">
                Quanto mais completa essa base, melhores ficam calendário, métricas e alertas.
              </Text>
              <Flex gap="2" wrap="wrap" mt="3">
                {onboardingSteps.map((step) => (
                  <Badge key={step.label} colorScheme={step.done ? "green" : "gray"}>
                    {step.done ? "✓" : "•"} {step.label}
                  </Badge>
                ))}
              </Flex>
            </Box>
            <Button variant="outline" onClick={() => onNavigate("perfil")}>
              Completar perfil
            </Button>
          </Flex>
        </Box>
      )}
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="14px">
        {primaryCards.map(([label, value, previousValue, icon, help, tone]) => {
          const variation = diff(Number(value), Number(previousValue));
          return (
            <Box
              key={String(label)}
              {...panel}
              p="22px"
              position="relative"
              overflow="hidden"
              _before={{
                content: '""',
                position: "absolute",
                inset: 0,
                bg: "linear-gradient(135deg,rgba(15,98,254,.12),transparent 48%)",
                pointerEvents: "none",
              }}
            >
              <Flex justify="space-between" color={String(tone)} position="relative">
              <Text color="muted" fontSize="sm">
                {label}
              </Text>
              {icon}
            </Flex>
            <Heading size="lg" mt="3" position="relative">
              {formatCurrencyBRL(Number(value))}
            </Heading>
            <Flex mt="3" gap="2" align="center" position="relative">
              <Badge colorScheme={variation >= 0 ? "green" : "red"}>
                {variation >= 0 ? "+" : ""}
                {variation.toFixed(1)}%
              </Badge>
              <Text color="muted" fontSize="xs">
                vs. mês anterior
              </Text>
            </Flex>
            <Text color="muted" fontSize="xs" mt="2" position="relative">
              {help}
            </Text>
          </Box>
          );
        })}
      </SimpleGrid>
      {accounts.length > 0 && (
        <Box {...panel} p="20px" mt="4">
          <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap="3">
            <Box>
              <Heading size="sm">Saldo por conta</Heading>
              <Text color="muted" fontSize="sm">
                Total consolidado: {formatCurrencyBRL(accountTotal)}
              </Text>
            </Box>
            <Button size="sm" variant="outline" onClick={() => onNavigate("contas")}>
              Ver contas
            </Button>
          </Flex>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing="3" mt="4">
            {accounts.slice(0, 3).map((account) => (
              <Box key={account.id} bg="panel2" p="4" borderRadius="xl" borderLeft="4px solid" borderColor={account.cor ?? "brand.400"}>
                <Text color="muted" fontSize="xs">{account.tipo}</Text>
                <Text fontWeight="800">{account.nome}</Text>
                <Heading size="sm" mt="2">{formatCurrencyBRL(account.saldo)}</Heading>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}
      <Grid templateColumns={{ base: "1fr", xl: "1.15fr .85fr" }} gap="16px" mt="4">
        <Box
          {...panel}
          p="24px"
          bg="linear-gradient(135deg,rgba(15,98,254,.22),rgba(108,59,255,.12))"
        >
          <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap="4">
            <Box>
              <Text color="muted" fontSize="sm" fontWeight="700">
                SAÚDE FINANCEIRA
              </Text>
              <Heading mt="2" size="lg">
                {strategic.health.score}/100 · {strategic.health.scoreLabel}
              </Heading>
              <Text color="muted" mt="2">
                {strategic.insights.at(-1)}
              </Text>
            </Box>
            <Button variant="outline" onClick={() => onNavigate("saude")}>
              Ver diagnóstico
            </Button>
          </Flex>
          <Progress value={strategic.health.score} mt="5" h="10px" borderRadius="full" />
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing="3" mt="5">
            <Box bg="panel2" p="4" borderRadius="xl">
              <Text color="muted" fontSize="xs">
                Salário comprometido
              </Text>
              <Heading size="sm" mt="1">
                {formatPercent(snapshot.incomeCommitment)}
              </Heading>
            </Box>
            <Box bg="panel2" p="4" borderRadius="xl">
              <Text color="muted" fontSize="xs">
                Percentual economizado
              </Text>
              <Heading size="sm" mt="1">
                {formatPercent(snapshot.savingsRate)}
              </Heading>
            </Box>
            <Box bg="panel2" p="4" borderRadius="xl">
              <Text color="muted" fontSize="xs">
                Uso do cartão
              </Text>
              <Heading size="sm" mt="1">
                {formatPercent(snapshot.cardSalaryPercent)}
              </Heading>
            </Box>
          </SimpleGrid>
        </Box>
        <Box {...panel} p="24px">
          <Heading size="sm">Próximos eventos</Heading>
          <Text color="muted" fontSize="sm">
            Calendário financeiro dos próximos dias
          </Text>
          <Stack mt="4" spacing="3">
            {events.map((event) => (
              <Flex key={event.id} justify="space-between" gap="3" bg="panel2" p="3" borderRadius="xl">
                <Box>
                  <Text fontSize="sm" fontWeight="700">
                    {event.titulo}
                  </Text>
                  <Text color="muted" fontSize="xs">
                    {formatDateBR(event.data)} · {event.tipo}
                  </Text>
                </Box>
                <Text fontSize="sm" fontWeight="800">
                  {formatCurrencyBRL(event.valor)}
                </Text>
              </Flex>
            ))}
            {!events.length && (
              <Center py="8" color="muted" flexDir="column">
                <CalendarDays />
                <Text mt="2">Nenhum evento futuro neste mês.</Text>
              </Center>
            )}
          </Stack>
        </Box>
      </Grid>
      <Grid
        templateColumns={{ base: "1fr", xl: "1.5fr 1fr" }}
        gap="16px"
        mt="4"
      >
        <ChartBox
          title="Receitas x saídas"
          subtitle="Despesas e faturas pagas nos últimos seis meses"
        >
          <ResponsiveContainer>
            <BarChart data={snapshot.timeline}>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#252b36"
                vertical={false}
              />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => formatCurrencyBRL(Number(v))} />
              <Legend />
              <Bar dataKey="receitas" fill="#0F62FE" radius={[5, 5, 0, 0]} />
              <Bar dataKey="despesas" fill="#6C3BFF" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox
          title="Gastos por categoria"
          subtitle="Somente despesas pagas neste mês"
        >
          {snapshot.categories.length ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={snapshot.categories}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {snapshot.categories.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={palette[index % palette.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrencyBRL(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Center h="full" color="muted">
              Sem despesas pagas no período.
            </Center>
          )}
        </ChartBox>
      </Grid>
      <Grid
        templateColumns={{ base: "1fr", xl: "1.5fr 1fr" }}
        gap="16px"
        mt="4"
      >
        <ChartBox
          title="Evolução patrimonial"
          subtitle="Saldo disponível comparado ao patrimônio"
        >
          <ResponsiveContainer>
            <AreaChart data={snapshot.timeline}>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#252b36"
                vertical={false}
              />
              <XAxis dataKey="label" />
              <YAxis hide />
              <Tooltip formatter={(v) => formatCurrencyBRL(Number(v))} />
              <Legend />
              <Area
                type="monotone"
                dataKey="patrimonio"
                stroke="#6C3BFF"
                fill="#6C3BFF"
                fillOpacity=".12"
                strokeWidth={3}
              />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="#0F62FE"
                fill="#0F62FE"
                fillOpacity=".1"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>
        <Box {...panel} p="20px">
          <Flex justify="space-between">
            <Box>
              <Heading size="sm">Metas financeiras</Heading>
              <Text color="muted" fontSize="sm">
                Progresso consolidado
              </Text>
            </Box>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onNavigate("metas")}
            >
              Ver todas
            </Button>
          </Flex>
          <Stack mt="5" spacing="5">
            {data.metas_financeiras.slice(0, 4).map((meta) => {
              const progress =
                ((meta.valor_atual ?? 0) / (meta.valor_alvo || 1)) * 100;
              return (
                <Box key={meta.id}>
                  <Flex justify="space-between">
                    <Text fontSize="sm" fontWeight="600">
                      {meta.nome}
                    </Text>
                    <Text fontSize="xs">{progress.toFixed(0)}%</Text>
                  </Flex>
                  <Progress value={progress} mt="2" borderRadius="full" />
                  <Text fontSize="xs" color="muted" mt="1">
                    {formatCurrencyBRL(meta.valor_atual)} de{" "}
                    {formatCurrencyBRL(meta.valor_alvo)}
                  </Text>
                </Box>
              );
            })}
            {!data.metas_financeiras.length && (
              <Center h="180px" color="muted">
                Nenhuma meta cadastrada.
              </Center>
            )}
          </Stack>
        </Box>
      </Grid>
      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing="4" mt="4">
        <Box {...panel} p="20px">
          <Flex justify="space-between" align="flex-start">
            <Box>
              <Heading size="sm">Faturas do mês</Heading>
              <Text color="muted" fontSize="sm">
                Cartão só afeta saldo quando a fatura é paga.
              </Text>
            </Box>
            <CreditCard color="#9f7aea" />
          </Flex>
          <Heading size="lg" mt="5">
            {formatCurrencyBRL(currentInvoice)}
          </Heading>
          <Progress
            value={snapshot.cardSalaryPercent}
            colorScheme={snapshot.cardSalaryPercent > 40 ? "red" : "purple"}
            mt="4"
            borderRadius="full"
          />
          <Flex mt="3" justify="space-between" color="muted" fontSize="sm">
            <Text>{formatPercent(snapshot.cardSalaryPercent)} do salário</Text>
            <Badge colorScheme={nextInvoice ? "orange" : "green"}>
              {nextInvoice ? nextInvoice.status ?? "aberta" : "sem fatura"}
            </Badge>
          </Flex>
          <Text mt="4" color="muted" fontSize="sm">
            Próximo vencimento:{" "}
            {nextInvoice ? formatDateBR(nextInvoice.data_vencimento) : "nenhum"}
          </Text>
        </Box>
        <Box {...panel} p="20px">
          <Heading size="sm">Investimentos</Heading>
          <Text color="muted" fontSize="sm">
            Aportes e patrimônio investido.
          </Text>
          <Heading size="lg" mt="5">
            {formatCurrencyBRL(snapshot.investedTotal)}
          </Heading>
          <SimpleGrid columns={2} spacing="3" mt="4">
            <Box bg="panel2" p="3" borderRadius="xl">
              <Text color="muted" fontSize="xs">
                Aplicado no mês
              </Text>
              <Text fontWeight="800">
                {formatCurrencyBRL(snapshot.appliedInvestments)}
              </Text>
            </Box>
            <Box bg="panel2" p="3" borderRadius="xl">
              <Text color="muted" fontSize="xs">
                Planejado
              </Text>
              <Text fontWeight="800">
                {formatCurrencyBRL(snapshot.plannedInvestments)}
              </Text>
            </Box>
          </SimpleGrid>
        </Box>
        <Box {...panel} p="20px">
          <Heading size="sm">Resumo de compromissos</Heading>
          <Text color="muted" fontSize="sm">
            Despesas, recorrências, metas e investimentos previstos.
          </Text>
          <Stack mt="4">
            {[
              ["Despesas pendentes", snapshot.pendingExpenses],
              ["Faturas abertas", snapshot.openInvoiceTotal],
              ["Recorrências", snapshot.recurringCommitment],
              ["Aportes planejados", snapshot.plannedContributions],
            ].map(([label, value]) => (
              <Flex key={String(label)} justify="space-between" bg="panel2" p="3" borderRadius="xl">
                <Text fontSize="sm">{label}</Text>
                <Text fontWeight="800">{formatCurrencyBRL(Number(value))}</Text>
              </Flex>
            ))}
          </Stack>
        </Box>
      </SimpleGrid>
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="4" mt="4">
        <Box {...panel} p="20px">
          <Flex justify="space-between" mb="4">
            <Box>
              <Heading size="sm">Alertas inteligentes</Heading>
              <Text color="muted" fontSize="sm">
                O que pede sua atenção agora
              </Text>
            </Box>
            <AlertTriangle color="#f7b84b" />
          </Flex>
          <Stack>
            {strategic.alerts.slice(0, 6).map((alert) => (
              <Flex
                key={alert.id}
                bg="panel2"
                p="3"
                borderRadius="xl"
                gap="3"
              >
                <AlertTriangle
                  size={17}
                  color={alert.severity === "alta" ? "#f56565" : "#f7b84b"}
                />
                <Box>
                  <Text fontSize="sm" fontWeight="700">
                    {alert.title}
                  </Text>
                  <Text fontSize="xs" color="muted">
                    {alert.action}
                  </Text>
                </Box>
              </Flex>
            ))}
            {!strategic.alerts.length && (
              <Text color="muted" fontSize="sm">
                Tudo tranquilo por aqui.
              </Text>
            )}
            <Button size="sm" variant="outline" onClick={() => onNavigate("alertas")}>
              Abrir central de alertas
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onNavigate("notificacoes")}>
              Ver notificações
            </Button>
          </Stack>
        </Box>
        <Box {...panel} p="20px">
          <Heading size="sm">Comprometimento da renda</Heading>
          <Text color="muted" fontSize="sm">
            Despesas e faturas previstas sobre a receita prevista
          </Text>
          <Heading mt="5" size="xl">
            {formatPercent(snapshot.incomeCommitment)}
          </Heading>
          <Progress
            value={snapshot.incomeCommitment}
            colorScheme={
              snapshot.incomeCommitment > 80
                ? "red"
                : snapshot.incomeCommitment > 60
                  ? "orange"
                  : "blue"
            }
            mt="4"
            h="10px"
            borderRadius="full"
          />
          <Flex justify="space-between" mt="3">
            <Badge colorScheme="orange">
              {formatCurrencyBRL(snapshot.pendingExpenses)} pendente
            </Badge>
            <Badge colorScheme="purple">
              {formatCurrencyBRL(snapshot.openInvoiceTotal)} em faturas
            </Badge>
          </Flex>
        </Box>
      </Grid>
      <Box {...panel} p="20px" mt="4">
        <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap="3">
          <Box>
            <Heading size="sm">Assistente financeiro</Heading>
            <Text color="muted" fontSize="sm">
              Leituras automáticas do mês.
            </Text>
          </Box>
          <Button size="sm" variant="outline" onClick={() => onNavigate("patrimonio")}>
            Ver patrimônio
          </Button>
        </Flex>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="3" mt="4">
          {strategic.insights.slice(0, 3).map((insight) => (
            <Box key={insight} bg="panel2" p="4" borderRadius="xl">
              <Text fontSize="sm">{insight}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    </>
  );
}
