import { useMemo, useState, type FormEvent } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Switch,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Archive,
  Edit2,
  Eye,
  Landmark,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { FinanceRecord, FinanceTable } from "../../types/database";
import { calculateAccountBalances } from "../../services/accountService";
import { CurrencyInput } from "../../components/forms/CurrencyInput";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { formatCurrencyBRL, formatDateBR } from "../../utils/formatters";

type Data = Record<FinanceTable, FinanceRecord[]>;
type Props = {
  data: Data;
  save: (table: FinanceTable, item: FinanceRecord) => Promise<void>;
  remove: (table: FinanceTable, id: string) => Promise<void>;
};
type Action = "archive" | "reactivate" | "delete";

const panel = {
  bg: "panel",
  border: "1px solid",
  borderColor: "line",
  borderRadius: "2xl",
  boxShadow: "card",
} as const;
const colors = ["#0F62FE", "#6C3BFF", "#35c894", "#f7b84b", "#f56565"];
const blank = {
  nome: "",
  banco: "",
  tipo: "Conta Corrente",
  cor: "#0F62FE",
  icone: "Landmark",
  saldo_inicial: 0,
  permite_saldo_negativo: false,
  observacao: "",
};

const persistedAccount = (account: FinanceRecord, status = account.status) => ({
  id: account.id,
  nome: account.nome,
  banco: account.banco,
  tipo: account.tipo,
  cor: account.cor,
  icone: account.icone,
  saldo_inicial: account.saldo_inicial,
  permite_saldo_negativo: account.permite_saldo_negativo,
  observacao: account.observacao,
  status,
});

function linkedCount(data: Data, accountId: string) {
  return (
    data.receitas.filter((item) => item.conta_id === accountId).length +
    data.despesas.filter((item) => item.conta_id === accountId).length +
    data.faturas_cartao.filter((item) => item.conta_id === accountId).length +
    data.aportes_metas.filter((item) => item.conta_id === accountId).length +
    data.movimentacoes_investimentos.filter((item) => item.conta_id === accountId).length +
    data.contas_recorrentes.filter((item) => item.conta_id === accountId).length +
    data.transferencias_internas.filter(
      (item) =>
        item.conta_origem_id === accountId || item.conta_destino_id === accountId,
    ).length +
    data.cartoes.filter((item) => item.conta_id === accountId).length
  );
}

function accountStatement(data: Data, accountId: string) {
  const rows = [
    ...data.receitas
      .filter((item) => item.conta_id === accountId && item.status === "recebida")
      .map((item) => ({ ...item, label: item.descricao ?? "Receita", date: item.data, value: item.valor ?? 0 })),
    ...data.despesas
      .filter(
        (item) =>
          item.conta_id === accountId &&
          item.status === "pago" &&
          item.tipo !== "pagamento_cartao",
      )
      .map((item) => ({ ...item, label: item.descricao ?? "Despesa", date: item.data, value: -(item.valor ?? 0) })),
    ...data.faturas_cartao
      .filter((item) => item.conta_id === accountId && item.status === "paga")
      .map((item) => ({ ...item, label: "Pagamento de fatura", date: item.paga_em ?? item.data_vencimento, value: -(item.valor ?? 0) })),
    ...data.aportes_metas
      .filter(
        (item) =>
          item.conta_id === accountId &&
          item.status !== "pendente" &&
          !String(item.origem ?? "").startsWith("transferencia:"),
      )
      .map((item) => ({
        ...item,
        label: `Aporte · ${data.metas_financeiras.find((goal) => goal.id === item.meta_id)?.nome ?? "Meta"}`,
        date: item.data,
        value: -(item.valor ?? 0),
      })),
    ...data.movimentacoes_investimentos
      .filter(
        (item) =>
          item.conta_id === accountId &&
          item.status !== "pendente" &&
          !String(item.origem ?? "").startsWith("transferencia:"),
      )
      .map((item) => ({
        ...item,
        label: `${item.tipo === "resgate" ? "Resgate" : "Aplicação"} · ${data.investimentos.find((investment) => investment.id === item.investimento_id)?.nome ?? "Investimento"}`,
        date: item.data,
        value: item.tipo === "resgate" ? item.valor ?? 0 : -(item.valor ?? 0),
      })),
    ...data.transferencias_internas
      .filter(
        (item) =>
          item.status === "confirmada" &&
          (item.conta_origem_id === accountId || item.conta_destino_id === accountId),
      )
      .map((item) => ({
        ...item,
        label: item.conta_destino_id === accountId ? "Transferência recebida" : "Transferência enviada",
        date: item.data,
        value: (item.conta_destino_id === accountId ? 1 : -1) * (item.valor ?? 0),
      })),
  ];
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function AccountManagement({ data, save, remove }: Props) {
  const editor = useDisclosure();
  const statementModal = useDisclosure();
  const toast = useToast();
  const [editing, setEditing] = useState<FinanceRecord>();
  const [selected, setSelected] = useState<FinanceRecord>();
  const [action, setAction] = useState<Action>();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank);
  const accounts = calculateAccountBalances(data);
  const activeAccounts = accounts.filter((account) => account.status === "ativa");
  const total = accounts.reduce((sum, account) => sum + account.saldo, 0);
  const topAccount = [...accounts].sort((a, b) => b.saldo - a.saldo)[0];
  const mostUsed = [...accounts].sort(
    (a, b) => linkedCount(data, b.id) - linkedCount(data, a.id),
  )[0];
  const distribution = accounts
    .filter((account) => account.saldo > 0)
    .map((account) => ({ name: account.nome ?? "Conta", value: account.saldo }));
  const statement = useMemo(
    () => (selected ? accountStatement(data, selected.id) : []),
    [data, selected],
  );

  const openEditor = (account?: FinanceRecord) => {
    setEditing(account);
    setForm(
      account
        ? {
            nome: account.nome ?? "",
            banco: account.banco ?? "",
            tipo: account.tipo ?? "Conta Corrente",
            cor: account.cor ?? "#0F62FE",
            icone: account.icone ?? "Landmark",
            saldo_inicial: account.saldo_inicial ?? 0,
            permite_saldo_negativo: account.permite_saldo_negativo ?? false,
            observacao: account.observacao ?? "",
          }
        : blank,
    );
    editor.onOpen();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (!form.nome.trim()) throw new Error("Informe o nome da conta.");
      if (form.saldo_inicial < 0 && !form.permite_saldo_negativo)
        throw new Error("Ative a permissão de saldo negativo para usar um saldo inicial menor que zero.");
      const currentBalance = editing
        ? accounts.find((account) => account.id === editing.id)?.saldo ?? 0
        : form.saldo_inicial;
      if (currentBalance < 0 && !form.permite_saldo_negativo)
        throw new Error(
          "Esta conta está negativa. Regularize o saldo antes de desativar essa permissão.",
        );
      await save("contas_financeiras", {
        id: editing?.id ?? crypto.randomUUID(),
        ...form,
        nome: form.nome.trim(),
        banco: form.banco.trim(),
        observacao: form.observacao.trim(),
        status: editing?.status ?? "ativa",
      });
      toast({ title: editing ? "Conta atualizada" : "Conta cadastrada", status: "success" });
      editor.onClose();
    } catch (error) {
      toast({ title: "Não foi possível salvar a conta", description: (error as Error).message, status: "error" });
    } finally {
      setSaving(false);
    }
  };

  const executeAction = async () => {
    if (!selected || !action) return;
    setSaving(true);
    try {
      const links = linkedCount(data, selected.id);
      if (action === "delete" && !links) {
        await remove("contas_financeiras", selected.id);
        toast({ title: "Conta excluída definitivamente", status: "success" });
      } else {
        const status = action === "reactivate" ? "ativa" : "arquivada";
        await save(
          "contas_financeiras",
          persistedAccount(selected, status),
        );
        toast({
          title:
            status === "ativa"
              ? "Conta reativada"
              : action === "delete"
                ? "A conta possui vínculos e foi arquivada"
                : "Conta arquivada",
          status: "success",
        });
      }
      setAction(undefined);
    } catch (error) {
      toast({ title: "Não foi possível atualizar a conta", description: (error as Error).message, status: "error" });
    } finally {
      setSaving(false);
    }
  };

  const selectedLinks = selected ? linkedCount(data, selected.id) : 0;
  return (
    <>
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap="3" mb="6">
        <Box><Heading size="lg">Contas Financeiras</Heading><Text color="muted">Controle onde o dinheiro está e preserve o histórico de cada conta.</Text></Box>
        <Button leftIcon={<Plus size={16} />} onClick={() => openEditor()}>Nova conta</Button>
      </Flex>
      <SimpleGrid columns={{ base: 1, sm: 2, xl: 5 }} spacing="3" mb="4">
        {[
          ["Saldo total", formatCurrencyBRL(total)],
          ["Contas", String(accounts.length)],
          ["Contas ativas", String(activeAccounts.length)],
          ["Maior saldo", topAccount?.nome ?? "—"],
          ["Mais utilizada", mostUsed?.nome ?? "—"],
        ].map(([label, value]) => <Box key={label} {...panel} p="4"><Stat><StatLabel>{label}</StatLabel><StatNumber fontSize="xl">{value}</StatNumber></Stat></Box>)}
      </SimpleGrid>
      <SimpleGrid columns={{ base: 1, xl: 3 }} spacing="4">
        <Box {...panel} p="5" gridColumn={{ xl: "span 2" }}>
          <Heading size="sm" mb="4">Contas cadastradas</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing="3">
            {accounts.map((account) => (
              <Box key={account.id} bg="panel2" borderRadius="xl" p="4" opacity={account.status === "arquivada" ? 0.68 : 1}>
                <Flex justify="space-between" align="flex-start"><Box><Badge bg={account.cor} color="white">{account.tipo}</Badge><Heading size="sm" mt="2">{account.nome}</Heading><Text color="muted" fontSize="sm">{account.banco || "Sem instituição"}</Text></Box><Badge colorScheme={account.status === "ativa" ? "green" : "gray"}>{account.status}</Badge></Flex>
                <Heading size="md" mt="4">{formatCurrencyBRL(account.saldo)}</Heading>
                <Text fontSize="xs" color="muted">{linkedCount(data, account.id)} movimentação(ões) vinculada(s)</Text>
                <Flex mt="3" justify="flex-end" gap="1">
                  <IconButton aria-label="Ver extrato" icon={<Eye size={16} />} size="sm" variant="ghost" onClick={() => { setSelected(account); statementModal.onOpen(); }} />
                  <IconButton aria-label="Editar conta" icon={<Edit2 size={16} />} size="sm" variant="ghost" onClick={() => openEditor(account)} />
                  {account.status === "ativa" ? <IconButton aria-label="Arquivar conta" icon={<Archive size={16} />} size="sm" variant="ghost" onClick={() => { setSelected(account); setAction("archive"); }} /> : <IconButton aria-label="Reativar conta" icon={<RotateCcw size={16} />} size="sm" variant="ghost" onClick={() => { setSelected(account); setAction("reactivate"); }} />}
                  <IconButton aria-label="Excluir conta" icon={<Trash2 size={16} />} size="sm" variant="ghost" colorScheme="red" onClick={() => { setSelected(account); setAction("delete"); }} />
                </Flex>
              </Box>
            ))}
            {!accounts.length && <Box p="8" textAlign="center"><Landmark /><Text mt="3" color="muted">Nenhuma conta cadastrada.</Text></Box>}
          </SimpleGrid>
        </Box>
        <Box {...panel} p="5">
          <Heading size="sm">Distribuição por conta</Heading>
          <Box h="230px">
            {distribution.length ? <ResponsiveContainer><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82}>{distribution.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => formatCurrencyBRL(Number(value))} /></PieChart></ResponsiveContainer> : <Flex h="full" align="center" justify="center" color="muted">Sem saldo positivo.</Flex>}
          </Box>
          <Stack spacing="2">{distribution.map((item, index) => <Flex key={item.name} justify="space-between"><Flex align="center" gap="2"><Box w="8px" h="8px" borderRadius="full" bg={colors[index % colors.length]} /><Text fontSize="sm">{item.name}</Text></Flex><Text fontSize="sm" fontWeight="700">{total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%</Text></Flex>)}</Stack>
        </Box>
      </SimpleGrid>

      <Modal isOpen={editor.isOpen} onClose={editor.onClose} size="lg">
        <ModalOverlay backdropFilter="blur(8px)" /><ModalContent as="form" onSubmit={submit}><ModalHeader>{editing ? "Editar conta" : "Nova conta financeira"}</ModalHeader><ModalCloseButton /><ModalBody><SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
          <FormControl isRequired><FormLabel>Nome</FormLabel><Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} /></FormControl>
          <FormControl isRequired><FormLabel>Tipo</FormLabel><Select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}>{["Conta Corrente", "Conta Poupança", "Conta Investimento", "Carteira", "Caixa"].map((type) => <option key={type}>{type}</option>)}</Select></FormControl>
          <FormControl><FormLabel>Banco / instituição</FormLabel><Input value={form.banco} onChange={(event) => setForm({ ...form, banco: event.target.value })} /></FormControl>
          <FormControl><FormLabel>Ícone</FormLabel><Select value={form.icone} onChange={(event) => setForm({ ...form, icone: event.target.value })}>{["Landmark", "WalletCards", "PiggyBank", "Building2"].map((icon) => <option key={icon}>{icon}</option>)}</Select></FormControl>
          <FormControl><FormLabel>Cor</FormLabel><Input type="color" value={form.cor} onChange={(event) => setForm({ ...form, cor: event.target.value })} /></FormControl>
          <FormControl><FormLabel>Saldo inicial</FormLabel><CurrencyInput value={form.saldo_inicial} onValueChange={(value) => setForm({ ...form, saldo_inicial: value })} isDisabled={Boolean(editing && linkedCount(data, editing.id))} />{editing && linkedCount(data, editing.id) > 0 && <FormHelperText>Bloqueado porque a conta já possui movimentações.</FormHelperText>}</FormControl>
          <FormControl display="flex" alignItems="center" gap="3"><Switch isChecked={form.permite_saldo_negativo} onChange={(event) => setForm({ ...form, permite_saldo_negativo: event.target.checked })} /><FormLabel mb="0">Permitir saldo negativo</FormLabel></FormControl>
          <FormControl gridColumn={{ md: "1 / -1" }}><FormLabel>Observações</FormLabel><Textarea value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} /></FormControl>
        </SimpleGrid></ModalBody><ModalFooter gap="3"><Button variant="ghost" onClick={editor.onClose}>Cancelar</Button><Button type="submit" isLoading={saving}>Salvar conta</Button></ModalFooter></ModalContent>
      </Modal>

      <Modal isOpen={statementModal.isOpen} onClose={statementModal.onClose} size="2xl" scrollBehavior="inside"><ModalOverlay /><ModalContent><ModalHeader>Extrato · {selected?.nome}</ModalHeader><ModalCloseButton /><ModalBody><Stack spacing="2">{statement.map((item) => <Flex key={`${item.id}-${item.label}`} bg="panel2" borderRadius="xl" p="3" justify="space-between" align="center"><Box><Text fontWeight="700">{item.label}</Text><Text fontSize="xs" color="muted">{formatDateBR(item.date)}</Text></Box><Text fontWeight="800" color={item.value >= 0 ? "green.300" : "red.300"}>{item.value >= 0 ? "+ " : "- "}{formatCurrencyBRL(Math.abs(item.value))}</Text></Flex>)}{!statement.length && <Text color="muted" textAlign="center" py="8">Esta conta ainda não possui movimentações.</Text>}</Stack></ModalBody><ModalFooter><Button onClick={statementModal.onClose}>Fechar</Button></ModalFooter></ModalContent></Modal>

      <ConfirmModal isOpen={Boolean(action)} onClose={() => setAction(undefined)} onConfirm={() => void executeAction()} title={action === "delete" ? "Excluir conta" : action === "reactivate" ? "Reativar conta" : "Arquivar conta"} description={action === "delete" && selectedLinks ? "Esta conta possui movimentações financeiras vinculadas e não pode ser excluída. Você pode arquivá-la para preservar todo o histórico financeiro." : action === "delete" ? "Esta conta não possui movimentações e pode ser excluída definitivamente." : action === "reactivate" ? "A conta voltará a aparecer em novos lançamentos." : "A conta deixará de aparecer em novos lançamentos, mas continuará preservando saldos, histórico e relatórios."} itemName={selected?.nome} impact={action === "delete" && selectedLinks ? `${selectedLinks} vínculo(s) encontrado(s). A confirmação arquivará a conta.` : undefined} confirmLabel={action === "delete" && selectedLinks ? "Arquivar conta" : action === "delete" ? "Excluir definitivamente" : action === "reactivate" ? "Reativar" : "Arquivar"} colorScheme={action === "delete" && !selectedLinks ? "red" : action === "reactivate" ? "green" : "orange"} isLoading={saving} />
    </>
  );
}
