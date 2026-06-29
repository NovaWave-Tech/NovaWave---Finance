import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
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
  Select,
  SimpleGrid,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Tag,
  TagLabel,
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
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit2,
  FileBarChart,
  Plus,
  Repeat2,
  Tags,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type {
  FinanceRecord,
  FinanceTable,
  Profile,
} from "../../types/database";
import { formatCurrency } from "../../utils/formatters";
import { formatDateBR, todayISO } from "../../utils/date";
import { calculateFinancialSnapshot } from "../../services/financialEngine";
import {
  CALENDAR_SKIP_TYPE,
  calendarExceptionKey,
  isCalendarSkipEvent,
} from "../../services/calendarExceptions";
import { CurrencyInput } from "../../components/forms/CurrencyInput";
import { calculateAvailableLimit } from "../../utils/calculations";
import { buildFinancialCalendar } from "../../services/calendarService";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { DateInputBR } from "../../components/forms/DateInputBR";
import { PurchaseFlow } from "./PurchaseFlow";

type Data = Record<FinanceTable, FinanceRecord[]>;
type ModulePage =
  | "cartoes"
  | "investimentos"
  | "calendario"
  | "recorrentes"
  | "categorias"
  | "relatorios";
type Field = {
  key: keyof FinanceRecord;
  label: string;
  type?: "text" | "number" | "date" | "color" | "select" | "textarea";
  required?: boolean;
  options?: string[];
};
const panel = {
  bg: "panel",
  border: "1px solid",
  borderColor: "line",
  borderRadius: "2xl",
  boxShadow: "card",
} as const;
const numberFields = new Set([
  "valor",
  "limite",
  "dia_fechamento",
  "dia_vencimento",
  "valor_total",
  "quantidade_parcelas",
  "valor_parcela",
  "valor_investido",
]);
const moneyFields = new Set([
  "valor",
  "limite",
  "valor_total",
  "valor_parcela",
  "valor_investido",
]);

function Editor({
  title,
  fields,
  item,
  onSave,
  onClose,
}: {
  title: string;
  fields: Field[];
  item?: FinanceRecord;
  onSave: (item: FinanceRecord) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((field) => [
        field.key,
        String(item?.[field.key] ?? (field.type === "date" ? todayISO() : "")),
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: FinanceRecord = { id: item?.id ?? crypto.randomUUID() };
      fields.forEach((field) => {
        const value = form[field.key] ?? "";
        (payload as unknown as Record<string, unknown>)[field.key] =
          numberFields.has(field.key) ? Number(value) : value;
      });
      await onSave(payload);
      toast({ title: "Registro salvo", status: "success" });
      onClose();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: (error as Error).message,
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit}>
      <ModalHeader>
        {item ? "Editar" : "Novo"} {title}
      </ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <Text color="muted" fontSize="sm" mb="5">
          Preencha os dados abaixo. Valores são salvos em Real brasileiro.
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing="16px">
          {fields.map((field) => (
            <FormControl key={field.key} isRequired={field.required}>
              <FormLabel fontSize="sm">{field.label}</FormLabel>
              {moneyFields.has(field.key) ? (
                <CurrencyInput
                  value={Number(form[field.key]) || 0}
                  onValueChange={(value) =>
                    setForm({ ...form, [field.key]: String(value) })
                  }
                />
              ) : field.type === "select" ? (
                <Select
                  value={form[field.key]}
                  onChange={(e) =>
                    setForm({ ...form, [field.key]: e.target.value })
                  }
                >
                  <option value="">Selecione</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option.includes("|") ? option.split("|")[1] : option}
                    </option>
                  ))}
                </Select>
              ) : field.type === "date" ? (
                <DateInputBR
                  value={form[field.key]}
                  onChange={(e) =>
                    setForm({ ...form, [field.key]: e.target.value })
                  }
                />
              ) : field.type === "textarea" ? (
                <Textarea
                  value={form[field.key]}
                  onChange={(e) =>
                    setForm({ ...form, [field.key]: e.target.value })
                  }
                />
              ) : (
                <Input
                  type={field.type || "text"}
                  step={field.type === "number" ? "1" : undefined}
                  min={field.type === "number" ? "0" : undefined}
                  value={form[field.key]}
                  onChange={(e) =>
                    setForm({ ...form, [field.key]: e.target.value })
                  }
                />
              )}
            </FormControl>
          ))}
        </SimpleGrid>
      </ModalBody>
      <ModalFooter gap="10px">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={saving}>
          Salvar
        </Button>
      </ModalFooter>
    </form>
  );
}

function EntitySection({
  title,
  singular,
  icon,
  items,
  fields,
  columns,
  onSave,
  onRemove,
  filters,
}: {
  title: string;
  singular: string;
  icon: ReactNode;
  items: FinanceRecord[];
  fields: Field[];
  columns: {
    key: string;
    label: string;
    format?: (item: FinanceRecord) => ReactNode;
  }[];
  onSave: (item: FinanceRecord) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  filters?: { key: string; label: string; options?: string[] }[];
}) {
  const modal = useDisclosure();
  const [editing, setEditing] = useState<FinanceRecord>();
  const [filter, setFilter] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<FinanceRecord>();
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const open = (item?: FinanceRecord) => {
    setEditing(item);
    modal.onOpen();
  };
  const visible = items.filter(
    (item) =>
      !filters?.some(
        (field) =>
          filter[field.key] &&
          String(
            (item as unknown as Record<string, unknown>)[field.key] ?? "",
          ) !== filter[field.key],
      ),
  );
  const remove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onRemove(pendingDelete.id);
      toast({ title: "Registro excluído", status: "success" });
      setPendingDelete(undefined);
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: (error as Error).message,
        status: "error",
      });
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Box {...panel} overflow="hidden">
      <Flex
        p="20px"
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap="12px"
      >
        <Flex align="center" gap="10px">
          <Box color="brand.300">{icon}</Box>
          <Heading size="md">{title}</Heading>
        </Flex>
        <Flex gap="8px" wrap="wrap">
          {filters?.map((field) => (
            <Select
              key={field.key}
              size="sm"
              w="180px"
              value={filter[field.key] ?? ""}
              onChange={(e) =>
                setFilter({ ...filter, [field.key]: e.target.value })
              }
            >
              <option value="">{field.label}: todos</option>
              {field.options?.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          ))}
          <Button
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => open()}
          >
            Novo
          </Button>
        </Flex>
      </Flex>
      <TableContainer>
        <Table>
          <Thead>
            <Tr>
              {columns.map((column) => (
                <Th key={column.key}>{column.label}</Th>
              ))}
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {visible.map((item) => (
              <Tr key={item.id}>
                {columns.map((column) => (
                  <Td key={column.key}>
                    {column.format
                      ? column.format(item)
                      : String(
                          (item as unknown as Record<string, unknown>)[
                            column.key
                          ] ?? "—",
                        )}
                  </Td>
                ))}
                <Td>
                  <Flex justify="flex-end">
                    <IconButton
                      aria-label="Editar"
                      icon={<Edit2 size={16} />}
                      variant="ghost"
                      size="sm"
                      onClick={() => open(item)}
                    />
                    <IconButton
                      aria-label="Excluir"
                      icon={<Trash2 size={16} />}
                      variant="ghost"
                      colorScheme="red"
                      size="sm"
                      onClick={() => setPendingDelete(item)}
                    />
                  </Flex>
                </Td>
              </Tr>
            ))}
            {!visible.length && (
              <Tr>
                <Td colSpan={columns.length + 1}>
                  <Center py="12" color="muted">
                    Nenhum registro cadastrado.
                  </Center>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
      <Modal isOpen={modal.isOpen} onClose={modal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <Editor
            title={singular}
            fields={fields}
            item={editing}
            onSave={onSave}
            onClose={modal.onClose}
          />
        </ModalContent>
      </Modal>
      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(undefined)}
        onConfirm={() => void remove()}
        title={`Excluir ${singular}`}
        description="Essa ação remove o registro real do banco e recalcula os módulos conectados."
        itemName={pendingDelete?.descricao || pendingDelete?.nome || pendingDelete?.titulo}
        impact={
          title.toLowerCase().includes("compra")
            ? "Esta compra pode possuir parcelas vinculadas. Confira as parcelas futuras após a exclusão."
            : "Se existirem dados relacionados, eles podem mudar os totais, faturas, metas ou relatórios."
        }
        confirmLabel="Confirmar exclusão"
        isLoading={deleting}
      />
    </Box>
  );
}

const cardFields: Field[] = [
  { key: "nome", label: "Nome do cartão", required: true },
  { key: "banco", label: "Banco", required: true },
  { key: "limite", label: "Limite", type: "number", required: true },
  {
    key: "dia_fechamento",
    label: "Dia de fechamento",
    type: "number",
    required: true,
  },
  {
    key: "dia_vencimento",
    label: "Dia de vencimento",
    type: "number",
    required: true,
  },
  { key: "cor", label: "Cor", type: "color", required: true },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    options: ["ativa", "inativa"],
  },
];
const investmentFields: Field[] = [
  { key: "nome", label: "Nome", required: true },
  {
    key: "tipo",
    label: "Tipo",
    type: "select",
    required: true,
    options: ["CDB", "Tesouro Direto", "Ações", "Fundo", "Cripto", "Outros"],
  },
  {
    key: "valor_investido",
    label: "Valor investido",
    type: "number",
    required: true,
  },
  { key: "data_investimento", label: "Data", type: "date", required: true },
  { key: "instituicao", label: "Instituição", required: true },
  { key: "observacao", label: "Observação", type: "textarea" },
];
const investmentMovementFields: Field[] = [
  {
    key: "investimento_id",
    label: "Investimento",
    type: "select",
    required: true,
  },
  {
    key: "tipo",
    label: "Movimentação",
    type: "select",
    required: true,
    options: ["aplicacao", "resgate", "rendimento", "ajuste"],
  },
  { key: "valor", label: "Valor", type: "number", required: true },
  { key: "data", label: "Data", type: "date", required: true },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    options: ["pendente", "confirmada", "cancelada"],
  },
  { key: "observacao", label: "Observação", type: "textarea" },
];
const eventFields: Field[] = [
  { key: "titulo", label: "Título", required: true },
  {
    key: "tipo",
    label: "Tipo",
    type: "select",
    required: true,
    options: [
      "Salário",
      "Conta fixa",
      "Assinatura",
      "Vencimento de cartão",
      "Fechamento de cartão",
      "Aporte planejado",
      "Conta recorrente",
    ],
  },
  { key: "data", label: "Data", type: "date", required: true },
  { key: "valor", label: "Valor", type: "number" },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    options: ["pendente", "pago"],
  },
  { key: "observacao", label: "Observação", type: "textarea" },
];
const recurringFields: Field[] = [
  { key: "descricao", label: "Descrição", required: true },
  { key: "valor", label: "Valor", type: "number", required: true },
  { key: "categoria", label: "Categoria", required: true },
  {
    key: "tipo",
    label: "Tipo",
    type: "select",
    required: true,
    options: ["despesa", "receita", "assinatura", "aporte", "investimento"],
  },
  {
    key: "dia_vencimento",
    label: "Dia de vencimento",
    type: "number",
    required: true,
  },
  {
    key: "forma_pagamento",
    label: "Forma de pagamento",
    type: "select",
    options: [
      "Pix",
      "Dinheiro",
      "Débito",
      "Crédito",
      "Boleto",
      "Transferência",
    ],
    required: true,
  },
  { key: "observacao", label: "Observação", type: "textarea" },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    options: ["ativa", "pausada", "cancelada"],
  },
];
const categoryFields: Field[] = [
  { key: "nome", label: "Nome", required: true },
  {
    key: "tipo",
    label: "Tipo",
    type: "select",
    required: true,
    options: [
      "receita",
      "despesa",
      "cartao",
      "investimento",
      "meta",
      "transferencia",
    ],
  },
  { key: "cor", label: "Cor", type: "color", required: true },
  { key: "icone", label: "Ícone Lucide" },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    options: ["ativa", "inativa"],
  },
];

function InvoicesPanel({
  data,
  save,
}: {
  data: Data;
  save: (table: FinanceTable, item: FinanceRecord) => Promise<void>;
}) {
  const toast = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<
    | {
        cartao_id: string;
        competencia: string;
        valor: number;
        parcelas: FinanceRecord[];
      }
    | undefined
  >();
  const [paying, setPaying] = useState(false);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const groups = Object.values(
    data.parcelas_cartao
      .filter(
        (x) =>
          x.status !== "paga" &&
          (!x.compra_id ||
            !["cancelada", "estornada"].includes(
              data.compras_cartao.find((p) => p.id === x.compra_id)?.status ??
                "ativa",
            )),
      )
      .reduce<
        Record<
          string,
          {
            cartao_id: string;
            competencia: string;
            valor: number;
            parcelas: FinanceRecord[];
          }
        >
      >((acc, item) => {
        const key = `${item.cartao_id}-${item.competencia?.slice(0, 7)}`;
        acc[key] ??= {
          cartao_id: item.cartao_id ?? "",
          competencia: item.competencia ?? "",
          valor: 0,
          parcelas: [],
        };
        acc[key].valor += item.valor ?? 0;
        acc[key].parcelas.push(item);
        return acc;
      }, {}),
  ).sort((a, b) => a.competencia.localeCompare(b.competencia));
  const pay = async (group: (typeof groups)[number]) => {
    setPaying(true);
    const card = data.cartoes.find((x) => x.id === group.cartao_id);
    const competence = group.competencia.slice(0, 7);
    const due = `${competence}-${String(card?.dia_vencimento ?? 1).padStart(2, "0")}`;
    try {
      if (data.contas_financeiras.length && !paymentAccountId)
        throw new Error("Selecione a conta usada para pagar a fatura.");
      const invoiceId =
        data.faturas_cartao.find(
          (x) =>
            x.cartao_id === group.cartao_id &&
            x.competencia?.startsWith(competence),
        )?.id ?? crypto.randomUUID();
      await save("faturas_cartao", {
        id: invoiceId,
        cartao_id: group.cartao_id,
        conta_id: paymentAccountId || null,
        competencia: `${competence}-01`,
        data_fechamento: `${competence}-01`,
        data_vencimento: due,
        valor: group.valor,
        status: "paga",
        paga_em: new Date().toISOString(),
      });
      for (const installment of group.parcelas)
        await save("parcelas_cartao", { ...installment, status: "paga" });
      await save("despesas", {
        id:
          data.despesas.find((item) => item.origem === `fatura:${invoiceId}`)
            ?.id ?? crypto.randomUUID(),
        descricao: `Pagamento da fatura ${card?.nome ?? ""}`,
        valor: group.valor,
        categoria: "Cartão de crédito",
        data: todayISO(),
        forma_pagamento: "Transferência",
        status: "pago",
        tipo: "pagamento_cartao",
        conta_id: paymentAccountId || null,
        origem: `fatura:${invoiceId}`,
      });
      toast({ title: "Fatura paga e saldo atualizado", status: "success" });
      setSelectedInvoice(undefined);
    } catch (error) {
      toast({
        title: "Erro ao pagar fatura",
        description: (error as Error).message,
        status: "error",
      });
    } finally {
      setPaying(false);
    }
  };
  return (
    <Box {...panel} overflow="hidden">
      <Flex p="20px" justify="space-between">
        <Box>
          <Heading size="md">Faturas abertas</Heading>
          <Text color="muted" fontSize="sm">
            O saldo só é reduzido quando a fatura é paga.
          </Text>
        </Box>
        <Badge colorScheme="orange">{groups.length} abertas</Badge>
      </Flex>
      <TableContainer>
        <Table>
          <Thead>
            <Tr>
              <Th>Cartão</Th>
              <Th>Competência</Th>
              <Th isNumeric>Valor</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {groups.map((group) => (
              <Tr key={`${group.cartao_id}-${group.competencia}`}>
                <Td>
                  {data.cartoes.find((x) => x.id === group.cartao_id)?.nome ??
                    "Cartão"}
                </Td>
                <Td>{group.competencia.slice(0, 7)}</Td>
                <Td isNumeric>{formatCurrency(group.valor)}</Td>
                <Td textAlign="right">
                  <Button
                    size="sm"
                    onClick={() => {
                      setPaymentAccountId(
                        data.faturas_cartao.find(
                          (item) =>
                            item.cartao_id === group.cartao_id &&
                            item.competencia?.startsWith(
                              group.competencia.slice(0, 7),
                            ),
                        )?.conta_id ??
                          (data.contas_financeiras.length === 1
                            ? data.contas_financeiras[0].id
                            : ""),
                      );
                      setSelectedInvoice(group);
                    }}
                  >
                    Pagar fatura
                  </Button>
                </Td>
              </Tr>
            ))}
            {!groups.length && (
              <Tr>
                <Td colSpan={4}>
                  <Center py="10" color="muted">
                    Nenhuma fatura em aberto.
                  </Center>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
      <ConfirmModal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(undefined)}
        onConfirm={() => selectedInvoice && void pay(selectedInvoice)}
        title="Pagar fatura"
        description="Ao confirmar, a fatura será marcada como paga, as parcelas serão baixadas e uma despesa de pagamento de cartão será registrada."
        itemName={
          selectedInvoice
            ? `${data.cartoes.find((x) => x.id === selectedInvoice.cartao_id)?.nome ?? "Cartão"} · ${formatCurrency(selectedInvoice.valor)}`
            : undefined
        }
        impact="Essa ação afeta saldo real, limite disponível, relatórios e calendário financeiro."
        confirmLabel="Confirmar pagamento"
        colorScheme="green"
        isLoading={paying}
      >
        {data.contas_financeiras.length > 0 && (
          <FormControl mt="4" isRequired>
            <FormLabel>Conta de pagamento</FormLabel>
            <Select
              value={paymentAccountId}
              onChange={(event) => setPaymentAccountId(event.target.value)}
            >
              <option value="">Selecione</option>
              {data.contas_financeiras
                .filter((account) => (account.status ?? "ativa") === "ativa")
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.nome}
                  </option>
                ))}
            </Select>
          </FormControl>
        )}
      </ConfirmModal>
    </Box>
  );
}

function Cards({
  data,
  profile,
  save,
  remove,
}: {
  data: Data;
  profile?: Profile | null;
  save: (table: FinanceTable, item: FinanceRecord) => Promise<void>;
  remove: (table: FinanceTable, id: string) => Promise<void>;
}) {
  const current = new Date().toISOString().slice(0, 7);
  const activeCards = data.cartoes.filter(
    (x) => (x.status ?? "ativa") === "ativa",
  );
  const totalLimit = activeCards.reduce((s, x) => s + (x.limite ?? 0), 0);
  const availableLimit = activeCards.reduce(
    (total, card) =>
      total +
      calculateAvailableLimit(card, data.parcelas_cartao, data.compras_cartao),
    0,
  );
  const currentInvoice = data.parcelas_cartao
    .filter(
      (x) =>
        x.competencia?.startsWith(current) &&
        !["paga", "cancelada", "estornada"].includes(x.status ?? ""),
    )
    .reduce((s, x) => s + (x.valor ?? 0), 0);
  const usedLimit = Math.max(0, totalLimit - availableLimit);
  const nextInvoice = data.faturas_cartao
    .filter(
      (invoice) =>
        !["paga", "cancelada"].includes(invoice.status ?? "") &&
        (invoice.competencia ?? "") > `${current}-01`,
    )
    .sort((a, b) =>
      (a.competencia ?? "").localeCompare(b.competencia ?? ""),
    )[0];
  return (
    <Stack spacing="18px">
      <SimpleGrid columns={{ base: 1, sm: 2, xl: 5 }} spacing="14px">
        {[
          ["Limite total", totalLimit],
          ["Limite utilizado", usedLimit],
          ["Fatura atual", currentInvoice],
          ["Próxima fatura", nextInvoice?.valor ?? 0],
          ["Limite disponível", availableLimit],
        ].map(([label, value]) => (
          <Box key={String(label)} {...panel} p="20px">
            <Stat>
              <StatLabel>{label}</StatLabel>
              <StatNumber>{formatCurrency(value as number)}</StatNumber>
              <StatHelpText>Dados dos cartões cadastrados</StatHelpText>
            </Stat>
          </Box>
        ))}
      </SimpleGrid>
      <Box {...panel} p="4">
        <Flex justify="space-between" mb="2">
          <Text fontWeight="800">Utilização consolidada do limite</Text>
          <Text color="muted">
            {totalLimit ? ((usedLimit / totalLimit) * 100).toFixed(1) : "0.0"}%
          </Text>
        </Flex>
        <Box h="10px" borderRadius="full" bg="whiteAlpha.100" overflow="hidden">
          <Box
            h="full"
            w={`${Math.min(100, totalLimit ? (usedLimit / totalLimit) * 100 : 0)}%`}
            bg={usedLimit / Math.max(1, totalLimit) >= 0.8 ? "red.400" : "brand.400"}
            transition="width .25s ease"
          />
        </Box>
      </Box>
      <EntitySection
        title="Meus cartões"
        singular="cartão"
        icon={<CreditCard />}
        items={data.cartoes}
        fields={cardFields}
        columns={[
          { key: "nome", label: "Cartão" },
          { key: "banco", label: "Banco" },
          {
            key: "limite",
            label: "Limite",
            format: (x) => formatCurrency(x.limite),
          },
          {
            key: "dia_vencimento",
            label: "Vencimento",
            format: (x) => `Dia ${x.dia_vencimento}`,
          },
        ]}
        onSave={(x) => save("cartoes", x)}
        onRemove={(id) => remove("cartoes", id)}
      />
      <PurchaseFlow data={data} profile={profile} save={save} remove={remove} />
      <InvoicesPanel data={data} save={save} />
    </Stack>
  );
}

function Recurring({
  data,
  save,
  remove,
}: {
  data: Data;
  save: (table: FinanceTable, item: FinanceRecord) => Promise<void>;
  remove: (table: FinanceTable, id: string) => Promise<void>;
}) {
  const toast = useToast();
  const generate = async () => {
    const now = new Date(),
      key = now.toISOString().slice(0, 7);
    const pending = data.contas_recorrentes.filter(
      (x) =>
        x.ativa !== false &&
        (x.status ?? "ativa") === "ativa" &&
        !x.ultima_geracao?.startsWith(key),
    );
    try {
      for (const account of pending) {
        const day = Math.min(
          account.dia_vencimento ?? 1,
          new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
        );
        const date = `${key}-${String(day).padStart(2, "0")}`;
        const common = {
          id: crypto.randomUUID(),
          descricao: account.descricao,
          valor: account.valor,
          categoria: account.categoria,
          data: date,
          origem: `recorrencia:${account.id}`,
          competencia: `${key}-01`,
          observacao: `Gerada automaticamente da recorrência ${account.descricao}`,
        };
        if (account.tipo === "receita")
          await save("receitas", {
            ...common,
            forma_recebimento: account.forma_pagamento,
            status: "pendente",
            tipo: "recorrente",
            recorrente: true,
          });
        else if (account.tipo === "aporte") {
          if (!account.meta_id)
            throw new Error(
              `Vincule uma meta à recorrência “${account.descricao}”.`,
            );
          await save("aportes_metas", {
            id: crypto.randomUUID(),
            meta_id: account.meta_id,
            valor: account.valor,
            data: date,
            status: "pendente",
            origem: `recorrencia:${account.id}`,
            competencia: `${key}-01`,
          });
        } else if (account.tipo === "investimento") {
          if (!account.investimento_id)
            throw new Error(
              `Vincule um investimento à recorrência “${account.descricao}”.`,
            );
          await save("movimentacoes_investimentos", {
            id: crypto.randomUUID(),
            investimento_id: account.investimento_id,
            tipo: "aplicacao",
            valor: account.valor,
            data: date,
            status: "pendente",
            origem: `recorrencia:${account.id}`,
            competencia: `${key}-01`,
          });
        } else
          await save("despesas", {
            ...common,
            forma_pagamento: account.forma_pagamento,
            status: "pendente",
            tipo: account.tipo === "assinatura" ? "recorrente" : "recorrente",
          });
        await save("contas_recorrentes", { ...account, ultima_geracao: date });
      }
      toast({
        title: pending.length
          ? `${pending.length} despesa(s) gerada(s)`
          : "Tudo já foi gerado neste mês",
        status: "success",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar recorrências",
        description: (error as Error).message,
        status: "error",
      });
    }
  };
  return (
    <Stack spacing="4">
      <Flex justify="space-between" align="center">
        <Box>
          <Heading size="lg">Contas recorrentes</Heading>
          <Text color="muted">
            Gere receitas, despesas, aportes e investimentos previstos sem
            duplicidade.
          </Text>
        </Box>
        <Button
          leftIcon={<Repeat2 size={17} />}
          onClick={() => void generate()}
        >
          Gerar previsões do mês
        </Button>
      </Flex>
      <EntitySection
        title="Contas cadastradas"
        singular="conta"
        icon={<Repeat2 />}
        items={data.contas_recorrentes}
        fields={[
          ...recurringFields.map((field) =>
            field.key === "categoria"
              ? {
                  ...field,
                  type: "select" as const,
                  options: data.categorias_financeiras
                    .filter((x) => (x.status ?? "ativa") === "ativa")
                    .map((x) => x.nome ?? "")
                    .filter(Boolean),
                }
              : field,
          ),
          {
            key: "meta_id",
            label: "Meta (para aporte)",
            type: "select",
            options: data.metas_financeiras
              .filter((x) => (x.status ?? "em_andamento") === "em_andamento")
              .map((x) => `${x.id}|${x.nome}`),
          },
          {
            key: "investimento_id",
            label: "Investimento (para aplicação)",
            type: "select",
            options: data.investimentos.map((x) => `${x.id}|${x.nome}`),
          },
        ]}
        columns={[
          { key: "descricao", label: "Conta" },
          { key: "categoria", label: "Categoria" },
          {
            key: "dia_vencimento",
            label: "Vencimento",
            format: (x) => `Dia ${x.dia_vencimento}`,
          },
          {
            key: "valor",
            label: "Valor",
            format: (x) => formatCurrency(x.valor),
          },
          {
            key: "ultima_geracao",
            label: "Última geração",
            format: (x) => formatDateBR(x.ultima_geracao??undefined),
          },
        ]}
        onSave={(x) => {
          if (x.meta_id?.includes("|")) x.meta_id = x.meta_id.split("|")[0];
          if (x.investimento_id?.includes("|"))
            x.investimento_id = x.investimento_id.split("|")[0];
          x.ativa = x.ativa ?? true;
          x.status = x.status ?? "ativa";
          const categoryType =
            x.tipo === "receita"
              ? "receita"
              : x.tipo === "aporte"
                ? "meta"
                : x.tipo === "investimento"
                  ? "investimento"
                  : "despesa";
          x.categoria_id = data.categorias_financeiras.find(
            (category) =>
              category.nome === x.categoria && category.tipo === categoryType,
          )?.id;
          if (!x.categoria_id)
            throw new Error(
              `Selecione uma categoria ativa do tipo ${categoryType}.`,
            );
          return save("contas_recorrentes", x);
        }}
        onRemove={(id) => remove("contas_recorrentes", id)}
      />
    </Stack>
  );
}

function Reports({ data, profile }: { data: Data; profile?: Profile | null }) {
  const snapshot = calculateFinancialSnapshot(data, new Date(), profile);
  const biggest = [...snapshot.categories].sort((a, b) => b.value - a.value)[0];
  const activePurchases = data.compras_cartao.filter(
    (item) => item.status === "ativa",
  );
  const openInstallments = data.parcelas_cartao.filter(
    (item) =>
      !["paga", "cancelada", "estornada"].includes(item.status ?? ""),
  );
  const paidInstallments = data.parcelas_cartao.filter(
    (item) => item.status === "paga",
  );
  const biggestPurchase = [...data.compras_cartao].sort(
    (a, b) => (b.valor_total ?? 0) - (a.valor_total ?? 0),
  )[0];
  const cardTotals = data.cartoes
    .map((card) => ({
      card,
      value: openInstallments
        .filter((item) => item.cartao_id === card.id)
        .reduce((total, item) => total + (item.valor ?? 0), 0),
    }))
    .sort((a, b) => b.value - a.value);
  const purchaseCategoryTotals = Object.entries(
    activePurchases.reduce<Record<string, number>>((totals, purchase) => {
      const category = purchase.categoria ?? "Sem categoria";
      totals[category] = (totals[category] ?? 0) + (purchase.valor_total ?? 0);
      return totals;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  return (
    <Stack spacing="18px">
      <SimpleGrid columns={{ base: 1, md: 3, xl: 6 }} spacing="14px">
        {[
          ["Saldo real", snapshot.realBalance],
          ["Saldo previsto", snapshot.projectedBalance],
          ["Receitas recebidas", snapshot.received],
          ["Despesas pagas", snapshot.paidExpenses],
          ["Dinheiro comprometido", snapshot.committedMoney],
          ["Patrimônio", snapshot.patrimony],
        ].map(([label, value]) => (
          <Box {...panel} p="18px" key={String(label)}>
            <Text color="muted" fontSize="sm">
              {label}
            </Text>
            <Heading size="sm" mt="2">
              {formatCurrency(Number(value))}
            </Heading>
          </Box>
        ))}
      </SimpleGrid>
      <Box {...panel} p="22px">
        <Heading size="sm">Indicadores de compras parceladas</Heading>
        <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} spacing="4" mt="4">
          {[
            ["Compras ativas", String(activePurchases.length)],
            ["Valor financiado", formatCurrency(activePurchases.reduce((total, item) => total + (item.valor_total ?? 0), 0))],
            ["Parcelas abertas", String(openInstallments.length)],
            ["Parcelas pagas", String(paidInstallments.length)],
            ["Maior compra", biggestPurchase?.descricao ?? "—"],
            ["Cartão mais utilizado", cardTotals[0]?.card.nome ?? "—"],
          ].map(([label, value]) => (
            <Box key={label}>
              <Text color="muted" fontSize="xs">{label}</Text>
              <Text fontWeight="800" mt="1">{value}</Text>
            </Box>
          ))}
        </SimpleGrid>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing="6" mt="6">
          <Box>
            <Text fontWeight="800" mb="2">Distribuição por categoria</Text>
            <Stack spacing="2">
              {purchaseCategoryTotals.slice(0, 5).map(([category, value]) => (
                <Flex key={category} justify="space-between"><Text color="muted">{category}</Text><Text fontWeight="700">{formatCurrency(value)}</Text></Flex>
              ))}
              {!purchaseCategoryTotals.length && <Text color="muted">Sem compras ativas.</Text>}
            </Stack>
          </Box>
          <Box>
            <Text fontWeight="800" mb="2">Distribuição por cartão</Text>
            <Stack spacing="2">
              {cardTotals.filter((item) => item.value > 0).slice(0, 5).map((item) => (
                <Flex key={item.card.id} justify="space-between"><Text color="muted">{item.card.nome}</Text><Text fontWeight="700">{formatCurrency(item.value)}</Text></Flex>
              ))}
              {!cardTotals.some((item) => item.value > 0) && <Text color="muted">Sem parcelas abertas.</Text>}
            </Stack>
          </Box>
        </SimpleGrid>
      </Box>
      <Box {...panel} p="22px">
        <Flex justify="space-between">
          <Box>
            <Heading size="sm">Histórico financeiro conectado</Heading>
            <Text color="muted" fontSize="sm">
              Receitas recebidas, despesas e faturas efetivamente pagas.
            </Text>
          </Box>
          <Badge colorScheme="blue">6 meses</Badge>
        </Flex>
        <TableContainer mt="4">
          <Table>
            <Thead>
              <Tr>
                <Th>Mês</Th>
                <Th isNumeric>Receitas</Th>
                <Th isNumeric>Saídas</Th>
                <Th isNumeric>Faturas</Th>
                <Th isNumeric>Saldo acumulado</Th>
                <Th isNumeric>Patrimônio</Th>
              </Tr>
            </Thead>
            <Tbody>
              {snapshot.timeline.map((item) => (
                <Tr key={item.key}>
                  <Td>{item.label}</Td>
                  <Td isNumeric>{formatCurrency(item.receitas)}</Td>
                  <Td isNumeric>{formatCurrency(item.despesas)}</Td>
                  <Td isNumeric>{formatCurrency(item.faturas)}</Td>
                  <Td isNumeric>{formatCurrency(item.saldo)}</Td>
                  <Td isNumeric>{formatCurrency(item.patrimonio)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing="4">
        <Box {...panel} p="22px">
          <Text color="muted">Maior categoria do mês</Text>
          <Heading size="md" mt="2">
            {biggest ? biggest.name : "Nenhuma despesa paga"}
          </Heading>
          <Text color="red.300" fontWeight="700">
            {formatCurrency(biggest?.value ?? 0)}
          </Text>
        </Box>
        <Box {...panel} p="22px">
          <Text color="muted">Comprometimento da renda</Text>
          <Heading size="md" mt="2">
            {snapshot.incomeCommitment.toFixed(1)}%
          </Heading>
          <Text color="muted" fontSize="sm">
            Inclui despesas pendentes e faturas abertas.
          </Text>
        </Box>
      </SimpleGrid>
    </Stack>
  );
}

const calendarFilters = [
  "Todos",
  "Receitas",
  "Despesas",
  "Cartões",
  "Faturas",
  "Metas",
  "Investimentos",
  "Recorrentes",
  "Pendentes",
  "Pagos/Recebidos",
  "Atrasados",
];

const typeTone = (type?: string) => {
  const value = (type ?? "").toLowerCase();
  if (value.includes("receita") || value.includes("salário"))
    return { color: "green", bg: "rgba(72,187,120,.14)", border: "green.400" };
  if (value.includes("despesa"))
    return { color: "red", bg: "rgba(245,101,101,.14)", border: "red.400" };
  if (
    value.includes("cartão") ||
    value.includes("cartao") ||
    value.includes("fatura") ||
    value.includes("fechamento")
  )
    return { color: "purple", bg: "rgba(159,122,234,.15)", border: "purple.400" };
  if (value.includes("meta") || value.includes("aporte"))
    return { color: "blue", bg: "rgba(66,153,225,.15)", border: "blue.400" };
  if (value.includes("investimento") || value.includes("resgate"))
    return { color: "yellow", bg: "rgba(236,201,75,.16)", border: "yellow.400" };
  return { color: "gray", bg: "rgba(160,174,192,.14)", border: "gray.400" };
};

const eventMatchesFilter = (event: FinanceRecord, filter: string) => {
  if (filter === "Todos") return true;
  const type = (event.tipo ?? "").toLowerCase();
  const status = (event.status ?? "pendente").toLowerCase();
  const isOverdue =
    ["pendente", "atrasado", "prevista", "previsto"].includes(status) &&
    (event.data ?? "") < todayISO();
  if (filter === "Receitas")
    return type.includes("receita") || type.includes("salário");
  if (filter === "Despesas") return type.includes("despesa");
  if (filter === "Cartões" || filter === "Faturas")
    return type.includes("cartão") || type.includes("cartao") || type.includes("fatura");
  if (filter === "Metas") return type.includes("meta") || type.includes("aporte");
  if (filter === "Investimentos")
    return type.includes("investimento") || type.includes("resgate");
  if (filter === "Recorrentes")
    return event.origem === "contas_recorrentes" || type.includes("recorrente");
  if (filter === "Pendentes")
    return ["pendente", "prevista", "previsto", "aberta"].includes(status);
  if (filter === "Pagos/Recebidos")
    return ["pago", "paga", "recebida", "confirmado", "confirmada"].includes(status);
  if (filter === "Atrasados") return isOverdue;
  return true;
};

const sourceFromEvent = (event: FinanceRecord) => {
  const [table, ...idParts] = event.id.split(":");
  const suffix = idParts.at(-1);
  const id =
    suffix?.includes("previsto") || suffix === "fechamento"
      ? idParts.slice(0, -1).join(":")
      : idParts.join(":");
  return { table: table as FinanceTable, id };
};

const isDerivedCalendarEvent = (event: FinanceRecord) =>
  event.id.includes(":fechamento") ||
  event.id.includes(":vencimento-previsto") ||
  event.origem === "metas_financeiras" ||
  event.origem === "contas_recorrentes" ||
  event.origem === "parcelas_cartao" ||
  event.origem === "cartoes" ||
  event.origem === "profile_salary" ||
  event.is_virtual ||
  event.source === "profile_salary" ||
  event.status === "previsto";

const isSalaryCalendarEvent = (event: FinanceRecord) => {
  const text = `${event.titulo ?? ""} ${event.tipo ?? ""}`.toLowerCase();
  return text.includes("salário") || text.includes("salario");
};

const isMonthlySkippableEvent = (event: FinanceRecord) =>
  event.origem === "profile_salary" ||
  isSalaryCalendarEvent(event) ||
  ([
    "metas_financeiras",
    "contas_recorrentes",
    "parcelas_cartao",
    "cartoes",
    "movimentacoes_investimentos",
  ].includes(event.origem ?? "") &&
    !["pago", "paga", "recebida", "confirmado", "confirmada"].includes(
      event.status ?? "",
    ));

const calendarEditFieldsByTable = (table?: FinanceTable): Field[] => {
  if (table === "receitas")
    return [
      { key: "descricao", label: "Descrição", required: true },
      { key: "valor", label: "Valor", type: "number", required: true },
      { key: "data", label: "Data", type: "date", required: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        required: true,
        options: ["pendente", "recebida", "cancelada"],
      },
      { key: "observacao", label: "Observação", type: "textarea" },
    ];
  if (table === "despesas")
    return [
      { key: "descricao", label: "Descrição", required: true },
      { key: "valor", label: "Valor", type: "number", required: true },
      { key: "data", label: "Data", type: "date", required: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        required: true,
        options: ["pendente", "pago", "atrasado", "cancelado"],
      },
      { key: "observacao", label: "Observação", type: "textarea" },
    ];
  if (table === "faturas_cartao")
    return [
      { key: "valor", label: "Valor", type: "number", required: true },
      { key: "data_vencimento", label: "Vencimento", type: "date" },
      { key: "paga_em", label: "Pago em", type: "date" },
      {
        key: "status",
        label: "Status",
        type: "select",
        required: true,
        options: ["aberta", "fechada", "paga", "atrasada", "cancelada"],
      },
      { key: "observacao", label: "Observação", type: "textarea" },
    ];
  if (table === "aportes_metas" || table === "movimentacoes_investimentos")
    return [
      { key: "valor", label: "Valor", type: "number", required: true },
      { key: "data", label: "Data", type: "date", required: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        required: true,
        options: ["pendente", "confirmado", "confirmada", "cancelada"],
      },
      { key: "observacao", label: "Observação", type: "textarea" },
    ];
  return [
    { key: "descricao", label: "Descrição" },
    { key: "nome", label: "Nome" },
    { key: "valor", label: "Valor", type: "number" },
    { key: "data", label: "Data", type: "date" },
    { key: "status", label: "Status" },
    { key: "observacao", label: "Observação", type: "textarea" },
  ];
};

function EventPill({ event }: { event: FinanceRecord }) {
  const tone = typeTone(event.tipo);
  return (
    <Tag
      size="sm"
      w="full"
      justifyContent="flex-start"
      bg={tone.bg}
      borderLeft="3px solid"
      borderColor={tone.border}
      borderRadius="md"
      color="textMain"
      title={`${event.titulo} · ${formatCurrency(event.valor)}`}
    >
      <TagLabel overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {event.titulo} · {formatCurrency(event.valor)}
      </TagLabel>
    </Tag>
  );
}

function FinancialCalendar({
  data,
  save,
  remove,
  profile,
}: {
  data: Data;
  save: (table: FinanceTable, item: FinanceRecord) => Promise<void>;
  remove: (table: FinanceTable, id: string) => Promise<void>;
  profile?: Profile | null;
}) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filter, setFilter] = useState("Todos");
  const [selectedDate, setSelectedDate] = useState<string>();
  const [addKind, setAddKind] = useState<"receita" | "despesa" | "recorrente">();
  const [editing, setEditing] = useState<FinanceRecord>();
  const [pendingDelete, setPendingDelete] = useState<FinanceRecord>();
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const drawer = useDisclosure();
  const addModal = useDisclosure();
  const editModal = useDisclosure();
  const allEvents = useMemo(
    () => buildFinancialCalendar(data, month, profile),
    [data, month, profile],
  );
  const events = allEvents.filter((event) => eventMatchesFilter(event, filter));
  const byDate = events.reduce<Record<string, FinanceRecord[]>>((acc, item) => {
    if (!item.data) return acc;
    acc[item.data] ??= [];
    acc[item.data].push(item);
    return acc;
  }, {});
  const [year, monthIndex] = month.split("-").map(Number);
  const firstDay = new Date(year, monthIndex - 1, 1);
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDay.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const today = todayISO();
  const selectedEvents = selectedDate ? byDate[selectedDate] ?? [] : [];
  const totalReceivable = allEvents
    .filter((event) => eventMatchesFilter(event, "Receitas"))
    .reduce((sum, event) => sum + (event.valor ?? 0), 0);
  const totalPayable = allEvents
    .filter(
      (event) =>
        eventMatchesFilter(event, "Despesas") ||
        eventMatchesFilter(event, "Faturas") ||
        eventMatchesFilter(event, "Metas") ||
        eventMatchesFilter(event, "Investimentos"),
    )
    .reduce((sum, event) => sum + (event.valor ?? 0), 0);
  const pending = allEvents.filter((event) =>
    eventMatchesFilter(event, "Pendentes"),
  ).length;
  const selectedReceivable = selectedEvents
    .filter((event) => eventMatchesFilter(event, "Receitas"))
    .reduce((sum, event) => sum + (event.valor ?? 0), 0);
  const selectedPayable = selectedEvents
    .filter((event) => !eventMatchesFilter(event, "Receitas"))
    .reduce((sum, event) => sum + (event.valor ?? 0), 0);
  const skippedThisMonth = data.eventos_financeiros.filter(
    (event) =>
      isCalendarSkipEvent(event) &&
      (event.competencia?.startsWith(month) || event.data?.startsWith(month)),
  );
  const monthLabel = firstDay.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const shiftMonth = (delta: number) => {
    const next = new Date(year, monthIndex - 1 + delta, 1);
    setMonth(next.toISOString().slice(0, 7));
  };
  const openDay = (date: string) => {
    setSelectedDate(date);
    drawer.onOpen();
  };
  const categoriesByType = (type: string) =>
    data.categorias_financeiras
      .filter((x) => (x.status ?? "ativa") === "ativa" && x.tipo === type)
      .map((x) => x.nome ?? "")
      .filter(Boolean);
  const openAdd = (kind: "receita" | "despesa" | "recorrente") => {
    setAddKind(kind);
    addModal.onOpen();
  };
  const openEdit = (event: FinanceRecord) => {
    const { table, id } = sourceFromEvent(event);
    const item = data[table]?.find((record) => record.id === id);
    if (!item) {
      toast({
        title: "Evento derivado",
        description: "Este evento é uma previsão calculada. Edite o lançamento de origem correspondente.",
        status: "info",
      });
      return;
    }
    setEditing({ ...item, id: event.id });
    editModal.onOpen();
  };
  const markDone = async (event: FinanceRecord) => {
    if (isDerivedCalendarEvent(event)) {
      toast({
        title: "Evento previsto",
        description: "Este item é informativo. Para baixar valores, use o lançamento ou fatura real.",
        status: "info",
      });
      return;
    }
    const { table, id } = sourceFromEvent(event);
    const item = data[table]?.find((record) => record.id === id);
    if (!item) return;
    const status =
      table === "receitas"
        ? "recebida"
        : table === "despesas"
          ? "pago"
          : table === "faturas_cartao" || table === "parcelas_cartao"
            ? "paga"
            : table === "aportes_metas" || table === "movimentacoes_investimentos"
              ? "confirmada"
              : item.status;
    await save(table, {
      ...item,
      status,
      ...(table === "faturas_cartao" ? { paga_em: new Date().toISOString() } : {}),
    });
    toast({ title: "Status atualizado no calendário", status: "success" });
  };
  const skipOnlyThisMonth = async (event: FinanceRecord) => {
    const { table, id } = sourceFromEvent(event);
    const exceptionKey =
      event.origem === "profile_salary"
        ? calendarExceptionKey("profile_salary", "profile_salary")
        : calendarExceptionKey(table, id);
    if (!isMonthlySkippableEvent(event)) {
      toast({
        title: "Este item não pode ser pulado",
        description:
          "Use essa opção apenas para previsões, recorrências, parcelas futuras e aportes planejados.",
        status: "info",
      });
      return;
    }
    if (
      skippedThisMonth.some(
        (item) => item.origem === exceptionKey,
      )
    ) {
      toast({
        title: "Este item já foi pulado neste mês",
        status: "info",
      });
      return;
    }
    await save("eventos_financeiros", {
      id: crypto.randomUUID(),
      titulo: `Ignorar no mês · ${event.titulo ?? "Evento"}`,
      tipo: CALENDAR_SKIP_TYPE,
      data: `${month}-01`,
      competencia: `${month}-01`,
      origem: exceptionKey,
      status: "pendente",
      valor: 0,
      observacao: `Exceção mensal criada para não considerar "${event.titulo ?? "evento"}" em ${month}.`,
    });
    toast({
      title: "Item ignorado neste mês",
      description: "A recorrência original continua ativa para os próximos meses.",
      status: "success",
    });
  };
  const deleteEvent = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { table, id } = sourceFromEvent(pendingDelete);
    try {
      if (isDerivedCalendarEvent(pendingDelete))
        throw new Error("Eventos previstos não podem ser excluídos diretamente.");
      await remove(table, id);
      toast({ title: "Evento excluído", status: "success" });
      setPendingDelete(undefined);
    } catch (error) {
      toast({
        title: "Erro ao excluir evento",
        description: (error as Error).message,
        status: "error",
      });
    } finally {
      setDeleting(false);
    }
  };
  const addFields: Field[] =
    addKind === "recorrente"
      ? recurringFields.map((field) =>
          field.key === "categoria"
            ? {
                ...field,
                type: "select" as const,
                options: categoriesByType("despesa"),
              }
            : field,
        )
      : [
          { key: "descricao", label: "Descrição", required: true },
          { key: "valor", label: "Valor", type: "number", required: true },
          {
            key: "categoria",
            label: "Categoria",
            type: "select",
            required: true,
            options: categoriesByType(addKind === "receita" ? "receita" : "despesa"),
          },
          { key: "data", label: "Data", type: "date", required: true },
          {
            key: addKind === "receita" ? "forma_recebimento" : "forma_pagamento",
            label: addKind === "receita" ? "Forma de recebimento" : "Forma de pagamento",
            type: "select",
            required: true,
            options:
              addKind === "receita"
                ? ["Pix", "Dinheiro", "Boleto", "Transferência"]
                : ["Pix", "Dinheiro", "Débito", "Crédito", "Boleto", "Transferência"],
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            required: true,
            options: addKind === "receita" ? ["pendente", "recebida"] : ["pendente", "pago"],
          },
        ];
  const saveAdded = async (item: FinanceRecord) => {
    if (addKind === "recorrente") {
      item.ativa = true;
      item.status = item.status ?? "ativa";
      await save("contas_recorrentes", item);
      return;
    }
    item.data = item.data || selectedDate || todayISO();
    await save(addKind === "receita" ? "receitas" : "despesas", item);
  };
  const saveEdited = async (item: FinanceRecord) => {
    const { table, id } = sourceFromEvent(editing ?? item);
    const original = data[table]?.find((record) => record.id === id);
    await save(table, { ...original, ...item, id });
  };
  const editingSource = editing ? sourceFromEvent(editing) : undefined;
  const editFields = calendarEditFieldsByTable(editingSource?.table);
  return (
    <Stack spacing="4">
      <Flex
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap="3"
      >
        <Box>
          <Heading size="lg">Calendário financeiro</Heading>
          <Text color="muted">
            Grade mensal conectada aos lançamentos reais do banco. Alterou,
            pagou, recebeu ou excluiu: o calendário acompanha.
          </Text>
        </Box>
        <HStack>
          <IconButton
            aria-label="Mês anterior"
            icon={<ChevronLeft size={18} />}
            variant="ghost"
            onClick={() => shiftMonth(-1)}
          />
          <Button variant="outline" onClick={() => setMonth(today.slice(0, 7))}>
            Hoje
          </Button>
          <IconButton
            aria-label="Próximo mês"
            icon={<ChevronRight size={18} />}
            variant="ghost"
            onClick={() => shiftMonth(1)}
          />
        </HStack>
      </Flex>
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing="3">
        {[
          ["A receber", totalReceivable, "green"],
          ["A pagar / investir", totalPayable, "red"],
          ["Saldo previsto", totalReceivable - totalPayable, "blue"],
          ["Pendências", pending, "orange"],
        ].map(([label, value, color]) => (
          <Box key={String(label)} {...panel} p="4">
            <Text color="muted" fontSize="sm">
              {label}
            </Text>
            <Heading size="sm" color={`${color}.300`} mt="1">
              {typeof value === "number" && label !== "Pendências"
                ? formatCurrency(value)
                : value}
            </Heading>
          </Box>
        ))}
      </SimpleGrid>
      <Box {...panel} p="4">
        <Flex
          justify="space-between"
          align={{ base: "flex-start", lg: "center" }}
          direction={{ base: "column", lg: "row" }}
          gap="3"
        >
          <Box>
            <Heading size="md" textTransform="capitalize">
              {monthLabel}
            </Heading>
            <Text color="muted" fontSize="sm">
              {events.length} evento(s) no filtro atual
            </Text>
          </Box>
          <Flex gap="2" wrap="wrap">
            {calendarFilters.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={filter === item ? "solid" : "outline"}
                onClick={() => setFilter(item)}
              >
                {item}
              </Button>
            ))}
          </Flex>
        </Flex>
        <Flex gap="3" wrap="wrap" mt="4">
          {[
            ["Receita", "Receita"],
            ["Despesa", "Despesa"],
            ["Cartão/Fatura", "Fatura"],
            ["Meta", "Meta"],
            ["Investimento", "Investimento"],
            ["Recorrente", "Recorrente"],
          ].map(([label, type]) => {
            const tone = typeTone(type);
            return (
              <Flex key={label} align="center" gap="2" fontSize="xs" color="muted">
                <Box w="10px" h="10px" borderRadius="full" bg={tone.border} />
                {label}
              </Flex>
            );
          })}
        </Flex>
        {skippedThisMonth.length > 0 && (
          <Box mt="4" p="3" border="1px dashed" borderColor="orange.400" borderRadius="xl">
            <Text color="orange.200" fontSize="sm" fontWeight="800">
              Itens pulados neste mês
            </Text>
            <Stack mt="2" spacing="2">
              {skippedThisMonth.map((event) => (
                <Flex
                  key={event.id}
                  justify="space-between"
                  align={{ base: "flex-start", md: "center" }}
                  gap="2"
                  direction={{ base: "column", md: "row" }}
                >
                  <Text color="muted" fontSize="sm">
                    {event.titulo}
                  </Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => void remove("eventos_financeiros", event.id)}
                  >
                    Reativar no mês
                  </Button>
                </Flex>
              ))}
            </Stack>
          </Box>
        )}
        <SimpleGrid columns={7} spacing="2" mt="5" display={{ base: "none", md: "grid" }}>
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
            <Text key={day} color="muted" fontSize="xs" fontWeight="800" textAlign="center">
              {day}
            </Text>
          ))}
          {cells.map((day, index) => {
            const date = day ? `${month}-${String(day).padStart(2, "0")}` : "";
            const dayEvents = date ? byDate[date] ?? [] : [];
            return (
              <Box
                key={`${day ?? "blank"}-${index}`}
                minH="132px"
                p="2"
                border="1px solid"
                borderColor={date === today ? "brand.400" : dayEvents.length ? "brand.800" : "line"}
                borderRadius="xl"
                bg={date === today ? "rgba(15,98,254,.10)" : "panel2"}
                cursor={day ? "pointer" : "default"}
                transition=".2s ease"
                _hover={day ? { transform: "translateY(-2px)", borderColor: "brand.400" } : undefined}
                onClick={() => day && openDay(date)}
              >
                {day && (
                  <>
                    <Flex justify="space-between" align="center" mb="2">
                      <Text fontWeight={date === today ? "900" : "700"}>{day}</Text>
                      {dayEvents.length > 0 && (
                        <Badge colorScheme="blue" borderRadius="full">
                          {dayEvents.length}
                        </Badge>
                      )}
                    </Flex>
                    <Stack spacing="1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <EventPill key={event.id} event={event} />
                      ))}
                      {dayEvents.length > 3 && (
                        <Text fontSize="xs" color="muted">
                          +{dayEvents.length - 3} evento(s)
                        </Text>
                      )}
                    </Stack>
                  </>
                )}
              </Box>
            );
          })}
        </SimpleGrid>
        <Stack mt="5" display={{ base: "flex", md: "none" }}>
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const date = `${month}-${String(day).padStart(2, "0")}`;
            const dayEvents = byDate[date] ?? [];
            return (
              <Box key={date} p="4" border="1px solid" borderColor={date === today ? "brand.400" : "line"} borderRadius="xl" onClick={() => openDay(date)}>
                <Flex justify="space-between">
                  <Text fontWeight="800">{formatDateBR(date)}</Text>
                  <Badge>{dayEvents.length} evento(s)</Badge>
                </Flex>
                <Stack mt="3">
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventPill key={event.id} event={event} />
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Box>
      <Drawer isOpen={drawer.isOpen} placement="right" onClose={drawer.onClose} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            {selectedDate ? formatDateBR(selectedDate) : "Dia selecionado"}
            <Text color="muted" fontSize="sm" fontWeight="400">
              Receber {formatCurrency(selectedReceivable)} · Pagar {formatCurrency(selectedPayable)} · Saldo {formatCurrency(selectedReceivable - selectedPayable)}
            </Text>
          </DrawerHeader>
          <DrawerBody>
            <Stack spacing="4">
              <HStack wrap="wrap">
                <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => openAdd("receita")}>
                  Receita
                </Button>
                <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => openAdd("despesa")}>
                  Despesa
                </Button>
                <Button size="sm" leftIcon={<Repeat2 size={14} />} onClick={() => openAdd("recorrente")}>
                  Recorrente
                </Button>
              </HStack>
              <Divider />
              {selectedEvents.map((event) => {
                const tone = typeTone(event.tipo);
                return (
                  <Box key={event.id} p="4" border="1px solid" borderColor="line" borderRadius="xl" bg={tone.bg}>
                    <Flex justify="space-between" gap="3">
                      <Box>
                        <Badge colorScheme={tone.color}>{event.tipo}</Badge>
                        <Heading size="sm" mt="2">
                          {event.titulo}
                        </Heading>
                        <Text color="muted" fontSize="sm">
                          {event.status ?? "pendente"} · {event.origem}
                        </Text>
                      </Box>
                      <Text fontWeight="900">{formatCurrency(event.valor)}</Text>
                    </Flex>
                    <Flex gap="2" mt="4" wrap="wrap">
                      {isMonthlySkippableEvent(event) && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => void skipOnlyThisMonth(event)}
                        >
                          Pular só este mês
                        </Button>
                      )}
                      <Button size="xs" leftIcon={<CheckCircle2 size={13} />} onClick={() => void markDone(event)} isDisabled={isDerivedCalendarEvent(event)}>
                        Marcar como pago/recebido
                      </Button>
                      <Button size="xs" variant="outline" leftIcon={<Edit2 size={13} />} onClick={() => openEdit(event)} isDisabled={isDerivedCalendarEvent(event)}>
                        Editar
                      </Button>
                      <Button size="xs" colorScheme="red" variant="ghost" leftIcon={<Trash2 size={13} />} onClick={() => setPendingDelete(event)} isDisabled={isDerivedCalendarEvent(event)}>
                        Excluir
                      </Button>
                    </Flex>
                  </Box>
                );
              })}
              {!selectedEvents.length && (
                <Center py="14" color="muted" flexDir="column">
                  <CalendarDays />
                  <Text mt="3">Nenhuma movimentação neste dia.</Text>
                </Center>
              )}
            </Stack>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="ghost" onClick={drawer.onClose}>
              Fechar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Modal isOpen={addModal.isOpen} onClose={addModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <Editor
            title={addKind === "receita" ? "receita" : addKind === "despesa" ? "despesa" : "recorrência"}
            fields={addFields}
            item={selectedDate ? ({ data: selectedDate } as FinanceRecord) : undefined}
            onSave={saveAdded}
            onClose={addModal.onClose}
          />
        </ModalContent>
      </Modal>
      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <Editor
            title="lançamento"
            fields={editFields}
            item={editing}
            onSave={saveEdited}
            onClose={editModal.onClose}
          />
        </ModalContent>
      </Modal>
      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(undefined)}
        onConfirm={() => void deleteEvent()}
        title="Excluir evento financeiro"
        description="Essa ação exclui o lançamento de origem no banco e atualiza o calendário automaticamente."
        itemName={pendingDelete?.titulo}
        impact="Eventos de fatura, parcelas, metas e recorrências podem alterar totais relacionados. Revise os módulos conectados após confirmar."
        confirmLabel="Confirmar exclusão"
        isLoading={deleting}
      />
    </Stack>
  );
}

export default function OperationalModule({
  page,
  data,
  save,
  remove,
  profile,
}: {
  page: ModulePage;
  data: Data;
  save: (table: FinanceTable, item: FinanceRecord) => Promise<void>;
  remove: (table: FinanceTable, id: string) => Promise<void>;
  profile?: Profile | null;
}) {
  if (page === "cartoes")
    return <Cards data={data} profile={profile} save={save} remove={remove} />;
  if (page === "recorrentes")
    return <Recurring data={data} save={save} remove={remove} />;
  if (page === "calendario")
    return (
      <FinancialCalendar
        data={data}
        save={save}
        remove={remove}
        profile={profile}
      />
    );
  if (page === "relatorios") return <Reports data={data} profile={profile} />;
  const configs = {
    investimentos: {
      title: "Investimentos",
      singular: "investimento",
      icon: <TrendingUp />,
      table: "investimentos" as FinanceTable,
      items: data.investimentos,
      fields: investmentFields,
      filters: [
        {
          key: "tipo",
          label: "Tipo",
          options: [
            "CDB",
            "Tesouro Direto",
            "Ações",
            "Fundo",
            "Cripto",
            "Outros",
          ],
        },
        {
          key: "instituicao",
          label: "Instituição",
          options: [
            ...new Set(
              data.investimentos
                .map((x) => x.instituicao)
                .filter(Boolean) as string[],
            ),
          ],
        },
      ],
      columns: [
        { key: "nome", label: "Nome" },
        { key: "tipo", label: "Tipo" },
        { key: "instituicao", label: "Instituição" },
        {
          key: "valor_investido",
          label: "Valor",
          format: (x: FinanceRecord) => formatCurrency(x.valor_investido),
        },
      ],
    },
    calendario: {
      title: "Calendário financeiro",
      singular: "evento",
      icon: <CalendarDays />,
      table: "eventos_financeiros" as FinanceTable,
      items: data.eventos_financeiros,
      fields: eventFields,
      columns: [
        {
          key: "data",
          label: "Data",
          format: (x: FinanceRecord) => formatDateBR(x.data),
        },
        { key: "titulo", label: "Evento" },
        { key: "tipo", label: "Tipo" },
        {
          key: "valor",
          label: "Valor",
          format: (x: FinanceRecord) => formatCurrency(x.valor),
        },
        {
          key: "status",
          label: "Status",
          format: (x: FinanceRecord) => (
            <Badge colorScheme={x.status === "pago" ? "green" : "orange"}>
              {x.status}
            </Badge>
          ),
        },
      ],
    },
    recorrentes: {
      title: "Contas recorrentes",
      singular: "conta",
      icon: <Repeat2 />,
      table: "contas_recorrentes" as FinanceTable,
      items: data.contas_recorrentes,
      fields: recurringFields,
      columns: [
        { key: "descricao", label: "Conta" },
        { key: "categoria", label: "Categoria" },
        {
          key: "dia_vencimento",
          label: "Vencimento",
          format: (x: FinanceRecord) => `Dia ${x.dia_vencimento}`,
        },
        {
          key: "valor",
          label: "Valor",
          format: (x: FinanceRecord) => formatCurrency(x.valor),
        },
      ],
    },
    categorias: {
      title: "Categorias financeiras",
      singular: "categoria",
      icon: <Tags />,
      table: "categorias_financeiras" as FinanceTable,
      items: data.categorias_financeiras,
      fields: categoryFields,
      columns: [
        { key: "nome", label: "Nome" },
        { key: "tipo", label: "Tipo" },
        {
          key: "cor",
          label: "Cor",
          format: (x: FinanceRecord) => (
            <Flex align="center" gap="2">
              <Box w="12px" h="12px" borderRadius="full" bg={x.cor} />
              {x.cor}
            </Flex>
          ),
        },
        { key: "icone", label: "Ícone" },
      ],
    },
  }[page];
  if (!configs)
    return (
      <Center>
        <FileBarChart />
      </Center>
    );
  const saveEntity = async (item: FinanceRecord) => {
    if (configs.table !== "investimentos") {
      await save(configs.table, item);
      return;
    }
    const previous = data.investimentos.find((x) => x.id === item.id);
    const before = previous?.valor_investido ?? 0,
      after = item.valor_investido ?? 0;
    await save("investimentos", item);
    const difference = after - before;
    if (difference !== 0)
      await save("movimentacoes_investimentos", {
        id: crypto.randomUUID(),
        investimento_id: item.id,
        tipo: difference > 0 ? "aplicacao" : "resgate",
        valor: Math.abs(difference),
        data: todayISO(),
        status: "confirmada",
        observacao: previous ? "Ajuste de posição" : "Aplicação inicial",
      });
  };
  const main = (
    <EntitySection
      {...configs}
      onSave={saveEntity}
      onRemove={(id) => remove(configs.table, id)}
    />
  );
  if (page !== "investimentos") return main;
  const movementFields = investmentMovementFields.map((field) =>
    field.key === "investimento_id"
      ? {
          ...field,
          options: data.investimentos.map((x) => `${x.id}|${x.nome}`),
        }
      : field,
  );
  const movementDelta = (item: Partial<FinanceRecord>) =>
    item.status === "confirmada"
      ? item.tipo === "resgate"
        ? -(item.valor ?? 0)
        : (item.valor ?? 0)
      : 0;
  const saveMovement = async (item: FinanceRecord) => {
    if (item.investimento_id?.includes("|"))
      item.investimento_id = item.investimento_id.split("|")[0];
    const investment = data.investimentos.find(
      (x) => x.id === item.investimento_id,
    );
    if (!investment) throw new Error("Selecione um investimento válido.");
    const previous = data.movimentacoes_investimentos.find(
      (x) => x.id === item.id,
    );
    const next = Math.max(
      0,
      (investment.valor_investido ?? 0) -
        movementDelta(previous ?? {}) +
        movementDelta(item),
    );
    await save("movimentacoes_investimentos", item);
    await save("investimentos", { ...investment, valor_investido: next });
  };
  const removeMovement = async (id: string) => {
    const movement = data.movimentacoes_investimentos.find((x) => x.id === id);
    const investment = data.investimentos.find(
      (x) => x.id === movement?.investimento_id,
    );
    if (movement && investment)
      await save("investimentos", {
        ...investment,
        valor_investido: Math.max(
          0,
          (investment.valor_investido ?? 0) - movementDelta(movement),
        ),
      });
    await remove("movimentacoes_investimentos", id);
  };
  return (
    <Stack spacing="4">
      {main}
      <EntitySection
        title="Movimentações"
        singular="movimentação"
        icon={<TrendingUp />}
        items={data.movimentacoes_investimentos}
        fields={movementFields}
        columns={[
          {
            key: "investimento_id",
            label: "Investimento",
            format: (x) =>
              data.investimentos.find((i) => i.id === x.investimento_id)
                ?.nome ?? "—",
          },
          { key: "tipo", label: "Tipo" },
          { key: "data", label: "Data", format: (x) => formatDateBR(x.data) },
          {
            key: "valor",
            label: "Valor",
            format: (x) => formatCurrency(x.valor),
          },
          { key: "status", label: "Status" },
        ]}
        onSave={saveMovement}
        onRemove={removeMovement}
      />
    </Stack>
  );
}
