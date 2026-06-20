import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  GridItem,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
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
  Spinner,
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
  useColorMode,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Edit2,
  FileBarChart,
  Goal,
  Home,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Plus,
  ReceiptText,
  Repeat2,
  Search,
  Sun,
  Tags,
  Trash2,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { isSupabaseConfigured } from "./lib/supabase";
import { financeService } from "./services/financeService";
import { profileService } from "./services/profileService";
import DashboardPage from "./pages/Dashboard";
import OperationalModule from "./pages/Modules";
import GoalsPage from "./pages/Metas";
import CalculatorPage from "./pages/Calculadora";
import ProfilePage from "./pages/Perfil";
import SpendingControlPage from "./pages/ControleGastos";
import type { FinanceRecord, FinanceTable, Profile } from "./types/database";
import { formatCurrencyBRL, formatDateBR } from "./utils/formatters";
import { useAuth } from "./hooks/useAuth";
import { BrandLogo } from "./components/brand/BrandLogo";
import { CurrencyInput } from "./components/forms/CurrencyInput";
import { DateInputBR } from "./components/forms/DateInputBR";

type Page =
  | "dashboard"
  | "receitas"
  | "despesas"
  | "metas"
  | "cartoes"
  | "investimentos"
  | "calendario"
  | "recorrentes"
  | "categorias"
  | "controle"
  | "calculadora"
  | "relatorios"
  | "perfil";
type Kind = "receitas" | "despesas" | "metas_financeiras";
type DataKind = FinanceTable;
type RecordData = FinanceRecord;
type FormData = {
  descricao: string;
  nome: string;
  valor: string;
  categoria: string;
  data: string;
  forma_pagamento: string;
  forma_recebimento: string;
  status: string;
  tipo: string;
  recorrente: string;
  dia_recebimento: string;
  observacao: string;
  valor_alvo: string;
  valor_atual: string;
  aporte_mensal: string;
  data_objetivo: string;
};
const money = formatCurrencyBRL;
const dateBR = formatDateBR;
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => crypto.randomUUID();
const initialData: Record<DataKind, RecordData[]> = {
  receitas: [],
  despesas: [],
  metas_financeiras: [],
  investimentos: [],
  cartoes: [],
  compras_cartao: [],
  parcelas_cartao: [],
  faturas_cartao: [],
  aportes_metas: [],
  movimentacoes_investimentos: [],
  orcamentos_categoria: [],
  eventos_financeiros: [],
  contas_recorrentes: [],
  categorias_financeiras: [],
};
const emptyForm: FormData = {
  descricao: "",
  nome: "",
  valor: "",
  categoria: "",
  data: today(),
  forma_pagamento: "Pix",
  forma_recebimento: "Pix",
  status: "pago",
  tipo: "variavel",
  recorrente: "false",
  dia_recebimento: "",
  observacao: "",
  valor_alvo: "",
  valor_atual: "",
  aporte_mensal: "",
  data_objetivo: "",
};

function useFinanceData(userId: string) {
  const [data, setData] = useState(initialData);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  useEffect(() => {
    if (!userId) return;
    Promise.resolve()
      .then(() => setLoading(true))
      .then(async () => {
        if (!isSupabaseConfigured)
          throw new Error(
            "Supabase não configurado. Preencha as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
          );
        const loadedProfile = await profileService.get(userId);
        setProfile(loadedProfile);
        await financeService.ensureMonthlySalary(loadedProfile, userId);
        const entries = await Promise.all(
          (Object.keys(initialData) as DataKind[]).map(
            async (k) => [k, await financeService.list(k)] as const,
          ),
        );
        setData(Object.fromEntries(entries) as Record<DataKind, RecordData[]>);
        setLoading(false);
      })
      .catch((e) => {
        toast({
          title: "Não foi possível carregar os dados reais",
          description: e.message,
          status: "error",
        });
        setLoading(false);
      });
  }, [toast, userId]);
  const save = async (kind: DataKind, item: RecordData) => {
    const saved = await financeService.save(kind, item, userId);
    setData((current) => ({
      ...current,
      [kind]: current[kind].some((x) => x.id === item.id)
        ? current[kind].map((x) =>
            x.id === item.id ? { ...item, ...saved } : x,
          )
        : [{ ...item, ...saved }, ...current[kind]],
    }));
    if (
      (kind === "receitas" && saved.origem !== "salario_perfil") ||
      kind === "despesas"
    ) {
      const shouldRepeat =
        kind === "receitas"
          ? saved.recorrente === true
          : saved.tipo === "recorrente";
      const origin = `${kind}:${saved.id}`;
      const existing = data.contas_recorrentes.find(
        (account) => account.origem === origin,
      );
      if (shouldRepeat) {
        const recurring = await financeService.save(
          "contas_recorrentes",
          {
            id: existing?.id ?? crypto.randomUUID(),
            descricao: saved.descricao,
            valor: saved.valor,
            categoria: saved.categoria,
            categoria_id: saved.categoria_id,
            dia_vencimento: Number((saved.data ?? "").slice(8, 10)) || 1,
            forma_pagamento:
              kind === "receitas"
                ? saved.forma_recebimento
                : saved.forma_pagamento,
            tipo: kind === "receitas" ? "receita" : "despesa",
            status: "ativa",
            ativa: true,
            origem: origin,
          },
          userId,
        );
        setData((current) => ({
          ...current,
          contas_recorrentes: current.contas_recorrentes.some(
            (x) => x.id === recurring.id,
          )
            ? current.contas_recorrentes.map((x) =>
                x.id === recurring.id ? recurring : x,
              )
            : [recurring, ...current.contas_recorrentes],
        }));
      } else if (existing) {
        const paused = await financeService.save(
          "contas_recorrentes",
          { ...existing, status: "cancelada", ativa: false },
          userId,
        );
        setData((current) => ({
          ...current,
          contas_recorrentes: current.contas_recorrentes.map((x) =>
            x.id === paused.id ? paused : x,
          ),
        }));
      }
    }
  };
  const remove = async (kind: DataKind, id: string) => {
    const removed = data[kind].find((item) => item.id === id);
    await financeService.remove(kind, id);
    setData((current) => ({
      ...current,
      [kind]: current[kind].filter((x) => x.id !== id),
    }));
    if (removed?.origem?.startsWith("recorrencia:")) {
      const recurrenceId = removed.origem.slice("recorrencia:".length);
      const account = data.contas_recorrentes.find(
        (x) => x.id === recurrenceId,
      );
      if (account) {
        const updated = await financeService.save(
          "contas_recorrentes",
          { ...account, ultima_geracao: null },
          userId,
        );
        setData((current) => ({
          ...current,
          contas_recorrentes: current.contas_recorrentes.map((x) =>
            x.id === updated.id ? updated : x,
          ),
        }));
      }
    }
  };
  const updateProfile = async (updated: Profile) => {
    setProfile(updated);
    const salary = await financeService.ensureMonthlySalary(updated, userId);
    if (salary)
      setData((current) => ({
        ...current,
        receitas: current.receitas.some((item) => item.id === salary.id)
          ? current.receitas.map((item) =>
              item.id === salary.id ? salary : item,
            )
          : [salary, ...current.receitas],
      }));
  };
  return { data, profile, loading, save, remove, updateProfile };
}

const nav: [Page, string, ReactNode][] = [
  ["dashboard", "Dashboard", <Home size={19} />],
  ["receitas", "Receitas", <ArrowUpRight size={19} />],
  ["despesas", "Despesas", <ArrowDownRight size={19} />],
  ["cartoes", "Cartões", <CreditCard size={19} />],
  ["metas", "Metas", <Goal size={19} />],
  ["investimentos", "Investimentos", <TrendingUp size={19} />],
  ["calendario", "Calendário", <CalendarDays size={19} />],
  ["recorrentes", "Recorrentes", <Repeat2 size={19} />],
  ["categorias", "Categorias", <Tags size={19} />],
  ["controle", "Controle de gastos", <ReceiptText size={19} />],
  ["calculadora", "Calculadora", <Calculator size={19} />],
  ["relatorios", "Relatórios", <FileBarChart size={19} />],
  ["perfil", "Perfil", <UserRound size={19} />],
];
function Sidebar({
  page,
  setPage,
  onClose,
  collapsed = false,
}: {
  page: Page;
  setPage: (p: Page) => void;
  onClose?: () => void;
  collapsed?: boolean;
}) {
  return (
    <Flex
      h="full"
      direction="column"
      p={collapsed ? "24px 10px" : "24px 16px"}
      bg="panel"
      borderRight="1px solid"
      borderColor="line"
    >
      <Box px={collapsed ? "8px" : "6px"} mb="42px">
        <BrandLogo compact={collapsed} size={42} />
      </Box>
      <Stack spacing="5px">
        {nav.map(([id, label, icon]) => (
          <Button
            key={id}
            onClick={() => {
              setPage(id);
              onClose?.();
            }}
            justifyContent={collapsed ? "center" : "flex-start"}
            gap="12px"
            px={collapsed ? "0" : "16px"}
            h="46px"
            variant="ghost"
            color={page === id ? "white" : "muted"}
            bg={
              page === id
                ? "linear-gradient(90deg,rgba(15,98,254,.28),rgba(108,59,255,.12))"
                : "transparent"
            }
            borderLeft="2px solid"
            borderColor={page === id ? "brand.400" : "transparent"}
            _hover={{ bg: "panel2", color: "textMain" }}
          >
            {icon}
            {!collapsed && label}
          </Button>
        ))}
      </Stack>
    </Flex>
  );
}

function Shell({
  page,
  setPage,
  email,
  onLogout,
  children,
}: {
  page: Page;
  setPage: (p: Page) => void;
  email: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  const mobile = useDisclosure();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("novawave-sidebar-collapsed") === "true",
  );
  const toggleSidebar = () =>
    setCollapsed((value) => {
      localStorage.setItem("novawave-sidebar-collapsed", String(!value));
      return !value;
    });
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <Flex minH="100vh">
      <Box
        display={{ base: "none", lg: "block" }}
        w={collapsed ? "82px" : "244px"}
        transition="width .25s ease"
        position="fixed"
        insetY="0"
      >
        <Sidebar page={page} setPage={setPage} collapsed={collapsed} />
      </Box>
      <Box
        flex="1"
        ml={{ lg: collapsed ? "82px" : "244px" }}
        transition="margin .25s ease"
        minW="0"
      >
        <Flex
          h="74px"
          px={{ base: "18px", md: "32px" }}
          align="center"
          justify="space-between"
          position="sticky"
          top="0"
          zIndex="10"
          bg="rgba(8,9,12,.86)"
          sx={{ backdropFilter: "blur(16px)" }}
          borderBottom="1px solid"
          borderColor="line"
        >
          <Flex align="center" gap="12px">
            <IconButton
              display={{ base: "none", lg: "inline-flex" }}
              aria-label="Recolher sidebar"
              icon={
                collapsed ? (
                  <ChevronRight size={19} />
                ) : (
                  <ChevronLeft size={19} />
                )
              }
              variant="ghost"
              onClick={toggleSidebar}
            />
            <IconButton
              display={{ lg: "none" }}
              aria-label="Menu"
              icon={<MenuIcon size={20} />}
              variant="ghost"
              onClick={mobile.onOpen}
            />
            <Box display={{ base: "none", md: "block" }}>
              <InputGroup size="sm" w="280px">
                <InputLeftElement>
                  <Search size={16} />
                </InputLeftElement>
                <Input
                  placeholder="Buscar transações..."
                  bg="panel"
                  borderColor="line"
                />
              </InputGroup>
            </Box>
          </Flex>
          <Flex align="center" gap="8px">
            <IconButton
              aria-label="Alternar tema"
              icon={
                colorMode === "dark" ? <Sun size={18} /> : <Moon size={18} />
              }
              variant="ghost"
              onClick={toggleColorMode}
            />
            <Menu>
              <MenuButton
                as={Button}
                variant="ghost"
                px="8px"
                rightIcon={<ChevronDown size={15} />}
              >
                <Flex align="center" gap="9px">
                  <Avatar size="sm" name={email} />
                  <Box display={{ base: "none", sm: "block" }} textAlign="left">
                    <Text fontSize="sm" lineHeight="1.2">
                      Minha conta
                    </Text>
                    <Text fontSize="xs" color="muted">
                      {email}
                    </Text>
                  </Box>
                </Flex>
              </MenuButton>
              <MenuList bg="panel" borderColor="line">
                <MenuItem
                  bg="transparent"
                  icon={<LogOut size={16} />}
                  onClick={onLogout}
                >
                  Sair
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Flex>
        <Box p={{ base: "20px 16px 90px", md: "32px" }} maxW="1500px" mx="auto">
          {children}
        </Box>
      </Box>
      <Drawer isOpen={mobile.isOpen} placement="left" onClose={mobile.onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="270px">
          <DrawerBody p="0">
            <Sidebar page={page} setPage={setPage} onClose={mobile.onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
}

function Panel({
  children,
  ...props
}: {
  children: ReactNode;
  [key: string]: unknown;
}) {
  return (
    <Box
      bg="panel"
      border="1px solid"
      borderColor="line"
      borderRadius="2xl"
      boxShadow="card"
      {...props}
    >
      {children}
    </Box>
  );
}
function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <Flex
      justify="space-between"
      align={{ base: "flex-start", md: "center" }}
      direction={{ base: "column", md: "row" }}
      gap="16px"
      mb="28px"
    >
      <Box>
        <Heading size="lg" letterSpacing="-.8px">
          {title}
        </Heading>
        <Text color="muted" mt="5px">
          {subtitle}
        </Text>
      </Box>
      {action}
    </Flex>
  );
}

const configs = {
  receitas: {
    title: "Receitas",
    subtitle: "Acompanhe tudo o que entra e fortalece seu patrimônio.",
    singular: "receita",
    icon: <ArrowUpRight />,
    categories: ["Salário", "Freelance", "Comissão", "Investimentos", "Outros"],
  },
  despesas: {
    title: "Despesas",
    subtitle: "Entenda para onde seu dinheiro vai, sem julgamentos.",
    singular: "despesa",
    icon: <ArrowDownRight />,
    categories: [
      "Alimentação",
      "Transporte",
      "Moradia",
      "Faculdade",
      "Academia",
      "Lazer",
      "Assinaturas",
      "Saúde",
      "Cartão de crédito",
      "Outros",
    ],
  },
  metas_financeiras: {
    title: "Metas financeiras",
    subtitle: "Transforme planos distantes em passos mensais concretos.",
    singular: "meta",
    icon: <Goal />,
    categories: [
      "Segurança",
      "Viagem",
      "Automóvel",
      "Educação",
      "Patrimônio",
      "Outros",
    ],
  },
};
function CrudPage({
  kind,
  items,
  onSave,
  onRemove,
  customCategories,
}: {
  kind: Kind;
  items: RecordData[];
  onSave: (x: RecordData) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  customCategories?: string[];
}) {
  const cfg = configs[kind];
  const categoryOptions = customCategories ?? cfg.categories;
  const modal = useDisclosure();
  const toast = useToast();
  const [editing, setEditing] = useState<RecordData | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [month, setMonth] = useState("");
  const [method, setMethod] = useState("");
  const open = (item?: RecordData) => {
    setEditing(item || null);
    setForm(
      item
        ? {
            ...emptyForm,
            ...Object.fromEntries(
              Object.entries(item).map(([k, v]) => [k, String(v ?? "")]),
            ),
          }
        : { ...emptyForm, status: kind === "receitas" ? "recebida" : "pago" },
    );
    modal.onOpen();
  };
  const filtered = items.filter(
    (x) =>
      (x.descricao || x.nome || "")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!cat || x.categoria === cat) &&
      (!month || x.data?.startsWith(month)) &&
      (!method ||
        (kind === "receitas" ? x.forma_recebimento : x.forma_pagamento) ===
          method),
  );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const item: RecordData = {
      id: editing?.id || uid(),
      categoria: form.categoria,
      observacao: form.observacao,
    };
    if (kind === "metas_financeiras")
      Object.assign(item, {
        nome: form.nome,
        valor_alvo: Number(form.valor_alvo),
        valor_atual: Number(form.valor_atual),
        aporte_mensal: Number(form.aporte_mensal),
        data_objetivo: form.data_objetivo,
      });
    else
      Object.assign(item, {
        descricao: form.descricao,
        valor: Number(form.valor),
        data: form.data,
        ...(kind === "despesas"
          ? {
              forma_pagamento: form.forma_pagamento,
              status: form.status,
              tipo: form.tipo,
            }
          : {
              forma_recebimento: form.forma_recebimento,
              status: form.status,
              tipo: form.tipo,
              recorrente: form.recorrente === "true",
              dia_recebimento: form.dia_recebimento
                ? Number(form.dia_recebimento)
                : undefined,
            }),
      });
    try {
      await onSave(item);
      toast({
        title: `${cfg.singular[0].toUpperCase() + cfg.singular.slice(1)} ${editing ? "atualizada" : "adicionada"}`,
        status: "success",
      });
      modal.onClose();
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: (err as Error).message,
        status: "error",
      });
    }
  };
  const del = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    try {
      await onRemove(id);
      toast({ title: "Registro excluído", status: "success" });
    } catch (err) {
      toast({
        title: "Erro ao excluir",
        description: (err as Error).message,
        status: "error",
      });
    }
  };
  const f =
    (key: keyof FormData) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm({ ...form, [key]: e.target.value });
  return (
    <>
      <PageTitle
        title={cfg.title}
        subtitle={cfg.subtitle}
        action={
          <Button leftIcon={<Plus size={18} />} onClick={() => open()}>
            Nova {cfg.singular}
          </Button>
        }
      />
      <Panel p="18px" mb="16px">
        <Flex gap="12px" direction={{ base: "column", md: "row" }}>
          <InputGroup>
            <InputLeftElement>
              <Search size={17} />
            </InputLeftElement>
            <Input
              placeholder="Buscar por descrição..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              borderColor="line"
            />
          </InputGroup>
          <Select
            maxW={{ md: "220px" }}
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            borderColor="line"
          >
            <option value="">Todas as categorias</option>
            {categoryOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Input
            type="month"
            maxW={{ md: "180px" }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            borderColor="line"
          />
          {kind !== "metas_financeiras" && (
            <Select
              maxW={{ md: "210px" }}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              borderColor="line"
            >
              <option value="">Todas as formas</option>
              {[
                "Pix",
                "Dinheiro",
                "Débito",
                "Crédito",
                "Boleto",
                "Transferência",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          )}
        </Flex>
      </Panel>
      <Panel overflow="hidden">
        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Th>{kind === "metas_financeiras" ? "Meta" : "Descrição"}</Th>
                <Th>Categoria</Th>
                {kind === "metas_financeiras" ? (
                  <>
                    <Th>Progresso</Th>
                    <Th>Objetivo</Th>
                  </>
                ) : (
                  <>
                    <Th>Data</Th>
                    <Th isNumeric>Valor</Th>
                  </>
                )}
                <Th w="100px" />
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((x) => (
                <Tr key={x.id} _hover={{ bg: "panel2" }}>
                  <Td>
                    <Flex align="center" gap="12px">
                      <Center
                        w="36px"
                        h="36px"
                        borderRadius="11px"
                        bg={
                          kind === "despesas"
                            ? "rgba(245,101,101,.12)"
                            : "rgba(15,98,254,.14)"
                        }
                        color={kind === "despesas" ? "red.300" : "brand.300"}
                      >
                        {cfg.icon}
                      </Center>
                      <Box>
                        <Text fontWeight="600">{x.descricao || x.nome}</Text>
                        {kind === "despesas" && (
                          <Badge
                            mt="1"
                            colorScheme={
                              x.status === "pendente" ? "orange" : "green"
                            }
                          >
                            {x.status || "pago"}
                          </Badge>
                        )}
                        {x.observacao && (
                          <Text color="muted" fontSize="xs">
                            {x.observacao}
                          </Text>
                        )}
                      </Box>
                    </Flex>
                  </Td>
                  <Td>
                    <Badge variant="subtle" colorScheme="blue">
                      {x.categoria}
                    </Badge>
                  </Td>
                  {kind === "metas_financeiras" ? (
                    <>
                      <Td minW="180px">
                        <Flex justify="space-between" fontSize="xs" mb="5px">
                          <Text>{money(x.valor_atual)}</Text>
                          <Text>
                            {Math.round(
                              ((x.valor_atual || 0) / (x.valor_alvo || 1)) *
                                100,
                            )}
                            %
                          </Text>
                        </Flex>
                        <Progress
                          value={
                            ((x.valor_atual || 0) / (x.valor_alvo || 1)) * 100
                          }
                          h="6px"
                          borderRadius="full"
                        />
                      </Td>
                      <Td>
                        <Text fontWeight="600">{money(x.valor_alvo)}</Text>
                        <Text fontSize="xs" color="muted">
                          até {dateBR(x.data_objetivo)}
                        </Text>
                      </Td>
                    </>
                  ) : (
                    <>
                      <Td color="muted">{dateBR(x.data)}</Td>
                      <Td
                        isNumeric
                        fontWeight="700"
                        color={kind === "receitas" ? "green.300" : "textMain"}
                      >
                        {kind === "receitas" ? "+ " : "- "}
                        {money(x.valor)}
                      </Td>
                    </>
                  )}
                  <Td>
                    <Flex>
                      <IconButton
                        aria-label="Editar"
                        icon={<Edit2 size={16} />}
                        variant="ghost"
                        size="sm"
                        onClick={() => open(x)}
                      />
                      <IconButton
                        aria-label="Excluir"
                        icon={<Trash2 size={16} />}
                        colorScheme="red"
                        variant="ghost"
                        size="sm"
                        onClick={() => del(x.id)}
                      />
                    </Flex>
                  </Td>
                </Tr>
              ))}
              {filtered.length === 0 && (
                <Tr>
                  <Td colSpan={5}>
                    <Center py="52px" flexDir="column" color="muted">
                      <CircleDollarSign size={32} />
                      <Text mt="12px">Nenhum registro encontrado.</Text>
                    </Center>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Panel>
      <Modal isOpen={modal.isOpen} onClose={modal.onClose} size="lg">
        <ModalOverlay backdropFilter="blur(5px)" />
        <ModalContent as="form" onSubmit={submit}>
          <ModalHeader>
            {editing ? "Editar" : "Nova"} {cfg.singular}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing="16px">
              {kind === "metas_financeiras" ? (
                <>
                  <Field label="Nome da meta">
                    <Input required value={form.nome} onChange={f("nome")} />
                  </Field>
                  <Field label="Categoria">
                    <Select
                      isRequired
                      value={form.categoria}
                      onChange={f("categoria")}
                    >
                      <option value="">Selecione</option>
                      {categoryOptions.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Valor alvo">
                    <CurrencyInput
                      isRequired
                      value={Number(form.valor_alvo)}
                      onValueChange={(value) =>
                        setForm({ ...form, valor_alvo: String(value) })
                      }
                    />
                  </Field>
                  <Field label="Valor atual">
                    <CurrencyInput
                      isRequired
                      value={Number(form.valor_atual)}
                      onValueChange={(value) =>
                        setForm({ ...form, valor_atual: String(value) })
                      }
                    />
                  </Field>
                  <Field label="Aporte mensal">
                    <CurrencyInput
                      isRequired
                      value={Number(form.aporte_mensal)}
                      onValueChange={(value) =>
                        setForm({ ...form, aporte_mensal: String(value) })
                      }
                    />
                  </Field>
                  <Field label="Data objetivo">
                    <DateInputBR
                      isRequired
                      value={form.data_objetivo}
                      onChange={f("data_objetivo")}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Descrição">
                    <Input
                      isRequired
                      value={form.descricao}
                      onChange={f("descricao")}
                    />
                  </Field>
                  <Field label="Valor">
                    <CurrencyInput
                      isRequired
                      value={Number(form.valor)}
                      onValueChange={(value) =>
                        setForm({ ...form, valor: String(value) })
                      }
                    />
                  </Field>
                  <Field label="Categoria">
                    <Select
                      required
                      value={form.categoria}
                      onChange={f("categoria")}
                    >
                      <option value="">Selecione</option>
                      {categoryOptions.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Data">
                    <DateInputBR
                      isRequired
                      value={form.data}
                      onChange={f("data")}
                    />
                  </Field>
                  {kind === "despesas" && (
                    <>
                      <Field label="Forma de pagamento">
                        <Select
                          value={form.forma_pagamento}
                          onChange={f("forma_pagamento")}
                        >
                          {[
                            "Pix",
                            "Dinheiro",
                            "Débito",
                            "Crédito",
                            "Boleto",
                            "Transferência",
                          ].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Status">
                        <Select value={form.status} onChange={f("status")}>
                          <option value="pendente">Pendente</option>
                          <option value="pago">Pago</option>
                          <option value="atrasado">Atrasado</option>
                          <option value="cancelado">Cancelado</option>
                        </Select>
                      </Field>
                      <Field label="Tipo">
                        <Select value={form.tipo} onChange={f("tipo")}>
                          <option value="fixa">Fixa</option>
                          <option value="variavel">Variável</option>
                          <option value="recorrente">Recorrente</option>
                          <option value="avulsa">Avulsa</option>
                        </Select>
                      </Field>
                    </>
                  )}
                  {kind === "receitas" && (
                    <>
                      <Field label="Forma de recebimento">
                        <Select
                          value={form.forma_recebimento}
                          onChange={f("forma_recebimento")}
                        >
                          {["Pix", "Dinheiro", "Boleto", "Transferência"].map(
                            (c) => (
                              <option key={c}>{c}</option>
                            ),
                          )}
                        </Select>
                      </Field>
                      <Field label="Status">
                        <Select value={form.status} onChange={f("status")}>
                          <option value="recebida">Recebida</option>
                          <option value="pendente">Prevista</option>
                          <option value="cancelada">Cancelada</option>
                        </Select>
                      </Field>
                      <Field label="Tipo">
                        <Select value={form.tipo} onChange={f("tipo")}>
                          <option value="avulsa">Avulsa</option>
                          <option value="fixa">Fixa</option>
                          <option value="variavel">Variável</option>
                          <option value="recorrente">Recorrente</option>
                        </Select>
                      </Field>
                      <Field label="Receita recorrente">
                        <Select
                          value={form.recorrente}
                          onChange={f("recorrente")}
                        >
                          <option value="false">Não</option>
                          <option value="true">Sim</option>
                        </Select>
                      </Field>
                      {form.recorrente === "true" && (
                        <Field label="Dia de recebimento">
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={form.dia_recebimento}
                            onChange={f("dia_recebimento")}
                          />
                        </Field>
                      )}
                    </>
                  )}
                </>
              )}
              <GridItem colSpan={{ md: 2 }}>
                <Field label="Observação (opcional)">
                  <Textarea
                    value={form.observacao}
                    onChange={f("observacao")}
                    resize="vertical"
                  />
                </Field>
              </GridItem>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter gap="10px">
            <Button variant="ghost" onClick={modal.onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar {cfg.singular}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <FormControl>
      <FormLabel fontSize="sm">{label}</FormLabel>
      {children}
    </FormControl>
  );
}

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [page, setPage] = useState<Page>("dashboard");
  const finance = useFinanceData(user?.id || "");
  const logout = async () => {
    await signOut();
  };
  const content = useMemo(() => {
    if (finance.loading)
      return (
        <Center h="60vh">
          <Spinner color="brand.400" size="xl" />
        </Center>
      );
    if (page === "dashboard")
      return (
        <DashboardPage
          data={finance.data}
          profile={finance.profile}
          onNavigate={setPage}
        />
      );
    if (page === "receitas" || page === "despesas") {
      const kind: Kind = page;
      return (
        <CrudPage
          kind={kind}
          items={finance.data[kind]}
          customCategories={finance.data.categorias_financeiras
            .filter(
              (category) =>
                (category.status ?? "ativa") === "ativa" &&
                category.tipo === (kind === "receitas" ? "receita" : "despesa"),
            )
            .map((category) => category.nome ?? "")
            .filter(Boolean)}
          onSave={(x) =>
            finance.save(kind, {
              ...x,
              categoria_id:
                finance.data.categorias_financeiras.find(
                  (category) =>
                    category.nome === x.categoria &&
                    category.tipo ===
                      (kind === "receitas" ? "receita" : "despesa"),
                )?.id ??
                finance.data[kind].find((record) => record.id === x.id)
                  ?.categoria_id,
            })
          }
          onRemove={(id) => finance.remove(kind, id)}
        />
      );
    }
    if (page === "metas")
      return (
        <GoalsPage
          goals={finance.data.metas_financeiras}
          contributions={finance.data.aportes_metas}
          categories={finance.data.categorias_financeiras}
          save={finance.save}
          remove={finance.remove}
        />
      );
    if (page === "calculadora") return <CalculatorPage />;
    if (page === "controle") return <SpendingControlPage data={finance.data} />;
    if (page === "perfil")
      return (
        <ProfilePage
          userId={user?.id ?? ""}
          email={user?.email ?? ""}
          onUpdated={finance.updateProfile}
        />
      );
    return (
      <OperationalModule
        page={page}
        data={finance.data}
        profile={finance.profile}
        save={finance.save}
        remove={finance.remove}
      />
    );
  }, [page, finance, user?.id, user?.email]);
  if (authLoading || !user)
    return (
      <Center minH="100vh">
        <Spinner color="brand.400" size="xl" />
      </Center>
    );
  return (
    <Shell
      page={page}
      setPage={setPage}
      email={user.email ?? ""}
      onLogout={logout}
    >
      {content}
    </Shell>
  );
}
