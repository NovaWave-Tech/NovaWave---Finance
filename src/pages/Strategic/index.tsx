import { useMemo, useState, type FormEvent } from "react";
import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Bell,
  Brain,
  CalendarClock,
  Download,
  Landmark,
  PiggyBank,
  Plus,
  Repeat2,
  ShieldCheck,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import type { FinanceRecord, FinanceTable, Profile } from "../../types/database";
import { formatCurrencyBRL, formatPercent } from "../../utils/formatters";
import { formatDateBR, todayISO } from "../../utils/date";
import { CurrencyInput } from "../../components/forms/CurrencyInput";
import { DateInputBR } from "../../components/forms/DateInputBR";
import { calculateStrategicAnalysis } from "../../services/strategicAnalysis";
import { calculateAccountBalances } from "../../services/accountService";
import { buildAuditChecks, buildAuditNotifications } from "../../services/auditService";

type StrategicPage =
  | "saude"
  | "projecoes"
  | "alertas"
  | "notificacoes"
  | "comparativo"
  | "reserva"
  | "planejamento"
  | "assinaturas"
  | "transferencias"
  | "assistente"
  | "patrimonio"
  | "movimentacoes"
  | "timeline"
  | "importacao"
  | "fechamento"
  | "orcamentos"
  | "exportacao"
  | "contas"
  | "evolucao";

type Props = {
  page: StrategicPage;
  data: Record<FinanceTable, FinanceRecord[]>;
  profile?: Profile | null;
  save: (table: FinanceTable, item: FinanceRecord) => Promise<void>;
};

const panel = {
  bg: "panel",
  border: "1px solid",
  borderColor: "line",
  borderRadius: "2xl",
  boxShadow: "card",
} as const;

function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <Flex
      justify="space-between"
      align={{ base: "flex-start", md: "center" }}
      direction={{ base: "column", md: "row" }}
      gap="4"
      mb="6"
    >
      <Box>
        <Heading size="lg">{title}</Heading>
        <Text color="muted" mt="1">
          {subtitle}
        </Text>
      </Box>
      {action}
    </Flex>
  );
}

function Metric({
  label,
  value,
  help,
  icon,
  tone = "brand.300",
}: {
  label: string;
  value: string;
  help?: string;
  icon?: React.ReactNode;
  tone?: string;
}) {
  return (
    <Box {...panel} p="5" transition=".2s ease" _hover={{ transform: "translateY(-2px)" }}>
      <Flex justify="space-between" color={tone}>
        <Text color="muted" fontSize="sm">
          {label}
        </Text>
        {icon}
      </Flex>
      <Heading size="md" mt="3">
        {value}
      </Heading>
      {help && (
        <Text color="muted" fontSize="xs" mt="1">
          {help}
        </Text>
      )}
    </Box>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box {...panel} p="5" minH="320px">
      <Heading size="sm">{title}</Heading>
      <Box h="250px" mt="4">
        {children}
      </Box>
    </Box>
  );
}

function HealthPage({ analysis }: { analysis: ReturnType<typeof calculateStrategicAnalysis> }) {
  const { health, snapshot } = analysis;
  const scoreColor =
    health.score < 40
      ? "red"
      : health.score < 60
        ? "orange"
        : health.score < 80
          ? "blue"
          : "green";
  return (
    <>
      <PageHeader
        title="Saúde Financeira"
        subtitle="Seu diagnóstico financeiro automático, calculado com os dados reais do sistema."
      />
      <Grid templateColumns={{ base: "1fr", xl: "360px 1fr" }} gap="4">
        <Box {...panel} p="6">
          <Flex align="center" justify="space-between">
            <Box>
              <Text color="muted">Score Financeiro NovaWave</Text>
              <Heading size="2xl" mt="2">
                {health.score}
              </Heading>
            </Box>
            <ShieldCheck size={56} />
          </Flex>
          <Badge mt="4" colorScheme={scoreColor} fontSize="md" px="3" py="1">
            {health.scoreLabel}
          </Badge>
          <Progress
            value={health.score}
            colorScheme={scoreColor}
            mt="5"
            borderRadius="full"
            h="10px"
          />
          <Text color="muted" fontSize="sm" mt="4">
            Considera investimento, economia, cartão, renda comprometida, reserva e evolução patrimonial.
          </Text>
        </Box>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing="3">
          <Metric label="Salário mensal" value={formatCurrencyBRL(health.salary)} icon={<WalletCards />} />
          <Metric label="Receitas extras" value={formatCurrencyBRL(health.extraIncome)} icon={<Plus />} tone="green.300" />
          <Metric label="Gastos fixos" value={formatCurrencyBRL(health.fixedExpenses)} icon={<Repeat2 />} tone="orange.300" />
          <Metric label="Gastos variáveis" value={formatCurrencyBRL(health.variableExpenses)} icon={<TrendingUp />} tone="red.300" />
          <Metric label="Uso de cartão" value={formatCurrencyBRL(health.cardUse)} help={formatPercent(snapshot.cardSalaryPercent)} icon={<WalletCards />} tone="purple.300" />
          <Metric label="Investido" value={formatCurrencyBRL(health.investedTotal)} icon={<Landmark />} />
          <Metric label="Guardado em metas" value={formatCurrencyBRL(health.goalsTotal)} icon={<Target />} />
          <Metric label="Patrimônio" value={formatCurrencyBRL(health.patrimony)} icon={<PiggyBank />} tone="green.300" />
        </SimpleGrid>
      </Grid>
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="4" mt="4">
        <Box {...panel} p="5">
          <Heading size="sm">Pontos positivos</Heading>
          <Stack mt="4">
            {health.positives.map((item) => (
              <Text key={item} color="green.300">
                • {item}
              </Text>
            ))}
          </Stack>
        </Box>
        <Box {...panel} p="5">
          <Heading size="sm">Pontos de atenção</Heading>
          <Stack mt="4">
            {(health.attentions.length ? health.attentions : ["Continue acompanhando cartão, reserva e recorrências."]).map((item) => (
              <Text key={item} color="orange.300">
                • {item}
              </Text>
            ))}
          </Stack>
        </Box>
      </Grid>
    </>
  );
}

function ProjectionsPage({ analysis }: { analysis: ReturnType<typeof calculateStrategicAnalysis> }) {
  const rows = analysis.projections.base.map((base, index) => ({
    label: `${base.months} meses`,
    saldo: base.saldo,
    patrimonio: base.patrimonio,
    economizar: analysis.projections.saveMore[index].patrimonio,
    reduzir: analysis.projections.reduceExpenses[index].patrimonio,
    investir: analysis.projections.increaseInvestments[index].patrimonio,
  }));
  return (
    <>
      <PageHeader title="Projeções" subtitle="Cenários futuros usando salário, recorrências, metas e investimentos." />
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing="3">
        {analysis.projections.base.map((item) => (
          <Metric
            key={item.months}
            label={`Saldo em ${item.months} meses`}
            value={formatCurrencyBRL(item.saldo)}
            help={`Patrimônio: ${formatCurrencyBRL(item.patrimonio)}`}
            icon={<TrendingUp />}
          />
        ))}
      </SimpleGrid>
      <ChartCard title="Simulações de patrimônio">
        <ResponsiveContainer>
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="4 4" stroke="#252b36" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(v) => `${Number(v) / 1000}k`} />
            <Tooltip formatter={(v) => formatCurrencyBRL(Number(v))} />
            <Legend />
            <Line dataKey="patrimonio" name="Base" stroke="#0F62FE" strokeWidth={3} />
            <Line dataKey="economizar" name="Economizar mais" stroke="#35c894" strokeWidth={2} />
            <Line dataKey="reduzir" name="Reduzir gastos" stroke="#f7b84b" strokeWidth={2} />
            <Line dataKey="investir" name="Aumentar investimentos" stroke="#6C3BFF" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}

function AlertsPage({ analysis }: { analysis: ReturnType<typeof calculateStrategicAnalysis> }) {
  const [read, setRead] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem("novawave-read-alerts") ?? "[]"),
  );
  const markRead = (id: string) => {
    const next = [...new Set([...read, id])];
    setRead(next);
    localStorage.setItem("novawave-read-alerts", JSON.stringify(next));
  };
  return (
    <>
      <PageHeader title="Central de Alertas" subtitle="Faturas, despesas, metas e orçamentos que pedem decisão." />
      <Stack spacing="3">
        {analysis.alerts.map((alert) => (
          <Box key={alert.id} {...panel} p="4" opacity={read.includes(alert.id) ? 0.58 : 1}>
            <Flex justify="space-between" gap="4" direction={{ base: "column", md: "row" }}>
              <Flex gap="3">
                <AlertTriangle color={alert.severity === "alta" ? "#f56565" : "#f7b84b"} />
                <Box>
                  <Badge colorScheme={alert.severity === "alta" ? "red" : "orange"}>
                    {alert.severity} · {alert.category}
                  </Badge>
                  <Heading size="sm" mt="2">
                    {alert.title}
                  </Heading>
                  <Text color="muted" fontSize="sm">
                    {formatDateBR(alert.date)} · {alert.action}
                  </Text>
                </Box>
              </Flex>
              <Button size="sm" variant="outline" onClick={() => markRead(alert.id)}>
                Marcar como lido
              </Button>
            </Flex>
          </Box>
        ))}
        {!analysis.alerts.length && (
          <Center {...panel} minH="240px" color="muted">
            Nenhum alerta crítico agora.
          </Center>
        )}
      </Stack>
    </>
  );
}

function NotificationsPage({ data }: { data: Props["data"] }) {
  const notifications = buildAuditNotifications(data);
  const checks = buildAuditChecks(data);
  const [filter, setFilter] = useState("");
  const [read, setRead] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem("novawave-read-notifications") ?? "[]"),
  );
  const visible = notifications.filter(
    (item) => !filter || item.category === filter || item.severity === filter,
  );
  const persistRead = (ids: string[]) => {
    const next = [...new Set(ids)];
    setRead(next);
    localStorage.setItem("novawave-read-notifications", JSON.stringify(next));
  };
  return (
    <>
      <PageHeader title="Central de Notificações" subtitle="Avisos automáticos sobre vencimentos, metas, orçamentos, investimentos e consistência dos dados." />
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing="3" mb="4">
        <Metric label="Notificações" value={String(notifications.length)} icon={<Bell />} />
        <Metric label="Não lidas" value={String(notifications.filter((item) => !read.includes(item.id)).length)} icon={<AlertTriangle />} tone="orange.300" />
        <Metric label="Auditoria OK" value={`${checks.filter((item) => item.ok).length}/${checks.length}`} icon={<ShieldCheck />} />
        <Metric label="Críticas" value={String(notifications.filter((item) => item.severity === "alta").length)} icon={<AlertTriangle />} tone="red.300" />
      </SimpleGrid>
      <Box {...panel} p="4" mb="4">
        <Flex gap="3" wrap="wrap" align="center">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} maxW={{ md: "260px" }}>
            <option value="">Todas</option>
            <option value="alta">Alta prioridade</option>
            <option value="media">Média prioridade</option>
            <option value="info">Informativas</option>
            {[...new Set(notifications.map((item) => item.category))].map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Button variant="outline" onClick={() => persistRead(notifications.map((item) => item.id))}>Marcar todas como lidas</Button>
          <Button variant="ghost" onClick={() => persistRead([])}>Limpar leituras</Button>
        </Flex>
      </Box>
      <Grid templateColumns={{ base: "1fr", xl: "1.4fr .8fr" }} gap="4">
        <Stack spacing="3">
          {visible.map((item) => (
            <Box key={item.id} {...panel} p="4" opacity={read.includes(item.id) ? 0.56 : 1}>
              <Flex justify="space-between" gap="4" direction={{ base: "column", md: "row" }}>
                <Box>
                  <Badge colorScheme={item.severity === "alta" ? "red" : item.severity === "media" ? "orange" : "blue"}>
                    {item.category} · {item.severity}
                  </Badge>
                  <Heading size="sm" mt="2">{item.title}</Heading>
                  <Text color="muted" fontSize="sm">{formatDateBR(item.date)} · {item.description}</Text>
                </Box>
                <Button size="sm" variant="outline" onClick={() => persistRead([...read, item.id])}>Marcar como lida</Button>
              </Flex>
            </Box>
          ))}
          {!visible.length && <Center {...panel} minH="220px" color="muted">Nenhuma notificação nesse filtro.</Center>}
        </Stack>
        <Box {...panel} p="5">
          <Heading size="sm">Auditoria de consistência</Heading>
          <Stack mt="4" spacing="3">
            {checks.map((check) => (
              <Flex key={check.label} gap="3" align="flex-start">
                <Badge colorScheme={check.ok ? "green" : "red"}>{check.ok ? "OK" : "AÇÃO"}</Badge>
                <Box>
                  <Text fontWeight="800">{check.label}</Text>
                  <Text color="muted" fontSize="sm">{check.detail}</Text>
                </Box>
              </Flex>
            ))}
          </Stack>
        </Box>
      </Grid>
    </>
  );
}

function ComparisonPage({ analysis }: { analysis: ReturnType<typeof calculateStrategicAnalysis> }) {
  return (
    <>
      <PageHeader title="Comparação Mensal" subtitle="Mês atual x anterior e ano atual x ano anterior." />
      <ChartCard title="Comparativo por indicador">
        <ResponsiveContainer>
          <BarChart data={analysis.comparison}>
            <CartesianGrid strokeDasharray="4 4" stroke="#252b36" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(v) => `${Number(v) / 1000}k`} />
            <Tooltip formatter={(v) => formatCurrencyBRL(Number(v))} />
            <Legend />
            <Bar dataKey="current" name="Mês atual" fill="#0F62FE" radius={[6, 6, 0, 0]} />
            <Bar dataKey="previous" name="Mês anterior" fill="#6C3BFF" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="3" mt="4">
        {analysis.comparison.map((item) => (
          <Metric
            key={item.label}
            label={item.label}
            value={formatCurrencyBRL(item.current)}
            help={`${item.trend}: ${item.monthPercent.toFixed(1)}% no mês · ${item.yearPercent.toFixed(1)}% no ano`}
            icon={<TrendingUp />}
            tone={item.trend === "crescimento" ? "green.300" : "orange.300"}
          />
        ))}
      </SimpleGrid>
    </>
  );
}

function EmergencyPage({ analysis }: { analysis: ReturnType<typeof calculateStrategicAnalysis> }) {
  const { emergency } = analysis;
  return (
    <>
      <PageHeader title="Reserva de Emergência" subtitle="Cobertura calculada pelos seus gastos médios mensais." />
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing="3">
        <Metric label="Gasto médio mensal" value={formatCurrencyBRL(emergency.averageMonthlyExpenses)} icon={<WalletCards />} />
        <Metric label="Valor reservado" value={formatCurrencyBRL(emergency.reserved)} icon={<PiggyBank />} />
        <Metric label="Cobertura" value={`${emergency.coverage.toFixed(1)} meses`} icon={<ShieldCheck />} />
        <Metric label="Classificação" value={emergency.label} icon={<Bell />} />
      </SimpleGrid>
      <Box {...panel} p="5" mt="4">
        <Heading size="sm">Recomendação automática</Heading>
        <Text color="muted" mt="3">
          {emergency.coverage < 6
            ? `Busque acumular pelo menos ${formatCurrencyBRL(emergency.averageMonthlyExpenses * 6)} para cobrir 6 meses de gastos.`
            : "Sua reserva cobre pelo menos 6 meses. Mantenha liquidez e revise os gastos médios mensalmente."}
        </Text>
      </Box>
    </>
  );
}

function MonthlyPlanPage({ analysis }: { analysis: ReturnType<typeof calculateStrategicAnalysis> }) {
  const plan = analysis.monthlyPlan;
  const scenarios = [
    {
      name: "Conservador",
      value: plan.freePredicted - plan.committedMoney * 0.1,
      description: "Reserva uma margem de 10% sobre o dinheiro já comprometido.",
      tone: "orange.300",
    },
    {
      name: "Atual",
      value: plan.freePredicted,
      description: "Mantém o mês exatamente como está planejado agora.",
      tone: plan.freePredicted >= 0 ? "green.300" : "red.300",
    },
    {
      name: "Melhor caso",
      value: plan.freePredicted + plan.predictedRevenue * 0.05,
      description: "Simula uma folga de 5% sobre a receita prevista.",
      tone: "blue.300",
    },
  ];
  return (
    <>
      <PageHeader title="Planejamento Mensal" subtitle="Visão de início e acompanhamento do mês em tempo real." />
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing="3">
        <Metric label="Receita prevista" value={formatCurrencyBRL(plan.predictedRevenue)} />
        <Metric label="Receita recebida" value={formatCurrencyBRL(plan.received)} />
        <Metric label="Gastos previstos" value={formatCurrencyBRL(plan.predictedExpenses)} />
        <Metric label="Gastos realizados" value={formatCurrencyBRL(plan.realizedExpenses)} />
        <Metric label="Investimentos previstos" value={formatCurrencyBRL(plan.plannedInvestments)} />
        <Metric label="Investimentos realizados" value={formatCurrencyBRL(plan.realizedInvestments)} />
        <Metric label="Aportes previstos" value={formatCurrencyBRL(plan.plannedContributions)} />
        <Metric label="Aportes realizados" value={formatCurrencyBRL(plan.realizedContributions)} />
        <Metric label="Livre previsto" value={formatCurrencyBRL(plan.freePredicted)} tone="green.300" />
        <Metric label="Livre atual" value={formatCurrencyBRL(plan.freeReal)} tone="green.300" />
        <Metric label="Comprometido" value={formatCurrencyBRL(plan.committedMoney)} tone="orange.300" />
      </SimpleGrid>
      <Box {...panel} p="5" mt="4">
        <Heading size="sm">Cenários do mês</Heading>
        <Text color="muted" fontSize="sm" mt="1">
          Simulações rápidas para decidir se o mês aguenta novos gastos ou aportes.
        </Text>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing="3" mt="4">
          {scenarios.map((scenario) => (
            <Box key={scenario.name} bg="panel2" borderRadius="xl" p="4">
              <Text color="muted" fontSize="xs" fontWeight="700">
                {scenario.name.toUpperCase()}
              </Text>
              <Heading size="md" mt="2" color={scenario.tone}>
                {formatCurrencyBRL(scenario.value)}
              </Heading>
              <Text color="muted" fontSize="sm" mt="2">
                {scenario.description}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    </>
  );
}

function SubscriptionsPage({
  analysis,
  data,
  save,
}: {
  analysis: ReturnType<typeof calculateStrategicAnalysis>;
  data: Props["data"];
  save: Props["save"];
}) {
  const modal = useDisclosure();
  const toast = useToast();
  const [form, setForm] = useState({
    descricao: "",
    valor: "",
    dia_vencimento: "1",
    categoria: "",
    status: "ativa",
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save("contas_recorrentes", {
      id: crypto.randomUUID(),
      descricao: form.descricao,
      valor: Number(form.valor),
      dia_vencimento: Number(form.dia_vencimento),
      categoria: form.categoria,
      tipo: "assinatura",
      status: form.status,
      ativa: form.status === "ativa",
      forma_pagamento: "Cartão",
    });
    toast({ title: "Assinatura cadastrada", status: "success" });
    modal.onClose();
  };
  return (
    <>
      <PageHeader
        title="Central de Assinaturas"
        subtitle="Assinaturas recorrentes integradas ao calendário financeiro."
        action={<Button leftIcon={<Plus size={16} />} onClick={modal.onOpen}>Nova assinatura</Button>}
      />
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing="3">
        <Metric label="Gasto mensal" value={formatCurrencyBRL(analysis.subscriptions.monthly)} icon={<Repeat2 />} />
        <Metric label="Gasto anual" value={formatCurrencyBRL(analysis.subscriptions.yearly)} icon={<CalendarClock />} />
        <Metric label="Assinaturas ativas" value={String(analysis.subscriptions.items.length)} icon={<Bell />} />
      </SimpleGrid>
      <TableContainer {...panel} mt="4">
        <Table>
          <Thead>
            <Tr>
              <Th>Nome</Th>
              <Th>Categoria</Th>
              <Th>Próxima cobrança</Th>
              <Th>Status</Th>
              <Th isNumeric>Valor</Th>
            </Tr>
          </Thead>
          <Tbody>
            {analysis.subscriptions.items.map((item) => (
              <Tr key={item.id}>
                <Td>{item.descricao}</Td>
                <Td>{item.categoria}</Td>
                <Td>Dia {item.dia_vencimento}</Td>
                <Td><Badge>{item.status ?? "ativa"}</Badge></Td>
                <Td isNumeric>{formatCurrencyBRL(item.valor)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      <Modal isOpen={modal.isOpen} onClose={modal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent as="form" onSubmit={submit}>
          <ModalHeader>Nova assinatura</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
              <FormControl isRequired>
                <FormLabel>Nome</FormLabel>
                <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Netflix, ChatGPT..." />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Valor</FormLabel>
                <CurrencyInput value={Number(form.valor)} onValueChange={(value) => setForm({ ...form, valor: String(value) })} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Dia de cobrança</FormLabel>
                <Input type="number" min="1" max="31" value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Categoria</FormLabel>
                <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  <option value="">Selecione</option>
                  {data.categorias_financeiras.filter((x) => x.tipo === "despesa").map((x) => (
                    <option key={x.id}>{x.nome}</option>
                  ))}
                </Select>
              </FormControl>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter><Button type="submit">Salvar</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function TransfersPage({ data, save }: { data: Props["data"]; save: Props["save"] }) {
  const modal = useDisclosure();
  const toast = useToast();
  const [form, setForm] = useState({
    conta_origem_id: "",
    destino: "conta",
    conta_destino_id: "",
    meta_id: "",
    investimento_id: "",
    valor: "",
    data: todayISO(),
    observacao: "",
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const value = Number(form.valor);
      if (!Number.isFinite(value) || value <= 0)
        throw new Error("Informe um valor maior que zero.");
      if (!form.conta_origem_id) throw new Error("Selecione a conta de origem.");
      const sourceAccount = calculateAccountBalances(data).find(
        (account) => account.id === form.conta_origem_id,
      );
      if (!sourceAccount)
        throw new Error("A conta de origem não está mais disponível.");
      if (sourceAccount.saldo < value)
        throw new Error("O saldo da conta de origem é insuficiente.");
      const goal =
        form.destino === "meta"
          ? data.metas_financeiras.find((x) => x.id === form.meta_id)
          : undefined;
      const investment =
        form.destino === "investimento"
          ? data.investimentos.find((x) => x.id === form.investimento_id)
          : undefined;
      if (form.destino === "conta") {
        if (!form.conta_destino_id) throw new Error("Selecione a conta de destino.");
        if (form.conta_destino_id === form.conta_origem_id)
          throw new Error("Origem e destino precisam ser diferentes.");
      }
      if (form.destino === "meta" && !goal) throw new Error("Selecione uma meta.");
      if (form.destino === "investimento" && !investment)
        throw new Error("Selecione um investimento.");
      const transferId = crypto.randomUUID();
      await save("transferencias_internas", {
        id: transferId,
        conta_origem_id: form.conta_origem_id,
        conta_destino_id: form.destino === "conta" ? form.conta_destino_id : null,
        destino_tipo: form.destino,
        destino_id:
          form.destino === "meta"
            ? form.meta_id
            : form.destino === "investimento"
              ? form.investimento_id
              : form.conta_destino_id,
        valor: value,
        data: form.data,
        status: "confirmada",
        observacao: form.observacao,
      });
      if (form.destino === "meta") {
        await save("aportes_metas", {
          id: crypto.randomUUID(),
          meta_id: goal!.id,
          conta_id: form.conta_origem_id,
          origem: `transferencia:${transferId}`,
          valor: value,
          data: form.data,
          status: "confirmado",
          observacao: form.observacao || "Transferência interna",
        });
        await save("metas_financeiras", {
          ...goal!,
          valor_atual: (goal!.valor_atual ?? 0) + value,
        });
      } else if (form.destino === "investimento") {
        await save("movimentacoes_investimentos", {
          id: crypto.randomUUID(),
          investimento_id: investment!.id,
          conta_id: form.conta_origem_id,
          origem: `transferencia:${transferId}`,
          tipo: "aplicacao",
          valor: value,
          data: form.data,
          status: "confirmada",
          observacao: form.observacao || "Transferência interna",
        });
        await save("investimentos", {
          ...investment!,
          valor_investido: (investment!.valor_investido ?? 0) + value,
        });
      }
      toast({ title: "Transferência interna registrada", status: "success" });
      modal.onClose();
    } catch (error) {
      toast({
        title: "Não foi possível transferir",
        description: (error as Error).message,
        status: "error",
      });
    }
  };
  const accounts = calculateAccountBalances(data);
  const accountName = (id?: string | null) =>
    data.contas_financeiras.find((account) => account.id === id)?.nome ?? "—";
  const destinationName = (item: FinanceRecord) => {
    if (item.destino_tipo === "conta") return accountName(item.conta_destino_id);
    if (item.destino_tipo === "meta")
      return data.metas_financeiras.find((goal) => goal.id === item.destino_id)?.nome ?? "Meta";
    if (item.destino_tipo === "investimento")
      return data.investimentos.find((investment) => investment.id === item.destino_id)?.nome ?? "Investimento";
    return "Reserva";
  };
  const transfers = data.transferencias_internas
    .filter((item) => item.status !== "cancelada")
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
  return (
    <>
      <PageHeader
        title="Transferências Internas"
        subtitle="Movimente valores entre contas, metas e investimentos sem classificar como receita ou despesa."
        action={<Button leftIcon={<Plus size={16} />} onClick={modal.onOpen}>Nova transferência</Button>}
      />
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing="3" mb="4">
        <Metric label="Contas ativas" value={String(accounts.length)} icon={<Landmark />} />
        <Metric label="Saldo consolidado" value={formatCurrencyBRL(accounts.reduce((total, account) => total + account.saldo, 0))} icon={<WalletCards />} />
        <Metric label="Transferências" value={String(transfers.length)} icon={<Repeat2 />} />
      </SimpleGrid>
      <TableContainer {...panel}>
        <Table>
          <Thead><Tr><Th>Origem</Th><Th>Destino</Th><Th>Tipo</Th><Th>Data</Th><Th isNumeric>Valor</Th></Tr></Thead>
          <Tbody>
            {transfers.map((item) => (
              <Tr key={item.id}>
                <Td>{accountName(item.conta_origem_id)}</Td>
                <Td>{destinationName(item)}</Td>
                <Td><Badge>{item.destino_tipo}</Badge></Td>
                <Td>{formatDateBR(item.data)}</Td>
                <Td isNumeric>{formatCurrencyBRL(item.valor)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      <Modal isOpen={modal.isOpen} onClose={modal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent as="form" onSubmit={submit}>
          <ModalHeader>Nova transferência interna</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
              <FormControl isRequired>
                <FormLabel>Conta de origem</FormLabel>
                <Select value={form.conta_origem_id} onChange={(e) => setForm({ ...form, conta_origem_id: e.target.value })}>
                  <option value="">Selecione</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.nome} · {formatCurrencyBRL(account.saldo)}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Destino</FormLabel>
                <Select value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })}>
                  <option value="conta">Conta</option>
                  <option value="meta">Meta</option>
                  <option value="investimento">Investimento</option>
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Valor</FormLabel>
                <CurrencyInput value={Number(form.valor)} onValueChange={(value) => setForm({ ...form, valor: String(value) })} />
              </FormControl>
              {form.destino === "conta" ? (
                <FormControl isRequired>
                  <FormLabel>Conta de destino</FormLabel>
                  <Select value={form.conta_destino_id} onChange={(e) => setForm({ ...form, conta_destino_id: e.target.value })}>
                    <option value="">Selecione</option>
                    {data.contas_financeiras.filter((x) => x.id !== form.conta_origem_id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                  </Select>
                </FormControl>
              ) : form.destino === "meta" ? (
                <FormControl isRequired>
                  <FormLabel>Meta</FormLabel>
                  <Select value={form.meta_id} onChange={(e) => setForm({ ...form, meta_id: e.target.value })}>
                    <option value="">Selecione</option>
                    {data.metas_financeiras.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                  </Select>
                </FormControl>
              ) : (
                <FormControl isRequired>
                  <FormLabel>Investimento</FormLabel>
                  <Select value={form.investimento_id} onChange={(e) => setForm({ ...form, investimento_id: e.target.value })}>
                    <option value="">Selecione</option>
                    {data.investimentos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                  </Select>
                </FormControl>
              )}
              <FormControl>
                <FormLabel>Data</FormLabel>
                <DateInputBR value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </FormControl>
            </SimpleGrid>
            <FormControl mt="4">
              <FormLabel>Observação</FormLabel>
              <Textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </FormControl>
          </ModalBody>
          <ModalFooter><Button type="submit">Transferir</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function AssistantPage({ analysis }: { analysis: ReturnType<typeof calculateStrategicAnalysis> }) {
  return (
    <>
      <PageHeader title="Assistente Financeiro Inteligente" subtitle="Insights automáticos para melhorar suas decisões." />
      <Stack spacing="3">
        {analysis.insights.map((insight, index) => (
          <Box key={insight} {...panel} p="5">
            <Flex gap="3" align="flex-start">
              <Brain color="#0F62FE" />
              <Box>
                <Badge colorScheme="blue">Insight #{index + 1}</Badge>
                <Text mt="2" fontWeight="700">{insight}</Text>
              </Box>
            </Flex>
          </Box>
        ))}
      </Stack>
    </>
  );
}

function PatrimonyPage({ analysis }: { analysis: ReturnType<typeof calculateStrategicAnalysis> }) {
  const { patrimony, snapshot, health } = analysis;
  return (
    <>
      <PageHeader title="Patrimônio" subtitle="Ativos, passivos e patrimônio líquido consolidado." />
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing="3">
        <Metric label="Ativos" value={formatCurrencyBRL(patrimony.assets)} icon={<PiggyBank />} tone="green.300" />
        <Metric label="Passivos" value={formatCurrencyBRL(patrimony.liabilities)} icon={<AlertTriangle />} tone="red.300" />
        <Metric label="Patrimônio líquido" value={formatCurrencyBRL(patrimony.netWorth)} icon={<Landmark />} />
      </SimpleGrid>
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="4" mt="4">
        <Box {...panel} p="5">
          <Heading size="sm">Ativos</Heading>
          <Stack mt="4">
            <Flex justify="space-between"><Text>Saldo disponível</Text><Text>{formatCurrencyBRL(snapshot.realBalance)}</Text></Flex>
            <Flex justify="space-between"><Text>Investimentos</Text><Text>{formatCurrencyBRL(snapshot.investedTotal)}</Text></Flex>
            <Flex justify="space-between"><Text>Metas</Text><Text>{formatCurrencyBRL(snapshot.goalsTotal)}</Text></Flex>
            <Flex justify="space-between"><Text>Reserva</Text><Text>{formatCurrencyBRL(health.emergencyReserve)}</Text></Flex>
          </Stack>
        </Box>
        <Box {...panel} p="5">
          <Heading size="sm">Passivos</Heading>
          <Stack mt="4">
            <Flex justify="space-between"><Text>Faturas abertas</Text><Text>{formatCurrencyBRL(snapshot.openInvoiceTotal)}</Text></Flex>
            <Flex justify="space-between"><Text>Contas pendentes</Text><Text>{formatCurrencyBRL(snapshot.pendingExpenses)}</Text></Flex>
            <Flex justify="space-between"><Text>Compromissos futuros</Text><Text>{formatCurrencyBRL(snapshot.committedMoney)}</Text></Flex>
          </Stack>
        </Box>
      </Grid>
      <ChartCard title="Evolução patrimonial">
        <ResponsiveContainer>
          <AreaChart data={patrimony.timeline}>
            <CartesianGrid strokeDasharray="4 4" stroke="#252b36" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(v) => `${Number(v) / 1000}k`} />
            <Tooltip formatter={(v) => formatCurrencyBRL(Number(v))} />
            <Area dataKey="patrimonio" stroke="#6C3BFF" fill="#6C3BFF" fillOpacity=".15" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}

function MovementsPage({ data }: { data: Props["data"] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const movements = [
    ...data.receitas.map((item) => ({
      ...item,
      table: "Receita",
      date: item.data,
      amount: item.valor ?? 0,
      direction: "entrada",
    })),
    ...data.despesas.map((item) => ({
      ...item,
      table: "Despesa",
      date: item.data,
      amount: item.valor ?? 0,
      direction: "saída",
    })),
    ...data.compras_cartao.map((item) => ({
      ...item,
      table: "Compra no cartão (limite)",
      date: item.data_compra,
      amount: item.valor_total ?? 0,
      direction: "cartão",
    })),
    ...data.parcelas_cartao.map((item) => ({
      ...item,
      table: "Parcela do cartão",
      date: item.data_vencimento ?? item.competencia,
      amount: item.valor ?? 0,
      direction: "cartão",
      descricao: `${data.compras_cartao.find((purchase) => purchase.id === item.compra_id)?.descricao ?? "Compra parcelada"} · ${item.numero}/${item.total}`,
    })),
    ...data.faturas_cartao.map((item) => ({
      ...item,
      table: "Fatura",
      date: item.data_vencimento,
      amount: item.valor ?? 0,
      direction: "cartão",
      descricao:
        data.cartoes.find((card) => card.id === item.cartao_id)?.nome ??
        "Fatura de cartão",
    })),
    ...data.aportes_metas.map((item) => ({
      ...item,
      table: "Aporte",
      date: item.data,
      amount: item.valor ?? 0,
      direction: "patrimônio",
      descricao:
        data.metas_financeiras.find((goal) => goal.id === item.meta_id)?.nome ??
        "Aporte em meta",
    })),
    ...data.movimentacoes_investimentos.map((item) => ({
      ...item,
      table: "Investimento",
      date: item.data,
      amount: item.valor ?? 0,
      direction: "patrimônio",
      descricao:
        data.investimentos.find((investment) => investment.id === item.investimento_id)
          ?.nome ?? "Movimentação de investimento",
    })),
  ]
    .filter((item) => {
      const haystack = [
        item.descricao,
        item.nome,
        item.categoria,
        item.observacao,
        item.status,
        item.tipo,
        item.table,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        (!query || haystack.includes(query.toLowerCase())) &&
        (!status || item.status === status) &&
        (!type || item.table === type)
      );
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return (
    <>
      <PageHeader title="Movimentações" subtitle="Todas as entradas, saídas, cartões, aportes e investimentos em um só lugar." />
      <Box {...panel} p="4" mb="4">
        <Flex gap="3" direction={{ base: "column", md: "row" }}>
          <Input placeholder="Buscar nome, categoria ou observação" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={type} onChange={(e) => setType(e.target.value)} maxW={{ md: "220px" }}>
            <option value="">Todos os tipos</option>
            {["Receita", "Despesa", "Compra no cartão (limite)", "Parcela do cartão", "Fatura", "Aporte", "Investimento"].map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} maxW={{ md: "220px" }}>
            <option value="">Todos os status</option>
            {["recebida", "pendente", "pago", "paga", "confirmado", "confirmada", "aberta", "fechada"].map((item) => <option key={item}>{item}</option>)}
          </Select>
        </Flex>
      </Box>
      <TableContainer {...panel}>
        <Table>
          <Thead><Tr><Th>Data</Th><Th>Movimentação</Th><Th>Tipo</Th><Th>Status</Th><Th isNumeric>Valor</Th></Tr></Thead>
          <Tbody>
            {movements.map((item) => (
              <Tr key={`${item.table}-${item.id}`}>
                <Td>{formatDateBR(item.date)}</Td>
                <Td><Text fontWeight="700">{item.descricao || item.nome}</Text><Text color="muted" fontSize="xs">{item.categoria || item.observacao}</Text></Td>
                <Td><Badge>{item.table}</Badge></Td>
                <Td>{item.status ?? "—"}</Td>
                <Td isNumeric color={item.direction === "entrada" ? "green.300" : undefined}>{formatCurrencyBRL(item.amount)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
}

function TimelinePage({ data }: { data: Props["data"] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const accountName = (id?: string | null) =>
    data.contas_financeiras.find((account) => account.id === id)?.nome ?? "";
  const rows = [
    ...data.receitas.map((item) => ({
      id: `receita-${item.id}`,
      date: item.data,
      title: item.descricao ?? "Receita",
      subtitle: [item.categoria, accountName(item.conta_id)].filter(Boolean).join(" · "),
      amount: item.valor ?? 0,
      type: "Receita",
      color: "green.300",
      sign: "+",
    })),
    ...data.despesas.map((item) => ({
      id: `despesa-${item.id}`,
      date: item.data,
      title: item.descricao ?? "Despesa",
      subtitle: [item.categoria, accountName(item.conta_id)].filter(Boolean).join(" · "),
      amount: item.valor ?? 0,
      type: "Despesa",
      color: "red.300",
      sign: "-",
    })),
    ...data.transferencias_internas.map((item) => ({
      id: `transferencia-${item.id}`,
      date: item.data,
      title: `${accountName(item.conta_origem_id) || "Origem"} → ${
        item.destino_tipo === "conta"
          ? accountName(item.conta_destino_id)
          : item.destino_tipo === "meta"
            ? data.metas_financeiras.find((goal) => goal.id === item.destino_id)?.nome
            : data.investimentos.find((investment) => investment.id === item.destino_id)?.nome
      }`,
      subtitle: item.observacao ?? "Transferência interna",
      amount: item.valor ?? 0,
      type: "Transferência",
      color: "blue.300",
      sign: "↔",
    })),
    ...data.aportes_metas
      .filter((item) => !String(item.origem ?? "").startsWith("transferencia:"))
      .map((item) => ({
        id: `aporte-${item.id}`,
        date: item.data,
        title: data.metas_financeiras.find((goal) => goal.id === item.meta_id)?.nome ?? "Aporte em meta",
        subtitle: accountName(item.conta_id),
        amount: item.valor ?? 0,
        type: "Meta",
        color: "yellow.300",
        sign: "→",
      })),
    ...data.movimentacoes_investimentos
      .filter((item) => !String(item.origem ?? "").startsWith("transferencia:"))
      .map((item) => ({
        id: `investimento-${item.id}`,
        date: item.data,
        title:
          data.investimentos.find((investment) => investment.id === item.investimento_id)?.nome ??
          "Investimento",
        subtitle: [item.tipo, accountName(item.conta_id)].filter(Boolean).join(" · "),
        amount: item.valor ?? 0,
        type: "Investimento",
        color: "purple.300",
        sign: item.tipo === "resgate" ? "+" : "→",
      })),
  ]
    .filter((item) => {
      const haystack = `${item.title} ${item.subtitle} ${item.type}`.toLowerCase();
      return (
        (!query || haystack.includes(query.toLowerCase())) &&
        (!type || item.type === type)
      );
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return (
    <>
      <PageHeader title="Timeline Financeira" subtitle="Extrato visual de receitas, despesas, transferências, metas e investimentos." />
      <Box {...panel} p="4" mb="4">
        <Flex gap="3" direction={{ base: "column", md: "row" }}>
          <Input placeholder="Buscar por descrição, categoria ou conta" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={type} onChange={(e) => setType(e.target.value)} maxW={{ md: "240px" }}>
            <option value="">Todos os tipos</option>
            {["Receita", "Despesa", "Transferência", "Investimento", "Meta"].map((item) => <option key={item}>{item}</option>)}
          </Select>
        </Flex>
      </Box>
      <Stack spacing="3">
        {rows.map((item) => (
          <Flex key={item.id} {...panel} p="4" align="center" justify="space-between" gap="4">
            <Flex gap="3" align="center">
              <Center w="42px" h="42px" borderRadius="full" bg="panel2" color={item.color} fontWeight="900">
                {item.sign}
              </Center>
              <Box>
                <Text fontWeight="800">{item.title}</Text>
                <Text color="muted" fontSize="sm">{formatDateBR(item.date)} · {item.subtitle || item.type}</Text>
              </Box>
            </Flex>
            <Text fontWeight="900" color={item.color}>{formatCurrencyBRL(item.amount)}</Text>
          </Flex>
        ))}
        {!rows.length && <Box {...panel} p="8" textAlign="center" color="muted">Nenhuma movimentação encontrada.</Box>}
      </Stack>
    </>
  );
}

function QuickImportPage({ data, save }: { data: Props["data"]; save: Props["save"] }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<FinanceRecord[]>([]);
  const toast = useToast();
  const categories = data.categorias_financeiras.filter((x) => x.tipo === "despesa");
  const parse = () => {
    const rows = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const amountMatch = line.match(/(\d+[,.]\d{2}|\d+)/);
        const value = amountMatch ? Number(amountMatch[0].replace(",", ".")) : 0;
        const normalized = line.toLowerCase();
        const category =
          categories.find((item) =>
            normalized.includes((item.nome ?? "").toLowerCase()),
          )?.nome ??
          categories.find((item) => normalized.includes("mercado") && item.nome?.toLowerCase().includes("aliment"))?.nome ??
          categories.find((item) => normalized.includes("gasolina") && item.nome?.toLowerCase().includes("transporte"))?.nome ??
          "Outros";
        const method = normalized.includes("pix")
          ? "Pix"
          : normalized.includes("débito") || normalized.includes("debito")
            ? "Débito"
            : normalized.includes("crédito") || normalized.includes("credito")
              ? "Crédito"
              : "Pix";
        return {
          id: crypto.randomUUID(),
          descricao: line.replace(amountMatch?.[0] ?? "", "").trim(),
          valor: value,
          categoria: category,
          data: todayISO(),
          forma_pagamento: method,
          status: "pago",
          tipo: normalized.includes("recorrente") ? "recorrente" : "avulsa",
        };
      });
    setParsed(rows);
  };
  const persist = async () => {
    for (const item of parsed) await save("despesas", item);
    toast({ title: `${parsed.length} gasto(s) importado(s)`, status: "success" });
    setText("");
    setParsed([]);
  };
  return (
    <>
      <PageHeader title="Importação Rápida" subtitle="Cole gastos em texto livre e confirme antes de salvar." />
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="4">
        <Box {...panel} p="5">
          <Textarea minH="240px" value={text} onChange={(e) => setText(e.target.value)} placeholder={"Mercado 89,90 alimentação pix\nGasolina 120 transporte débito\nAcademia 120 recorrente"} />
          <Button mt="4" onClick={parse}>Interpretar gastos</Button>
        </Box>
        <Box {...panel} p="5">
          <Heading size="sm">Prévia</Heading>
          <Stack mt="4">
            {parsed.map((item) => (
              <Flex key={item.id} justify="space-between" bg="panel2" p="3" borderRadius="xl">
                <Box><Text fontWeight="700">{item.descricao}</Text><Text color="muted" fontSize="xs">{item.categoria} · {item.forma_pagamento}</Text></Box>
                <Text>{formatCurrencyBRL(item.valor)}</Text>
              </Flex>
            ))}
            {!parsed.length && <Text color="muted">Nada interpretado ainda.</Text>}
          </Stack>
          <Button mt="4" isDisabled={!parsed.length} onClick={() => void persist()}>Salvar despesas</Button>
        </Box>
      </Grid>
    </>
  );
}

function MonthlyClosingPage({ analysis }: { analysis: ReturnType<typeof calculateStrategicAnalysis> }) {
  const { snapshot } = analysis;
  const biggest = snapshot.categories[0];
  return (
    <>
      <PageHeader title="Fechamento Mensal" subtitle="Resumo automático do mês com insights operacionais." />
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing="3">
        <Metric label="Total recebido" value={formatCurrencyBRL(snapshot.received)} />
        <Metric label="Salário" value={formatCurrencyBRL(snapshot.salaryReceived)} />
        <Metric label="Extras previstos" value={formatCurrencyBRL(Math.max(0, snapshot.predictedRevenue - snapshot.salaryExpected))} />
        <Metric label="Total gasto" value={formatCurrencyBRL(snapshot.paidExpenses + snapshot.paidInvoiceValue)} />
        <Metric label="Faturas pagas" value={formatCurrencyBRL(snapshot.paidInvoiceValue)} />
        <Metric label="Aplicado" value={formatCurrencyBRL(snapshot.appliedInvestments)} />
        <Metric label="Resgatado" value={formatCurrencyBRL(snapshot.redeemedInvestments)} />
        <Metric label="Aportado em metas" value={formatCurrencyBRL(snapshot.contributions)} />
      </SimpleGrid>
      <Box {...panel} p="5" mt="4">
        <Heading size="sm">Insights do fechamento</Heading>
        <Stack mt="4">
          <Text>• Você economizou {formatPercent(snapshot.savingsRate)} da renda recebida.</Text>
          <Text>• {biggest ? `Sua maior categoria de gasto foi ${biggest.name}.` : "Sem gastos por categoria no mês."}</Text>
          <Text>• Seu patrimônio consolidado está em {formatCurrencyBRL(snapshot.patrimony)}.</Text>
        </Stack>
      </Box>
    </>
  );
}

function BudgetsPage({ data, save }: { data: Props["data"]; save: Props["save"] }) {
  const toast = useToast();
  const [form, setForm] = useState({ categoria_id: "", limite: "", competencia: todayISO().slice(0, 7) });
  const saveBudget = async (event: FormEvent) => {
    event.preventDefault();
    await save("orcamentos_categoria", {
      id: crypto.randomUUID(),
      categoria_id: form.categoria_id,
      competencia: `${form.competencia}-01`,
      limite: Number(form.limite),
      alerta_percentual: 80,
    });
    toast({ title: "Orçamento salvo", status: "success" });
  };
  const month = form.competencia;
  const rows = data.categorias_financeiras
    .filter((category) => category.tipo === "despesa")
    .map((category) => {
      const budget = data.orcamentos_categoria.find((item) => item.categoria_id === category.id && item.competencia?.startsWith(month));
      const spent = data.despesas.filter((item) => item.categoria_id === category.id || item.categoria === category.nome).filter((item) => item.data?.startsWith(month) && item.status !== "cancelado").reduce((total, item) => total + (item.valor ?? 0), 0);
      const limit = budget?.limite ?? 0;
      return { category, budget, spent, limit, percent: limit ? (spent / limit) * 100 : 0 };
    });
  return (
    <>
      <PageHeader title="Orçamentos" subtitle="Limites mensais por categoria com alertas de 50%, 80% e 100%." />
      <Box {...panel} p="4" as="form" onSubmit={saveBudget} mb="4">
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing="3">
          <Input type="month" value={form.competencia} onChange={(e) => setForm({ ...form, competencia: e.target.value })} />
          <Select required value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
            <option value="">Categoria</option>
            {data.categorias_financeiras.filter((x) => x.tipo === "despesa").map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </Select>
          <CurrencyInput value={Number(form.limite)} onValueChange={(value) => setForm({ ...form, limite: String(value) })} />
          <Button type="submit">Salvar limite</Button>
        </SimpleGrid>
      </Box>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="3">
        {rows.map((row) => (
          <Box key={row.category.id} {...panel} p="4">
            <Flex justify="space-between"><Text fontWeight="800">{row.category.nome}</Text><Badge colorScheme={row.percent >= 100 ? "red" : row.percent >= 80 ? "orange" : row.percent >= 50 ? "yellow" : "green"}>{row.percent.toFixed(0)}%</Badge></Flex>
            <Progress value={row.percent} mt="3" borderRadius="full" colorScheme={row.percent >= 100 ? "red" : row.percent >= 80 ? "orange" : "blue"} />
            <Text mt="2" color="muted">{formatCurrencyBRL(row.spent)} / {formatCurrencyBRL(row.limit)}</Text>
          </Box>
        ))}
      </SimpleGrid>
    </>
  );
}

function ExportPage({ data }: { data: Props["data"] }) {
  const [table, setTable] = useState<FinanceTable>("receitas");
  const [mode, setMode] = useState<"month" | "range" | "year">("month");
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [dateFrom, setDateFrom] = useState(`${todayISO().slice(0, 7)}-01`);
  const [dateTo, setDateTo] = useState(todayISO());
  const [year, setYear] = useState(todayISO().slice(0, 4));
  const getRowDates = (row: FinanceRecord) =>
    [
      row.data,
      row.data_compra,
      row.competencia,
      row.data_investimento,
      row.data_vencimento,
      row.paga_em,
      row.data_fechamento,
      row.data_objetivo,
      row.created_at,
    ].filter(Boolean) as string[];
  const rows = data[table].filter((item) => {
    const dates = getRowDates(item);
    if (!dates.length) return true;
    if (mode === "month") return dates.some((value) => value.startsWith(month));
    if (mode === "year") return dates.some((value) => value.startsWith(year));
    return dates.some((value) => value.slice(0, 10) >= dateFrom && value.slice(0, 10) <= dateTo);
  });
  const suffix = mode === "month" ? month : mode === "year" ? year : `${dateFrom}-${dateTo}`;
  const exportCsv = () => {
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const csv = [headers.join(";"), ...rows.map((row) => headers.map((key) => JSON.stringify((row as unknown as Record<string, unknown>)[key] ?? "")).join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${table}-${suffix || "todos"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportExcel = () => {
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const html = `<html><head><meta charset="utf-8" /></head><body><table><thead><tr>${headers
      .map((header) => `<th>${header}</th>`)
      .join("")}</tr></thead><tbody>${rows
      .map(
        (row) =>
          `<tr>${headers
            .map((key) => `<td>${String((row as unknown as Record<string, unknown>)[key] ?? "")}</td>`)
            .join("")}</tr>`,
      )
      .join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${table}-${suffix || "todos"}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageHeader title="Exportação de Dados" subtitle="Exporte dados financeiros em CSV por mês, intervalo personalizado ou ano completo." />
      <Box {...panel} p="5">
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing="3">
          <Select value={table} onChange={(e) => setTable(e.target.value as FinanceTable)}>
            {Object.keys(data).map((key) => <option key={key} value={key}>{key}</option>)}
          </Select>
          <Select value={mode} onChange={(e) => setMode(e.target.value as "month" | "range" | "year")}>
            <option value="month">Mês atual</option>
            <option value="range">Intervalo</option>
            <option value="year">Ano completo</option>
          </Select>
          {mode === "month" && <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />}
          {mode === "year" && <Input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} />}
          {mode === "range" && (
            <SimpleGrid columns={2} spacing="2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </SimpleGrid>
          )}
          <Button leftIcon={<Download size={16} />} onClick={exportCsv}>Exportar CSV</Button>
        </SimpleGrid>
        <Flex mt="4" justify="space-between" align={{ base: "flex-start", md: "center" }} gap="3" direction={{ base: "column", md: "row" }}>
          <Text color="muted" fontSize="sm">
            {rows.length} registro(s) encontrado(s) para o filtro selecionado.
          </Text>
          <Flex gap="2">
            <Button size="sm" variant="outline" onClick={exportExcel}>Exportar Excel</Button>
          </Flex>
        </Flex>
      </Box>
    </>
  );
}

function AccountsPage({ data, save }: { data: Props["data"]; save: Props["save"] }) {
  const modal = useDisclosure();
  const toast = useToast();
  const [form, setForm] = useState({
    nome: "",
    tipo: "Conta Corrente",
    banco: "",
    cor: "#0F62FE",
    saldo_inicial: "",
    status: "ativa",
  });
  const accounts = calculateAccountBalances(data);
  const total = accounts.reduce((sum, account) => sum + account.saldo, 0);
  const topAccount = [...accounts].sort((a, b) => b.saldo - a.saldo)[0];
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save("contas_financeiras", {
      id: crypto.randomUUID(),
      nome: form.nome,
      tipo: form.tipo,
      banco: form.banco,
      cor: form.cor,
      saldo_inicial: Number(form.saldo_inicial),
      status: form.status,
    });
    toast({ title: "Conta financeira cadastrada", status: "success" });
    setForm({
      nome: "",
      tipo: "Conta Corrente",
      banco: "",
      cor: "#0F62FE",
      saldo_inicial: "",
      status: "ativa",
    });
    modal.onClose();
  };
  return (
    <>
      <PageHeader
        title="Contas Financeiras"
        subtitle="Controle onde o dinheiro realmente está: bancos, corretoras, carteira e caixa."
        action={<Button leftIcon={<Plus size={16} />} onClick={modal.onOpen}>Nova conta</Button>}
      />
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing="3" mb="4">
        <Metric label="Saldo consolidado" value={formatCurrencyBRL(total)} icon={<WalletCards />} />
        <Metric label="Contas ativas" value={String(accounts.length)} icon={<Landmark />} />
        <Metric label="Maior saldo" value={topAccount?.nome ?? "—"} help={formatCurrencyBRL(topAccount?.saldo ?? 0)} icon={<PiggyBank />} />
      </SimpleGrid>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="3">
        {accounts.map((account) => (
          <Box key={account.id} {...panel} p="5">
            <Flex justify="space-between" align="flex-start">
              <Box>
                <Badge bg={account.cor} color="white">{account.tipo}</Badge>
                <Heading size="sm" mt="3">{account.nome}</Heading>
                <Text color="muted" fontSize="sm">{account.banco || "Sem banco informado"}</Text>
              </Box>
              <Badge colorScheme={account.status === "ativa" ? "green" : "gray"}>{account.status}</Badge>
            </Flex>
            <Heading size="lg" mt="5">{formatCurrencyBRL(account.saldo)}</Heading>
            <SimpleGrid columns={2} spacing="2" mt="4">
              <Box bg="panel2" p="3" borderRadius="xl">
                <Text color="muted" fontSize="xs">Entradas</Text>
                <Text fontWeight="800" color="green.300">{formatCurrencyBRL(account.entradas + account.transferenciasEntrada)}</Text>
              </Box>
              <Box bg="panel2" p="3" borderRadius="xl">
                <Text color="muted" fontSize="xs">Saídas</Text>
                <Text fontWeight="800" color="red.300">{formatCurrencyBRL(account.saidas + account.transferenciasSaida)}</Text>
              </Box>
            </SimpleGrid>
          </Box>
        ))}
        {!accounts.length && (
          <Box {...panel} p="8" textAlign="center">
            <Landmark />
            <Heading size="sm" mt="3">Nenhuma conta financeira cadastrada</Heading>
            <Text color="muted" mt="2">Cadastre sua conta principal para começar a controlar saldo real por origem.</Text>
            <Button mt="4" onClick={modal.onOpen}>Cadastrar primeira conta</Button>
          </Box>
        )}
      </SimpleGrid>
      <Modal isOpen={modal.isOpen} onClose={modal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent as="form" onSubmit={submit}>
          <ModalHeader>Nova conta financeira</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
              <FormControl isRequired>
                <FormLabel>Nome</FormLabel>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Bradesco, Nubank, XP..." />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Tipo</FormLabel>
                <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  {["Conta Corrente", "Conta Poupança", "Conta Investimento", "Carteira", "Caixa"].map((type) => <option key={type}>{type}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Banco / Instituição</FormLabel>
                <Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Cor</FormLabel>
                <Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Saldo inicial</FormLabel>
                <CurrencyInput value={Number(form.saldo_inicial)} onValueChange={(value) => setForm({ ...form, saldo_inicial: String(value) })} />
              </FormControl>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="ativa">ativa</option>
                  <option value="inativa">inativa</option>
                  <option value="arquivada">arquivada</option>
                </Select>
              </FormControl>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter>
            <Button type="submit">Salvar conta</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function PatrimonyEvolutionPage({ analysis }: { analysis: ReturnType<typeof calculateStrategicAnalysis> }) {
  const timeline = analysis.patrimony.timeline;
  const best = [...timeline].sort((a, b) => b.patrimonio - a.patrimonio)[0];
  const worst = [...timeline].sort((a, b) => a.patrimonio - b.patrimonio)[0];
  const growth = timeline.length > 1 ? timeline.at(-1)!.patrimonio - timeline[0].patrimonio : 0;
  return (
    <>
      <PageHeader title="Evolução Patrimonial" subtitle="Histórico mensal de saldo, metas e investimentos sem renda virtual retroativa." />
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing="3" mb="4">
        <Metric label="Crescimento" value={formatCurrencyBRL(growth)} />
        <Metric label="Melhor mês" value={best?.label ?? "—"} help={formatCurrencyBRL(best?.patrimonio ?? 0)} />
        <Metric label="Pior mês" value={worst?.label ?? "—"} help={formatCurrencyBRL(worst?.patrimonio ?? 0)} />
      </SimpleGrid>
      <ChartCard title="Patrimônio consolidado">
        <ResponsiveContainer>
          <AreaChart data={timeline}>
            <CartesianGrid strokeDasharray="4 4" stroke="#252b36" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(v) => `${Number(v) / 1000}k`} />
            <Tooltip formatter={(v) => formatCurrencyBRL(Number(v))} />
            <Area dataKey="patrimonio" stroke="#35c894" fill="#35c894" fillOpacity=".14" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}

export default function StrategicModule({ page, data, profile, save }: Props) {
  const analysis = useMemo(
    () => calculateStrategicAnalysis(data, profile),
    [data, profile],
  );
  if (page === "saude") return <HealthPage analysis={analysis} />;
  if (page === "projecoes") return <ProjectionsPage analysis={analysis} />;
  if (page === "alertas") return <AlertsPage analysis={analysis} />;
  if (page === "notificacoes") return <NotificationsPage data={data} />;
  if (page === "comparativo") return <ComparisonPage analysis={analysis} />;
  if (page === "reserva") return <EmergencyPage analysis={analysis} />;
  if (page === "planejamento") return <MonthlyPlanPage analysis={analysis} />;
  if (page === "assinaturas")
    return <SubscriptionsPage analysis={analysis} data={data} save={save} />;
  if (page === "transferencias")
    return <TransfersPage data={data} save={save} />;
  if (page === "assistente") return <AssistantPage analysis={analysis} />;
  if (page === "movimentacoes") return <MovementsPage data={data} />;
  if (page === "timeline") return <TimelinePage data={data} />;
  if (page === "importacao") return <QuickImportPage data={data} save={save} />;
  if (page === "fechamento") return <MonthlyClosingPage analysis={analysis} />;
  if (page === "orcamentos") return <BudgetsPage data={data} save={save} />;
  if (page === "exportacao") return <ExportPage data={data} />;
  if (page === "contas") return <AccountsPage data={data} save={save} />;
  if (page === "evolucao") return <PatrimonyEvolutionPage analysis={analysis} />;
  return <PatrimonyPage analysis={analysis} />;
}
