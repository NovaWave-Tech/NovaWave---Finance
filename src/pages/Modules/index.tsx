import { useState, type FormEvent, type ReactNode } from "react";
import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  FormControl,
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
  StatHelpText,
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
import { CurrencyInput } from "../../components/forms/CurrencyInput";
import { calculateAvailableLimit } from "../../utils/calculations";
import { buildFinancialCalendar } from "../../services/calendarService";

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
                    <option key={option}>{option}</option>
                  ))}
                </Select>
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
  const remove = async (id: string) => {
    if (!confirm("Confirma a exclusão deste registro?")) return;
    try {
      await onRemove(id);
      toast({ title: "Registro excluído", status: "success" });
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: (error as Error).message,
        status: "error",
      });
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
                      onClick={() => remove(item.id)}
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
    if (!confirm(`Pagar fatura de ${formatCurrency(group.valor)}?`)) return;
    const card = data.cartoes.find((x) => x.id === group.cartao_id);
    const competence = group.competencia.slice(0, 7);
    const due = `${competence}-${String(card?.dia_vencimento ?? 1).padStart(2, "0")}`;
    try {
      await save("faturas_cartao", {
        id:
          data.faturas_cartao.find(
            (x) =>
              x.cartao_id === group.cartao_id &&
              x.competencia?.startsWith(competence),
          )?.id ?? crypto.randomUUID(),
        cartao_id: group.cartao_id,
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
        id: crypto.randomUUID(),
        descricao: `Pagamento da fatura ${card?.nome ?? ""}`,
        valor: group.valor,
        categoria: "Cartão de crédito",
        data: todayISO(),
        forma_pagamento: "Transferência",
        status: "pago",
        tipo: "pagamento_cartao",
      });
      toast({ title: "Fatura paga e saldo atualizado", status: "success" });
    } catch (error) {
      toast({
        title: "Erro ao pagar fatura",
        description: (error as Error).message,
        status: "error",
      });
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
                  <Button size="sm" onClick={() => void pay(group)}>
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
    </Box>
  );
}

function Cards({
  data,
  save,
  remove,
}: {
  data: Data;
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
    .filter((x) => x.competencia?.startsWith(current) && x.status !== "paga")
    .reduce((s, x) => s + (x.valor ?? 0), 0);
  const purchaseFields: Field[] = [
    { key: "descricao", label: "Descrição", required: true },
    {
      key: "valor_total",
      label: "Valor total",
      type: "number",
      required: true,
    },
    {
      key: "quantidade_parcelas",
      label: "Parcelas",
      type: "number",
      required: true,
    },
    {
      key: "cartao_id",
      label: "Cartão",
      type: "select",
      required: true,
      options: activeCards.map((x) => `${x.id}|${x.nome}`),
    },
    {
      key: "data_compra",
      label: "Data da compra",
      type: "date",
      required: true,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: ["ativa", "cancelada", "estornada"],
    },
    {
      key: "categoria",
      label: "Categoria",
      type: "select",
      required: true,
      options: data.categorias_financeiras
        .filter(
          (x) =>
            (x.status ?? "ativa") === "ativa" &&
            ["despesa", "cartao"].includes(x.tipo ?? ""),
        )
        .map((x) => x.nome ?? "")
        .filter(Boolean),
    },
    { key: "observacao", label: "Observação", type: "textarea" },
  ];
  const savePurchase = async (item: FinanceRecord) => {
    if (
      data.parcelas_cartao.some(
        (x) => x.compra_id === item.id && x.status === "paga",
      )
    )
      throw new Error("Uma compra com parcela já paga não pode ser alterada.");
    const cardOption = item.cartao_id ?? "";
    item.cartao_id = cardOption.includes("|")
      ? cardOption.split("|")[0]
      : cardOption;
    const count = Math.max(1, item.quantidade_parcelas ?? 1);
    const card = data.cartoes.find((x) => x.id === item.cartao_id);
    if (!card || (card.status ?? "ativa") !== "ativa")
      throw new Error("Selecione um cartão ativo.");
    if ((item.valor_total ?? 0) <= 0)
      throw new Error("O valor da compra deve ser maior que zero.");
    if (!Number.isInteger(count) || count <= 0)
      throw new Error("A quantidade de parcelas deve ser maior que zero.");
    const previous =
      data.compras_cartao.find((x) => x.id === item.id)?.valor_total ?? 0;
    if (
      (item.valor_total ?? 0) - previous >
      calculateAvailableLimit(card, data.parcelas_cartao, data.compras_cartao)
    )
      throw new Error("Limite insuficiente para esta compra.");
    item.status = item.status ?? "ativa";
    item.categoria_id = data.categorias_financeiras.find(
      (x) =>
        x.nome === item.categoria &&
        ["despesa", "cartao"].includes(x.tipo ?? ""),
    )?.id;
    item.valor_parcela =
      Math.round(((item.valor_total ?? 0) / count) * 100) / 100;
    await save("compras_cartao", item);
    for (const existing of data.parcelas_cartao.filter(
      (x) => x.compra_id === item.id,
    ))
      await remove("parcelas_cartao", existing.id);
    const purchaseDate = new Date(`${item.data_compra}T12:00:00`);
    if (Number.isNaN(purchaseDate.getTime()))
      throw new Error("Informe uma data de compra válida.");
    const startsNext = purchaseDate.getDate() > (card?.dia_fechamento ?? 31);
    const generated: FinanceRecord[] = [];
    for (
      let index = 0;
      index < (item.status === "ativa" ? count : 0);
      index++
    ) {
      const date = new Date(
        purchaseDate.getFullYear(),
        purchaseDate.getMonth() + index + (startsNext ? 1 : 0),
        1,
      );
      const base = item.valor_parcela ?? 0;
      const value =
        index === count - 1
          ? Math.round(((item.valor_total ?? 0) - base * (count - 1)) * 100) /
            100
          : base;
      const installment: FinanceRecord = {
        id: crypto.randomUUID(),
        compra_id: item.id,
        cartao_id: item.cartao_id,
        numero: index + 1,
        total: count,
        valor: value,
        competencia: date.toISOString().slice(0, 10),
        status: "pendente",
      };
      generated.push(installment);
      await save("parcelas_cartao", installment);
    }
    const affected = new Set([
      ...data.parcelas_cartao
        .filter((x) => x.compra_id === item.id)
        .map((x) => x.competencia?.slice(0, 7) ?? ""),
      ...generated.map((x) => x.competencia?.slice(0, 7) ?? ""),
    ]);
    for (const competence of affected) {
      if (!competence) continue;
      const installments = [
        ...data.parcelas_cartao.filter(
          (x) =>
            x.compra_id !== item.id &&
            x.cartao_id === card.id &&
            x.competencia?.startsWith(competence) &&
            x.status !== "paga" &&
            !["cancelada", "estornada"].includes(
              data.compras_cartao.find((p) => p.id === x.compra_id)?.status ??
                "ativa",
            ),
        ),
        ...generated.filter((x) => x.competencia?.startsWith(competence)),
      ];
      const total = installments.reduce((sum, x) => sum + (x.valor ?? 0), 0);
      const invoice = data.faturas_cartao.find(
        (x) => x.cartao_id === card.id && x.competencia?.startsWith(competence),
      );
      if (!total) {
        if (invoice && invoice.status !== "paga")
          await remove("faturas_cartao", invoice.id);
        continue;
      }
      const year = Number(competence.slice(0, 4)),
        month = Number(competence.slice(5, 7));
      const lastDay = new Date(year, month, 0).getDate();
      await save("faturas_cartao", {
        id: invoice?.id ?? crypto.randomUUID(),
        cartao_id: card.id,
        competencia: `${competence}-01`,
        data_fechamento: `${competence}-${String(Math.min(card.dia_fechamento ?? 1, lastDay)).padStart(2, "0")}`,
        data_vencimento: `${competence}-${String(Math.min(card.dia_vencimento ?? 1, lastDay)).padStart(2, "0")}`,
        valor: total,
        status: invoice?.status === "fechada" ? "fechada" : "aberta",
      });
    }
  };
  const removePurchase = async (id: string) => {
    for (const installment of data.parcelas_cartao.filter(
      (x) => x.compra_id === id,
    ))
      await remove("parcelas_cartao", installment.id);
    await remove("compras_cartao", id);
  };
  return (
    <Stack spacing="18px">
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing="14px">
        {[
          ["Limite total", totalLimit],
          ["Fatura atual", currentInvoice],
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
      <EntitySection
        title="Compras e parcelas"
        singular="compra"
        icon={<CreditCard />}
        items={data.compras_cartao}
        fields={purchaseFields}
        columns={[
          { key: "descricao", label: "Compra" },
          {
            key: "valor_total",
            label: "Total",
            format: (x) => formatCurrency(x.valor_total),
          },
          {
            key: "quantidade_parcelas",
            label: "Parcelas",
            format: (x) => `${x.quantidade_parcelas ?? 1}x`,
          },
          {
            key: "data_compra",
            label: "Data",
            format: (x) => formatDateBR(x.data_compra),
          },
        ]}
        onSave={savePurchase}
        onRemove={removePurchase}
      />
      <InvoicesPanel data={data} save={save} />
      <EntitySection
        title="Próximas faturas"
        singular="parcela"
        icon={<CalendarDays />}
        items={data.parcelas_cartao.filter(
          (x) => (x.competencia ?? "") >= `${current}-01`,
        )}
        fields={[]}
        columns={[
          {
            key: "competencia",
            label: "Fatura",
            format: (x) => formatDateBR(x.competencia),
          },
          {
            key: "numero",
            label: "Parcela",
            format: (x) => `${x.numero}/${x.total}`,
          },
          {
            key: "valor",
            label: "Valor",
            format: (x) => formatCurrency(x.valor),
          },
          {
            key: "status",
            label: "Status",
            format: (x) => (
              <Badge colorScheme={x.status === "paga" ? "green" : "orange"}>
                {x.status}
              </Badge>
            ),
          },
        ]}
        onSave={(x) => save("parcelas_cartao", x)}
        onRemove={(id) => remove("parcelas_cartao", id)}
      />
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

function FinancialCalendar({ data }: { data: Data }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const events = buildFinancialCalendar(data, month);
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
            Eventos derivados dos lançamentos reais; alterações na origem
            aparecem automaticamente.
          </Text>
        </Box>
        <Input
          type="month"
          maxW="210px"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </Flex>
      <Box {...panel} overflow="hidden">
        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Th>Data</Th>
                <Th>Evento</Th>
                <Th>Origem</Th>
                <Th>Status</Th>
                <Th isNumeric>Valor</Th>
              </Tr>
            </Thead>
            <Tbody>
              {events.map((item) => (
                <Tr key={item.id}>
                  <Td>{formatDateBR(item.data)}</Td>
                  <Td>{item.titulo}</Td>
                  <Td>
                    <Badge>{item.tipo}</Badge>
                  </Td>
                  <Td>{item.status ?? "pendente"}</Td>
                  <Td isNumeric>{formatCurrency(item.valor)}</Td>
                </Tr>
              ))}
              {!events.length && (
                <Tr>
                  <Td colSpan={5}>
                    <Center py="12" color="muted">
                      Nenhum evento financeiro neste mês.
                    </Center>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>
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
    return <Cards data={data} save={save} remove={remove} />;
  if (page === "recorrentes")
    return <Recurring data={data} save={save} remove={remove} />;
  if (page === "calendario") return <FinancialCalendar data={data} />;
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
