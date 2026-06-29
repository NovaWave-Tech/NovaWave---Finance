import { useMemo, useState, type FormEvent } from "react";
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
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
  Stat,
  StatLabel,
  StatNumber,
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
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Edit2,
  Eye,
  Plus,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { CurrencyInput } from "../../components/forms/CurrencyInput";
import type {
  FinanceRecord,
  FinanceTable,
  Profile,
} from "../../types/database";
import { calculateAvailableLimit } from "../../utils/calculations";
import { todayISO } from "../../utils/date";
import {
  formatCurrencyBRL,
  formatDateBR,
  formatPercent,
} from "../../utils/formatters";

type Data = Record<FinanceTable, FinanceRecord[]>;

type Props = {
  data: Data;
  profile?: Profile | null;
  save: (table: FinanceTable, item: FinanceRecord) => Promise<void>;
  remove: (table: FinanceTable, id: string) => Promise<void>;
};

type PurchaseForm = {
  cartao_id: string;
  categoria: string;
  descricao: string;
  observacao: string;
  valor_total: number;
  quantidade_parcelas: number;
  data_compra: string;
  primeira_competencia: string;
  estabelecimento: string;
  tags: string;
};

const panel = {
  bg: "panel",
  border: "1px solid",
  borderColor: "line",
  borderRadius: "2xl",
  boxShadow: "card",
} as const;

const emptyForm = (): PurchaseForm => ({
  cartao_id: "",
  categoria: "",
  descricao: "",
  observacao: "",
  valor_total: 0,
  quantidade_parcelas: 1,
  data_compra: todayISO(),
  primeira_competencia: todayISO().slice(0, 7),
  estabelecimento: "",
  tags: "",
});

const monthDate = (month: string, offset = 0) => {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const date = new Date(year, monthIndex + offset, 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const validMonth = (month: string) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(month) &&
  !Number.isNaN(new Date(`${month}-01T12:00:00`).getTime());

const splitInstallments = (total: number, count: number) => {
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  return Array.from(
    { length: count },
    (_, index) => (base + (index < remainder ? 1 : 0)) / 100,
  );
};

export function PurchaseFlow({ data, profile, save, remove }: Props) {
  const editor = useDisclosure();
  const details = useDisclosure();
  const toast = useToast();
  const [editing, setEditing] = useState<FinanceRecord>();
  const [selected, setSelected] = useState<FinanceRecord>();
  const [pendingAction, setPendingAction] = useState<
    "cancelada" | "estornada"
  >();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PurchaseForm>(emptyForm);

  const activeCards = data.cartoes.filter(
    (card) => (card.status ?? "ativa") === "ativa",
  );
  const categories = data.categorias_financeiras.filter(
    (category) =>
      (category.status ?? "ativa") === "ativa" &&
      ["despesa", "cartao"].includes(category.tipo ?? ""),
  );
  const selectedCard = activeCards.find((card) => card.id === form.cartao_id);
  const available = selectedCard
    ? calculateAvailableLimit(
        selectedCard,
        data.parcelas_cartao,
        data.compras_cartao,
      )
    : 0;
  const previousOpen = editing
    ? data.parcelas_cartao
        .filter(
          (item) =>
            item.compra_id === editing.id &&
            !["paga", "cancelada", "estornada"].includes(item.status ?? ""),
        )
        .reduce((total, item) => total + (item.valor ?? 0), 0)
    : 0;
  const limitBefore = available + previousOpen;
  const installmentValues = splitInstallments(
    Math.max(0, form.valor_total),
    Math.max(1, Math.trunc(form.quantidade_parcelas || 1)),
  );
  const monthlyInstallment = installmentValues[0] ?? 0;
  const salary = Number(
    profile?.monthly_salary ?? profile?.salario_previsto ?? 0,
  );
  const commitment = salary > 0 ? (monthlyInstallment / salary) * 100 : 0;
  const risk = commitment > 35 ? "red" : commitment > 20 ? "orange" : "green";

  const purchases = useMemo(
    () =>
      [...data.compras_cartao].sort((a, b) =>
        (b.data_compra ?? "").localeCompare(a.data_compra ?? ""),
      ),
    [data.compras_cartao],
  );

  const openEditor = (purchase?: FinanceRecord) => {
    setEditing(purchase);
    setForm(
      purchase
        ? {
            cartao_id: purchase.cartao_id ?? "",
            categoria: purchase.categoria ?? "",
            descricao: purchase.descricao ?? "",
            observacao: purchase.observacao ?? "",
            valor_total: purchase.valor_total ?? 0,
            quantidade_parcelas: purchase.quantidade_parcelas ?? 1,
            data_compra: purchase.data_compra ?? todayISO(),
            primeira_competencia:
              purchase.primeira_competencia?.slice(0, 7) ??
              purchase.data_compra?.slice(0, 7) ??
              todayISO().slice(0, 7),
            estabelecimento: purchase.estabelecimento ?? "",
            tags: purchase.tags?.join(", ") ?? "",
          }
        : emptyForm(),
    );
    editor.onOpen();
  };

  const invoiceDates = (card: FinanceRecord, competence: string) => {
    const year = Number(competence.slice(0, 4));
    const month = Number(competence.slice(5, 7));
    const lastDay = new Date(year, month, 0).getDate();
    return {
      closing: `${competence}-${String(Math.min(card.dia_fechamento ?? 1, lastDay)).padStart(2, "0")}`,
      due: `${competence}-${String(Math.min(card.dia_vencimento ?? 1, lastDay)).padStart(2, "0")}`,
    };
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const card = activeCards.find((item) => item.id === form.cartao_id);
      const count = Math.trunc(form.quantidade_parcelas);
      const category = categories.find((item) => item.nome === form.categoria);
      if (!card) throw new Error("Selecione um cartão ativo.");
      if (!category) throw new Error("Selecione uma categoria ativa.");
      if (!form.descricao.trim()) throw new Error("Informe a descrição da compra.");
      if (!Number.isFinite(form.valor_total) || form.valor_total <= 0)
        throw new Error("O valor total deve ser maior que zero.");
      if (!Number.isInteger(count) || count < 1 || count > 240)
        throw new Error("Informe uma quantidade entre 1 e 240 parcelas.");
      if (!validMonth(form.primeira_competencia))
        throw new Error("Informe uma competência inicial válida.");
      if (Number.isNaN(new Date(`${form.data_compra}T12:00:00`).getTime()))
        throw new Error("Informe uma data de compra válida.");
      if (form.valor_total > limitBefore)
        throw new Error("O cartão não possui limite suficiente para esta compra.");
      if (editing && editing.cartao_id !== card.id)
        throw new Error(
          "Para preservar as faturas existentes, o cartão de uma compra já criada não pode ser alterado.",
        );
      if (
        editing &&
        data.parcelas_cartao.some(
          (item) => item.compra_id === editing.id && item.status === "paga",
        )
      )
        throw new Error("Compras com parcelas pagas preservam o histórico e não podem ser editadas.");

      const purchaseId = editing?.id ?? crypto.randomUUID();
      const oldInstallments = data.parcelas_cartao.filter(
        (item) => item.compra_id === purchaseId,
      );
      const values = splitInstallments(form.valor_total, count);
      const specs = values.map((value, index) => ({
        competence: monthDate(form.primeira_competencia, index),
        value,
        number: index + 1,
      }));
      const affectedMonths = new Set([
        ...oldInstallments.map((item) => item.competencia?.slice(0, 7) ?? ""),
        ...specs.map((item) => item.competence),
      ]);
      const paidInvoiceMonth = specs.find((spec) =>
        data.faturas_cartao.some(
          (invoice) =>
            invoice.cartao_id === card.id &&
            invoice.status === "paga" &&
            invoice.competencia?.startsWith(spec.competence),
        ),
      )?.competence;
      if (paidInvoiceMonth)
        throw new Error(
          `A fatura de ${paidInvoiceMonth} já foi paga. Escolha outra competência inicial.`,
        );

      await save("compras_cartao", {
        id: purchaseId,
        cartao_id: card.id,
        categoria_id: category.id,
        categoria: category.nome,
        descricao: form.descricao.trim(),
        observacao: form.observacao.trim(),
        valor_total: form.valor_total,
        valor_parcela: values[0],
        quantidade_parcelas: count,
        data_compra: form.data_compra,
        primeira_competencia: `${form.primeira_competencia}-01`,
        estabelecimento: form.estabelecimento.trim(),
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        status: "ativa",
      });

      const invoiceByMonth = new Map<string, FinanceRecord>();
      for (const competence of affectedMonths) {
        if (!competence) continue;
        const invoice = data.faturas_cartao.find(
          (item) =>
            item.cartao_id === card.id &&
            item.competencia?.startsWith(competence),
        );
        const otherTotal = data.parcelas_cartao
          .filter(
            (item) =>
              item.compra_id !== purchaseId &&
              item.cartao_id === card.id &&
              item.competencia?.startsWith(competence) &&
              !["paga", "cancelada", "estornada"].includes(item.status ?? "") &&
              !["cancelada", "estornada"].includes(
                data.compras_cartao.find((purchase) => purchase.id === item.compra_id)
                  ?.status ?? "ativa",
              ),
          )
          .reduce((total, item) => total + (item.valor ?? 0), 0);
        const ownTotal = specs
          .filter((item) => item.competence === competence)
          .reduce((total, item) => total + item.value, 0);
        const invoiceTotal = otherTotal + ownTotal;
        if (!invoiceTotal) {
          if (invoice && invoice.status !== "paga") await remove("faturas_cartao", invoice.id);
          continue;
        }
        const dates = invoiceDates(card, competence);
        const savedInvoice: FinanceRecord = {
          id: invoice?.id ?? crypto.randomUUID(),
          cartao_id: card.id,
          competencia: `${competence}-01`,
          data_fechamento: dates.closing,
          data_vencimento: dates.due,
          valor: invoiceTotal,
          status: ["fechada", "atrasada"].includes(invoice?.status ?? "")
            ? invoice?.status
            : "aberta",
          conta_id: invoice?.conta_id ?? null,
        };
        await save("faturas_cartao", savedInvoice);
        invoiceByMonth.set(competence, savedInvoice);
      }

      for (const installment of oldInstallments)
        await remove("parcelas_cartao", installment.id);
      for (const spec of specs) {
        const invoice = invoiceByMonth.get(spec.competence);
        const dates = invoiceDates(card, spec.competence);
        await save("parcelas_cartao", {
          id: crypto.randomUUID(),
          compra_id: purchaseId,
          cartao_id: card.id,
          fatura_id: invoice?.id ?? null,
          numero: spec.number,
          total: count,
          valor: spec.value,
          competencia: `${spec.competence}-01`,
          data_vencimento: dates.due,
          status: "faturada",
        });
      }
      toast({
        title: editing ? "Compra atualizada" : "Compra parcelada criada",
        description: `${count} parcela(s) vinculada(s) às respectivas faturas.`,
        status: "success",
      });
      editor.onClose();
    } catch (error) {
      toast({
        title: "Não foi possível salvar a compra",
        description: (error as Error).message,
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!selected || !pendingAction) return;
    setSaving(true);
    try {
      const future = data.parcelas_cartao.filter(
        (item) => item.compra_id === selected.id && item.status !== "paga",
      );
      await save("compras_cartao", { ...selected, status: pendingAction });
      for (const installment of future)
        await save("parcelas_cartao", {
          ...installment,
          status: pendingAction,
        });
      const months = new Set(
        future.map((item) => item.competencia?.slice(0, 7) ?? ""),
      );
      for (const month of months) {
        if (!month) continue;
        const invoice = data.faturas_cartao.find(
          (item) =>
            item.cartao_id === selected.cartao_id &&
            item.competencia?.startsWith(month),
        );
        if (!invoice || invoice.status === "paga") continue;
        const remaining = data.parcelas_cartao
          .filter(
            (item) =>
              item.compra_id !== selected.id &&
              item.cartao_id === selected.cartao_id &&
              item.competencia?.startsWith(month) &&
              !["paga", "cancelada", "estornada"].includes(item.status ?? ""),
          )
          .reduce((total, item) => total + (item.valor ?? 0), 0);
        if (remaining) await save("faturas_cartao", { ...invoice, valor: remaining });
        else await remove("faturas_cartao", invoice.id);
      }
      toast({
        title: pendingAction === "cancelada" ? "Compra cancelada" : "Compra estornada",
        description: "Parcelas pagas foram preservadas e somente valores futuros deixaram de comprometer o limite.",
        status: "success",
      });
      setPendingAction(undefined);
      details.onClose();
    } catch (error) {
      toast({
        title: "Não foi possível atualizar a compra",
        description: (error as Error).message,
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const purchaseInstallments = selected
    ? data.parcelas_cartao
        .filter((item) => item.compra_id === selected.id)
        .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
    : [];
  const paidCount = purchaseInstallments.filter(
    (item) => item.status === "paga",
  ).length;
  const progress = purchaseInstallments.length
    ? (paidCount / purchaseInstallments.length) * 100
    : 0;
  const allOpen = data.parcelas_cartao.filter(
    (item) => !["paga", "cancelada", "estornada"].includes(item.status ?? ""),
  );
  const financed = purchases
    .filter((item) => item.status === "ativa")
    .reduce((total, item) => total + (item.valor_total ?? 0), 0);

  return (
    <Stack spacing="4">
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap="3" direction={{ base: "column", md: "row" }}>
        <Box>
          <Heading size="md">Compras parceladas</Heading>
          <Text color="muted" fontSize="sm">Compra, parcelas e faturas conectadas em um único fluxo.</Text>
        </Box>
        <Button leftIcon={<Plus size={16} />} onClick={() => openEditor()}>
          Nova compra
        </Button>
      </Flex>
      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing="3">
        <Box {...panel} p="4"><Stat><StatLabel>Valor financiado</StatLabel><StatNumber fontSize="xl">{formatCurrencyBRL(financed)}</StatNumber></Stat></Box>
        <Box {...panel} p="4"><Stat><StatLabel>Parcelas em aberto</StatLabel><StatNumber fontSize="xl">{allOpen.length}</StatNumber></Stat></Box>
        <Box {...panel} p="4"><Stat><StatLabel>Saldo parcelado</StatLabel><StatNumber fontSize="xl">{formatCurrencyBRL(allOpen.reduce((sum, item) => sum + (item.valor ?? 0), 0))}</StatNumber></Stat></Box>
        <Box {...panel} p="4"><Stat><StatLabel>Compras ativas</StatLabel><StatNumber fontSize="xl">{purchases.filter((item) => item.status === "ativa").length}</StatNumber></Stat></Box>
      </SimpleGrid>
      <TableContainer {...panel}>
        <Table>
          <Thead><Tr><Th>Compra</Th><Th>Cartão</Th><Th>Total</Th><Th>Parcelas</Th><Th>Status</Th><Th /></Tr></Thead>
          <Tbody>
            {purchases.map((purchase) => {
              const installments = data.parcelas_cartao.filter((item) => item.compra_id === purchase.id);
              const paid = installments.filter((item) => item.status === "paga").length;
              return (
                <Tr key={purchase.id}>
                  <Td><Text fontWeight="800">{purchase.descricao}</Text><Text fontSize="xs" color="muted">{purchase.estabelecimento || formatDateBR(purchase.data_compra)}</Text></Td>
                  <Td>{data.cartoes.find((card) => card.id === purchase.cartao_id)?.nome ?? "—"}</Td>
                  <Td>{formatCurrencyBRL(purchase.valor_total)}</Td>
                  <Td>{paid}/{purchase.quantidade_parcelas ?? installments.length} pagas</Td>
                  <Td><Badge colorScheme={purchase.status === "ativa" ? "green" : purchase.status === "estornada" ? "purple" : "red"}>{purchase.status}</Badge></Td>
                  <Td><HStack justify="flex-end"><IconButton aria-label="Ver compra" icon={<Eye size={16} />} variant="ghost" size="sm" onClick={() => { setSelected(purchase); details.onOpen(); }} /><IconButton aria-label="Editar compra" icon={<Edit2 size={16} />} variant="ghost" size="sm" isDisabled={purchase.status !== "ativa" || paid > 0} onClick={() => openEditor(purchase)} /></HStack></Td>
                </Tr>
              );
            })}
            {!purchases.length && <Tr><Td colSpan={6}><Text py="8" textAlign="center" color="muted">Nenhuma compra parcelada cadastrada.</Text></Td></Tr>}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal isOpen={editor.isOpen} onClose={editor.onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay backdropFilter="blur(8px)" />
        <ModalContent as="form" onSubmit={submit}>
          <ModalHeader>{editing ? "Editar compra parcelada" : "Nova compra parcelada"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing="6">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                <FormControl isRequired><FormLabel>Cartão</FormLabel><Select value={form.cartao_id} onChange={(event) => setForm({ ...form, cartao_id: event.target.value })}><option value="">Selecione</option>{activeCards.map((card) => <option key={card.id} value={card.id}>{card.nome} · {formatCurrencyBRL(calculateAvailableLimit(card, data.parcelas_cartao, data.compras_cartao))} disponíveis</option>)}</Select></FormControl>
                <FormControl isRequired><FormLabel>Categoria</FormLabel><Select value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })}><option value="">Selecione</option>{categories.map((category) => <option key={category.id}>{category.nome}</option>)}</Select></FormControl>
                <FormControl isRequired><FormLabel>Descrição</FormLabel><Input value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} /></FormControl>
                <FormControl><FormLabel>Estabelecimento</FormLabel><Input value={form.estabelecimento} onChange={(event) => setForm({ ...form, estabelecimento: event.target.value })} /></FormControl>
                <FormControl isRequired><FormLabel>Valor total</FormLabel><CurrencyInput value={form.valor_total} onValueChange={(value) => setForm({ ...form, valor_total: value })} /></FormControl>
                <FormControl isRequired><FormLabel>Quantidade de parcelas</FormLabel><Input type="number" min="1" max="240" value={form.quantidade_parcelas} onChange={(event) => setForm({ ...form, quantidade_parcelas: Number(event.target.value) })} /></FormControl>
                <FormControl isRequired><FormLabel>Data da compra</FormLabel><Input type="date" value={form.data_compra} onChange={(event) => setForm({ ...form, data_compra: event.target.value })} /></FormControl>
                <FormControl isRequired><FormLabel>Primeira fatura</FormLabel><Input type="month" value={form.primeira_competencia} onChange={(event) => setForm({ ...form, primeira_competencia: event.target.value })} /></FormControl>
                <FormControl><FormLabel>Tags</FormLabel><Input placeholder="trabalho, tecnologia" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} /></FormControl>
                <FormControl gridColumn={{ md: "1 / -1" }}><FormLabel>Observações</FormLabel><Textarea value={form.observacao} onChange={(event) => setForm({ ...form, observacao: event.target.value })} /></FormControl>
              </SimpleGrid>
              <Box {...panel} p={{ base: "4", md: "6" }} alignSelf="start">
                <Text fontSize="xs" fontWeight="900" color="brand.300">SIMULAÇÃO EM TEMPO REAL</Text>
                <Heading size="md" mt="2">{form.descricao || "Sua compra"}</Heading>
                <Text color="muted">{selectedCard?.nome ?? "Selecione um cartão"}</Text>
                <Divider my="5" />
                <Stack spacing="4">
                  <Flex justify="space-between"><Text color="muted">Compra</Text><Text fontWeight="800">{formatCurrencyBRL(form.valor_total)}</Text></Flex>
                  <Flex justify="space-between"><Text color="muted">Parcelamento</Text><Text fontWeight="800">{Math.max(1, form.quantidade_parcelas || 1)}x de {formatCurrencyBRL(monthlyInstallment)}</Text></Flex>
                  <Flex justify="space-between"><Text color="muted">Limite antes</Text><Text>{formatCurrencyBRL(limitBefore)}</Text></Flex>
                  <Flex justify="space-between"><Text color="muted">Limite restante</Text><Text color={limitBefore - form.valor_total < 0 ? "red.300" : "green.300"}>{formatCurrencyBRL(limitBefore - form.valor_total)}</Text></Flex>
                  <Divider />
                  <Flex justify="space-between" align="center"><Text color="muted">Comprometimento da renda</Text><Badge colorScheme={risk}>{salary ? formatPercent(commitment) : "salário não configurado"}</Badge></Flex>
                  <Progress value={Math.min(100, commitment)} colorScheme={risk} borderRadius="full" />
                  <Text fontSize="sm" color="muted">{salary ? `Esta compra comprometerá aproximadamente ${formatPercent(commitment)} da sua renda mensal.` : "Configure seu salário no Perfil para visualizar o comprometimento mensal."}</Text>
                  {form.quantidade_parcelas > 0 && validMonth(form.primeira_competencia) && <Text fontSize="sm"><CalendarDays size={15} style={{ display: "inline", marginRight: 6 }} />Última parcela em {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${monthDate(form.primeira_competencia, form.quantidade_parcelas - 1)}-01T12:00:00`))}.</Text>}
                </Stack>
              </Box>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter gap="3"><Button variant="ghost" onClick={editor.onClose}>Cancelar</Button><Button type="submit" isLoading={saving}>Salvar compra e gerar parcelas</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={details.isOpen} onClose={details.onClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay backdropFilter="blur(8px)" />
        <ModalContent>
          <ModalHeader>Detalhes da compra</ModalHeader><ModalCloseButton />
          <ModalBody>
            {selected && <Stack spacing="5">
              <Box><Heading size="md">{selected.descricao}</Heading><Text color="muted">{data.cartoes.find((card) => card.id === selected.cartao_id)?.nome} · {selected.categoria}</Text></Box>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing="3">
                <Box {...panel} p="3"><Text fontSize="xs" color="muted">Total</Text><Text fontWeight="900">{formatCurrencyBRL(selected.valor_total)}</Text></Box>
                <Box {...panel} p="3"><Text fontSize="xs" color="muted">Pagas</Text><Text fontWeight="900">{paidCount}/{purchaseInstallments.length}</Text></Box>
                <Box {...panel} p="3"><Text fontSize="xs" color="muted">Próxima</Text><Text fontWeight="900">{formatCurrencyBRL(purchaseInstallments.find((item) => !["paga", "cancelada", "estornada"].includes(item.status ?? ""))?.valor)}</Text></Box>
                <Box {...panel} p="3"><Text fontSize="xs" color="muted">Status</Text><Badge mt="1">{selected.status}</Badge></Box>
              </SimpleGrid>
              <Box><Flex justify="space-between" mb="2"><Text fontWeight="800">Progresso</Text><Text>{formatPercent(progress)}</Text></Flex><Progress value={progress} colorScheme="green" borderRadius="full" /></Box>
              <Stack spacing="2">
                {purchaseInstallments.map((installment) => <Flex key={installment.id} {...panel} p="3" align="center" gap="3"><Box color={installment.status === "paga" ? "green.300" : ["cancelada", "estornada"].includes(installment.status ?? "") ? "red.300" : "orange.300"}>{installment.status === "paga" ? <CheckCircle2 size={20} /> : <CreditCard size={20} />}</Box><Box flex="1"><Text fontWeight="800">{installment.numero}/{installment.total} · {formatDateBR(installment.competencia)}</Text><Text fontSize="xs" color="muted">Vencimento {formatDateBR(installment.data_vencimento)} · {installment.status}</Text></Box><Text fontWeight="800">{formatCurrencyBRL(installment.valor)}</Text></Flex>)}
              </Stack>
              {selected.observacao && <Text color="muted">{selected.observacao}</Text>}
            </Stack>}
          </ModalBody>
          <ModalFooter gap="3"><Button variant="ghost" onClick={details.onClose}>Fechar</Button>{selected?.status === "ativa" && <><Button colorScheme="orange" variant="outline" leftIcon={<XCircle size={16} />} onClick={() => setPendingAction("cancelada")}>Cancelar compra</Button><Button colorScheme="purple" variant="outline" leftIcon={<RotateCcw size={16} />} onClick={() => setPendingAction("estornada")}>Estornar</Button></>}</ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        onClose={() => setPendingAction(undefined)}
        onConfirm={() => void changeStatus()}
        title={pendingAction === "estornada" ? "Estornar compra" : "Cancelar compra"}
        description="Parcelas já pagas permanecerão no histórico. Parcelas futuras serão encerradas e deixarão de comprometer o limite."
        itemName={selected?.descricao}
        impact="As faturas abertas, o calendário, o dashboard e os relatórios serão recalculados."
        confirmLabel={pendingAction === "estornada" ? "Confirmar estorno" : "Confirmar cancelamento"}
        colorScheme={pendingAction === "estornada" ? "purple" : "orange"}
        isLoading={saving}
      />
    </Stack>
  );
}
