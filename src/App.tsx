import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
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
  Tooltip,
  Tr,
  useColorMode,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calculator,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  CreditCard,
  Edit2,
  FileBarChart,
  Goal,
  Home,
  Landmark,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Plus,
  ReceiptText,
  Repeat2,
  Search,
  ShieldCheck,
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
import StrategicModule from "./pages/Strategic";
import type { FinanceRecord, FinanceTable, Profile } from "./types/database";
import { formatCurrencyBRL, formatDateBR } from "./utils/formatters";
import { useAuth } from "./hooks/useAuth";
import { BrandLogo } from "./components/brand/BrandLogo";
import { CurrencyInput } from "./components/forms/CurrencyInput";
import { DateInputBR } from "./components/forms/DateInputBR";
import { ConfirmModal } from "./components/ui/ConfirmModal";

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
  | "evolucao"
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
  contas_financeiras: [],
  transferencias_internas: [],
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
    if (!updated.salario_recorrente) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const salary = data.receitas.find(
        (item) =>
          item.origem === "salario_perfil" &&
          item.status === "pendente" &&
          item.competencia?.startsWith(currentMonth),
      );
      if (salary) {
        const canceled = await financeService.save(
          "receitas",
          { ...salary, status: "cancelada" },
          userId,
        );
        setData((current) => ({
          ...current,
          receitas: current.receitas.map((item) =>
            item.id === canceled.id ? canceled : item,
          ),
        }));
      }
      return;
    }
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

type NavItem = [Page, string, ReactElement];
type NavGroup = {
  id: string;
  label: string;
  icon: ReactElement;
  items: NavItem[];
};
const navGroups: NavGroup[] = [
  {
    id: "principal",
    label: "Principal",
    icon: <Home size={18} />,
    items: [
      ["dashboard", "Dashboard", <Home size={18} />],
      ["calendario", "Calendário", <CalendarDays size={18} />],
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: <Activity size={18} />,
    items: [
      ["movimentacoes", "Movimentações", <Activity size={18} />],
      ["timeline", "Timeline", <CalendarDays size={18} />],
      ["receitas", "Receitas", <ArrowUpRight size={18} />],
      ["despesas", "Despesas", <ArrowDownRight size={18} />],
      ["categorias", "Categorias", <Tags size={18} />],
      ["importacao", "Importação Rápida", <Plus size={18} />],
      ["recorrentes", "Recorrentes", <Repeat2 size={18} />],
      ["assinaturas", "Assinaturas", <Repeat2 size={18} />],
      ["transferencias", "Transferências", <Activity size={18} />],
    ],
  },
  {
    id: "cartoes",
    label: "Cartões",
    icon: <CreditCard size={18} />,
    items: [["cartoes", "Cartões", <CreditCard size={18} />]],
  },
  {
    id: "planejamento",
    label: "Planejamento",
    icon: <Goal size={18} />,
    items: [
      ["metas", "Metas", <Goal size={18} />],
      ["reserva", "Reserva de Emergência", <ShieldCheck size={18} />],
      ["orcamentos", "Orçamentos", <ReceiptText size={18} />],
      ["projecoes", "Projeções", <TrendingUp size={18} />],
    ],
  },
  {
    id: "patrimonio",
    label: "Patrimônio",
    icon: <Landmark size={18} />,
    items: [
      ["contas", "Contas", <Landmark size={18} />],
      ["investimentos", "Investimentos", <TrendingUp size={18} />],
      ["patrimonio", "Patrimônio", <Landmark size={18} />],
      ["evolucao", "Evolução Patrimonial", <BarChart3 size={18} />],
    ],
  },
  {
    id: "analises",
    label: "Análises",
    icon: <BarChart3 size={18} />,
    items: [
      ["controle", "Controle de Gastos", <ReceiptText size={18} />],
      ["relatorios", "Relatórios", <FileBarChart size={18} />],
      ["comparativo", "Comparativo", <BarChart3 size={18} />],
      ["fechamento", "Fechamento Mensal", <CalendarDays size={18} />],
      ["alertas", "Alertas", <Bell size={18} />],
      ["notificacoes", "Notificações", <Bell size={18} />],
      ["assistente", "Assistente", <CircleDollarSign size={18} />],
      ["exportacao", "Exportação", <FileBarChart size={18} />],
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    icon: <UserRound size={18} />,
    items: [
      ["calculadora", "Calculadora", <Calculator size={18} />],
      ["perfil", "Perfil", <UserRound size={18} />],
    ],
  },
];
const nav = navGroups.flatMap((group) => group.items);
function Sidebar({
  page,
  setPage,
  onClose,
  email,
  onLogout,
  collapsed = false,
}: {
  page: Page;
  setPage: (p: Page) => void;
  onClose?: () => void;
  email?: string;
  onLogout?: () => void;
  collapsed?: boolean;
}) {
  const activeGroupId = navGroups.find((group) =>
    group.items.some(([id]) => id === page),
  )?.id;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem("novawave-sidebar-groups");
    if (stored) return JSON.parse(stored) as Record<string, boolean>;
    return { principal: true };
  });
  const [manuallyClosedGroups, setManuallyClosedGroups] = useState<
    Record<string, boolean>
  >(() => {
    const stored = localStorage.getItem("novawave-sidebar-closed-groups");
    return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
  });
  const toggleGroup = (id: string) =>
    setOpenGroups((current) => {
      const isAutoOpen = id === activeGroupId && !manuallyClosedGroups[id];
      const isOpen = Boolean(current[id] || isAutoOpen);
      const willOpen = !isOpen;
      const next = { ...current, [id]: willOpen };
      localStorage.setItem("novawave-sidebar-groups", JSON.stringify(next));
      setManuallyClosedGroups((closed) => {
        const updated = { ...closed, [id]: !willOpen };
        if (willOpen) delete updated[id];
        localStorage.setItem(
          "novawave-sidebar-closed-groups",
          JSON.stringify(updated),
        );
        return updated;
      });
      return next;
    });
  const go = (id: Page) => {
    setPage(id);
    onClose?.();
  };
  const isGroupActive = (group: NavGroup) =>
    group.items.some(([id]) => id === page);
  const compactItems = nav.filter(
    ([id], index, self) => self.findIndex(([other]) => other === id) === index,
  );
  return (
    <Flex
      h="full"
      direction="column"
      p={collapsed ? "16px 10px" : "18px 14px"}
      bg="panel"
      borderRight="1px solid"
      borderColor="line"
      overflow="hidden"
    >
      <Flex
        px={collapsed ? "4px" : "6px"}
        pb="16px"
        mb="12px"
        borderBottom="1px solid"
        borderColor="line"
        align="center"
        justify={collapsed ? "center" : "space-between"}
        flexShrink={0}
      >
        <BrandLogo compact={collapsed} size={42} />
      </Flex>
      <Box
        flex="1"
        overflowY="auto"
        overflowX="hidden"
        pr={collapsed ? "0" : "4px"}
        sx={{
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(148,163,184,.28)",
            borderRadius: "999px",
          },
        }}
      >
        {collapsed ? (
          <Stack spacing="6px" align="center">
            {compactItems.map(([id, label, icon]) => (
              <Tooltip key={id} label={label} placement="right" hasArrow>
                <IconButton
                  aria-label={label}
                  icon={icon}
                  onClick={() => go(id)}
                  variant={page === id ? "solid" : "ghost"}
                  colorScheme={page === id ? "blue" : undefined}
                  color={page === id ? "white" : "muted"}
                />
              </Tooltip>
            ))}
          </Stack>
        ) : (
          <Stack spacing="8px">
            {navGroups.map((group) => {
              const active = isGroupActive(group);
              const open = Boolean(
                openGroups[group.id] ||
                  (active && !manuallyClosedGroups[group.id]),
              );
              return (
                <Box key={group.id}>
                  <Button
                    w="full"
                    variant="ghost"
                    justifyContent="space-between"
                    color={active ? "textMain" : "muted"}
                    bg={active ? "rgba(15,98,254,.10)" : "transparent"}
                    _hover={{ bg: "panel2", color: "textMain" }}
                    onClick={() => toggleGroup(group.id)}
                    leftIcon={group.icon}
                    rightIcon={open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  >
                    <Text flex="1" textAlign="left" fontSize="sm">
                      {group.label}
                    </Text>
                  </Button>
                  {open && (
                    <Stack spacing="4px" mt="5px" pl="3">
                      {group.items.map(([id, label, icon], index) => {
                        const itemActive = page === id;
                        return (
                          <Button
                            key={`${group.id}-${id}-${label}-${index}`}
                            onClick={() => go(id)}
                            justifyContent="flex-start"
                            gap="10px"
                            h="40px"
                            variant="ghost"
                            fontSize="sm"
                            color={itemActive ? "white" : "muted"}
                            bg={
                              itemActive
                                ? "linear-gradient(90deg,rgba(15,98,254,.32),rgba(108,59,255,.12))"
                                : "transparent"
                            }
                            borderLeft="2px solid"
                            borderColor={itemActive ? "brand.400" : "transparent"}
                            _hover={{ bg: "panel2", color: "textMain" }}
                          >
                            {icon}
                            {label}
                          </Button>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
      <Box
        pt="14px"
        mt="14px"
        borderTop="1px solid"
        borderColor="line"
        flexShrink={0}
      >
        {collapsed ? (
          <Tooltip label={email ?? "Minha conta"} placement="right" hasArrow>
            <IconButton
              aria-label="Sair"
              icon={<LogOut size={17} />}
              variant="ghost"
              onClick={onLogout}
            />
          </Tooltip>
        ) : (
          <Flex align="center" gap="3">
            <Avatar size="sm" name={email} />
            <Box minW="0" flex="1">
              <Text fontSize="sm" noOfLines={1}>
                Minha conta
              </Text>
              <Text fontSize="xs" color="muted" noOfLines={1}>
                {email}
              </Text>
            </Box>
            <IconButton
              aria-label="Sair"
              icon={<LogOut size={16} />}
              size="sm"
              variant="ghost"
              onClick={onLogout}
            />
          </Flex>
        )}
      </Box>
    </Flex>
  );
}

function Shell({
  page,
  setPage,
  email,
  onLogout,
  children,
  data,
}: {
  page: Page;
  setPage: (p: Page) => void;
  email: string;
  onLogout: () => void;
  children: ReactNode;
  data?: Record<DataKind, RecordData[]>;
}) {
  const mobile = useDisclosure();
  const [globalQuery, setGlobalQuery] = useState("");
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("novawave-sidebar-collapsed") === "true",
  );
  const toggleSidebar = () =>
    setCollapsed((value) => {
      localStorage.setItem("novawave-sidebar-collapsed", String(!value));
      return !value;
    });
  const { colorMode, toggleColorMode } = useColorMode();
  const searchResults = useMemo(() => {
    const query = globalQuery.trim().toLowerCase();
    if (!query || !data) return [];
    const pageByTable: Partial<Record<DataKind, Page>> = {
      receitas: "receitas",
      despesas: "despesas",
      cartoes: "cartoes",
      compras_cartao: "cartoes",
      parcelas_cartao: "cartoes",
      faturas_cartao: "cartoes",
      metas_financeiras: "metas",
      aportes_metas: "metas",
      investimentos: "investimentos",
      movimentacoes_investimentos: "investimentos",
      contas_recorrentes: "recorrentes",
      categorias_financeiras: "categorias",
      eventos_financeiros: "calendario",
      orcamentos_categoria: "controle",
    };
    const rows = (Object.keys(data) as DataKind[]).flatMap((table) =>
      data[table]
        .filter((item) =>
          [
            item.descricao,
            item.nome,
            item.titulo,
            item.categoria,
            item.tipo,
            item.status,
            item.banco,
            item.instituicao,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
        .slice(0, 4)
        .map((item) => ({
          id: `${table}-${item.id}`,
          title: item.descricao || item.nome || item.titulo || "Registro",
          subtitle: `${table.replaceAll("_", " ")} · ${item.categoria ?? item.status ?? ""}`,
          page: pageByTable[table] ?? "dashboard",
        })),
    );
    const modules = nav
      .filter(([, label]) => label.toLowerCase().includes(query))
      .map(([id, label]) => ({
        id: `nav-${id}`,
        title: label,
        subtitle: "Módulo do sistema",
        page: id,
      }));
    return [...modules, ...rows].slice(0, 8);
  }, [data, globalQuery]);
  return (
    <Flex minH="100vh">
      <Box
        display={{ base: "none", lg: "block" }}
        w={collapsed ? "82px" : "244px"}
        transition="width .25s ease"
        position="fixed"
        insetY="0"
      >
        <Sidebar
          page={page}
          setPage={setPage}
          collapsed={collapsed}
          email={email}
          onLogout={onLogout}
        />
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
              <Box position="relative">
              <InputGroup size="sm" w="320px">
                <InputLeftElement>
                  <Search size={16} />
                </InputLeftElement>
                <Input
                  placeholder="Buscar em todo o sistema..."
                  value={globalQuery}
                  onChange={(e) => setGlobalQuery(e.target.value)}
                  bg="panel"
                  borderColor="line"
                />
              </InputGroup>
              {searchResults.length > 0 && (
                <Box
                  position="absolute"
                  top="42px"
                  w="full"
                  bg="panel"
                  border="1px solid"
                  borderColor="line"
                  borderRadius="xl"
                  boxShadow="xl"
                  overflow="hidden"
                >
                  {searchResults.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      w="full"
                      h="auto"
                      justifyContent="flex-start"
                      p="3"
                      borderRadius="0"
                      onClick={() => {
                        setPage(item.page);
                        setGlobalQuery("");
                      }}
                    >
                      <Box textAlign="left">
                        <Text fontSize="sm">{item.title}</Text>
                        <Text fontSize="xs" color="muted">
                          {item.subtitle}
                        </Text>
                      </Box>
                    </Button>
                  ))}
                </Box>
              )}
              </Box>
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
      <Box
        display={{ base: "block", md: "none" }}
        position="fixed"
        right="18px"
        bottom="18px"
        zIndex="20"
      >
        <Menu placement="top-end">
          <MenuButton
            as={IconButton}
            aria-label="Ações rápidas"
            icon={<Plus size={22} />}
            borderRadius="full"
            size="lg"
            boxShadow="xl"
          />
          <MenuList bg="panel" borderColor="line">
            <MenuItem
              bg="transparent"
              icon={<ArrowUpRight size={16} />}
              onClick={() => setPage("receitas")}
            >
              Nova receita
            </MenuItem>
            <MenuItem
              bg="transparent"
              icon={<ArrowDownRight size={16} />}
              onClick={() => setPage("despesas")}
            >
              Nova despesa
            </MenuItem>
            <MenuItem
              bg="transparent"
              icon={<CreditCard size={16} />}
              onClick={() => setPage("cartoes")}
            >
              Nova compra
            </MenuItem>
            <MenuItem
              bg="transparent"
              icon={<Activity size={16} />}
              onClick={() => setPage("transferencias")}
            >
              Nova transferência
            </MenuItem>
            <MenuItem
              bg="transparent"
              icon={<Goal size={16} />}
              onClick={() => setPage("metas")}
            >
              Novo aporte
            </MenuItem>
            <MenuItem
              bg="transparent"
              icon={<TrendingUp size={16} />}
              onClick={() => setPage("investimentos")}
            >
              Novo investimento
            </MenuItem>
          </MenuList>
        </Menu>
      </Box>
      <Drawer isOpen={mobile.isOpen} placement="left" onClose={mobile.onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="270px">
          <DrawerBody p="0">
            <Sidebar
              page={page}
              setPage={setPage}
              onClose={mobile.onClose}
              email={email}
              onLogout={onLogout}
            />
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
  const [pendingDelete, setPendingDelete] = useState<RecordData | null>(null);
  const [deleting, setDeleting] = useState(false);
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
  const del = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onRemove(pendingDelete.id);
      toast({ title: "Registro excluído", status: "success" });
      setPendingDelete(null);
    } catch (err) {
      toast({
        title: "Erro ao excluir",
        description: (err as Error).message,
        status: "error",
      });
    } finally {
      setDeleting(false);
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
                        onClick={() => setPendingDelete(x)}
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
      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void del()}
        title={`Excluir ${cfg.singular}`}
        description="Essa ação remove o lançamento real do banco e atualiza dashboard, relatórios e calendário automaticamente."
        itemName={pendingDelete?.descricao || pendingDelete?.nome}
        impact={
          pendingDelete?.origem?.startsWith("recorrencia:")
            ? "Este lançamento foi gerado por uma recorrência. Ao excluir, a recorrência poderá gerar novamente a previsão do mês."
            : "Confira se este registro não é usado como referência em outro controle financeiro."
        }
        confirmLabel="Confirmar exclusão"
        isLoading={deleting}
      />
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
    if (
      [
        "saude",
        "projecoes",
        "alertas",
        "notificacoes",
        "comparativo",
        "reserva",
        "planejamento",
        "assinaturas",
        "transferencias",
        "assistente",
        "patrimonio",
        "movimentacoes",
        "timeline",
        "importacao",
        "fechamento",
        "orcamentos",
        "exportacao",
        "contas",
        "evolucao",
      ].includes(page)
    )
      return (
        <StrategicModule
          page={
            page as
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
              | "evolucao"
          }
          data={finance.data}
          profile={finance.profile}
          save={finance.save}
        />
      );
    if (page === "perfil")
      return (
        <ProfilePage
          userId={user?.id ?? ""}
          email={user?.email ?? ""}
          onUpdated={finance.updateProfile}
          data={finance.data}
        />
      );
    return (
      <OperationalModule
        page={
          page as
            | "cartoes"
            | "investimentos"
            | "calendario"
            | "recorrentes"
            | "categorias"
            | "relatorios"
        }
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
      data={finance.data}
    >
      {content}
    </Shell>
  );
}
