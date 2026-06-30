import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Avatar,
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
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  useColorMode,
  useToast,
} from "@chakra-ui/react";
import {
  Bell,
  Camera,
  CreditCard,
  Landmark,
  Lock,
  Palette,
  Save,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { FinanceRecord, FinanceTable, Profile } from "../../types/database";
import { profileService } from "../../services/profileService";
import { CurrencyInput } from "../../components/forms/CurrencyInput";
import { formatCurrencyBRL } from "../../utils/formatters";

const panel = {
  bg: "panel",
  border: "1px solid",
  borderColor: "line",
  borderRadius: "2xl",
  boxShadow: "card",
} as const;

const preferenceDefaults = {
  sidebarDefault: "expanded",
  density: "comfortable",
  dashboardPreference: "complete",
};

type Preferences = typeof preferenceDefaults;

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Box {...panel} p="4">
      <Flex justify="space-between" color="brand.300">
        <Text color="muted" fontSize="xs">
          {label}
        </Text>
        {icon}
      </Flex>
      <Text fontWeight="900" mt="2" noOfLines={2}>
        {value}
      </Text>
    </Box>
  );
}

export default function ProfilePage({
  userId,
  email,
  onUpdated,
  data,
}: {
  userId: string;
  email: string;
  onUpdated?: (profile: Profile) => void | Promise<void>;
  data?: Record<FinanceTable, FinanceRecord[]>;
}) {
  const [profile, setProfile] = useState<Partial<Profile>>({
    email,
    moeda: "BRL",
    timezone: "America/Sao_Paulo",
    tema: "dark",
    visualizacao_inicial: "dashboard",
    notificacoes: true,
    salario_recorrente: false,
    salario_auto_recebido: false,
    forma_recebimento_salario: "Pix",
  });
  const [preferences, setPreferences] = useState<Preferences>(() => ({
    ...preferenceDefaults,
    ...JSON.parse(localStorage.getItem("novawave-profile-preferences") ?? "{}"),
  }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const toast = useToast();
  const { colorMode, setColorMode } = useColorMode();

  useEffect(() => {
    profileService
      .get(userId)
      .then(setProfile)
      .catch((error) =>
        toast({
          title: "Erro ao carregar perfil",
          description: error.message,
          status: "error",
        }),
      )
      .finally(() => setLoading(false));
  }, [userId, toast]);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const setPreference = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) =>
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      localStorage.setItem("novawave-profile-preferences", JSON.stringify(next));
      if (key === "sidebarDefault")
        localStorage.setItem(
          "novawave-sidebar-collapsed",
          String(value === "collapsed"),
        );
      return next;
    });

  const validateProfile = () => {
    if (!profile.nome?.trim()) throw new Error("Informe o nome completo.");
    if (!profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))
      throw new Error("Informe um e-mail válido.");
    if ((profile.salario_previsto ?? 0) < 0)
      throw new Error("O salário não pode ser negativo.");
    if (
      profile.dia_salario &&
      (profile.dia_salario < 1 || profile.dia_salario > 31)
    )
      throw new Error("O dia de recebimento deve estar entre 1 e 31.");
    if (profile.telefone && profile.telefone.replace(/\D/g, "").length < 10)
      throw new Error("Informe um telefone válido com DDD.");
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      validateProfile();
      const updated = await profileService.update(userId, {
        ...profile,
        salary_recurring_enabled: profile.salario_recorrente ?? false,
        salary_confirm_on_day: profile.salario_auto_recebido ?? false,
        salary_day: profile.dia_salario ?? null,
        monthly_salary: profile.salario_previsto ?? null,
        main_bank: profile.banco_principal ?? null,
        main_account: profile.conta_principal ?? null,
        default_currency: profile.moeda ?? "BRL",
        financial_main_goal: profile.objetivo_principal ?? null,
      });
      if (profile.email && profile.email !== email)
        await profileService.updateEmail(profile.email);
      setProfile(updated);
      await onUpdated?.(updated);
      toast({ title: "Perfil atualizado", status: "success" });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: (error as Error).message,
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const preview = URL.createObjectURL(file);
      set("avatar_url", preview);
      const url = await profileService.uploadAvatar(userId, file);
      set("avatar_url", url);
      await profileService.update(userId, { avatar_url: url });
      toast({ title: "Foto atualizada", status: "success" });
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: (error as Error).message,
        status: "error",
      });
    }
  };

  const updatePassword = async () => {
    try {
      if (password.length < 6)
        throw new Error("A senha deve ter pelo menos 6 caracteres.");
      if (password !== confirmPassword)
        throw new Error("A confirmação de senha não confere.");
      await profileService.updatePassword(password);
      setPassword("");
      setConfirmPassword("");
      toast({ title: "Senha alterada", status: "success" });
    } catch (error) {
      toast({
        title: "Erro ao alterar senha",
        description: (error as Error).message,
        status: "error",
      });
    }
  };

  if (loading)
    return (
      <Center minH="420px">
        <Spinner color="brand.400" size="xl" />
      </Center>
    );

  const activeCards =
    data?.cartoes.filter((card) => (card.status ?? "ativa") === "ativa")
      .length ?? 0;
  const categories = data?.categorias_financeiras.length ?? 0;
  const createdAt = (profile as Partial<Profile> & { created_at?: string })
    .created_at;
  const accountCreated = createdAt
    ? new Date(createdAt).toLocaleDateString("pt-BR")
    : "Conta ativa";

  return (
    <form onSubmit={save}>
      <Box
        {...panel}
        p={{ base: "5", md: "7" }}
        mb="5"
        bg="linear-gradient(135deg,rgba(15,98,254,.18),rgba(108,59,255,.08))"
      >
        <Flex
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
          direction={{ base: "column", md: "row" }}
          gap="5"
        >
          <Flex gap="5" align="center">
            <Avatar
              size="xl"
              name={profile.nome ?? email}
              src={profile.avatar_url ?? undefined}
            />
            <Box>
              <Badge colorScheme="green" mb="2">
                Conta pessoal ativa
              </Badge>
              <Heading size="lg">{profile.nome || "Meu perfil"}</Heading>
              <Text color="muted">{profile.email ?? email}</Text>
              <Text color="muted" fontSize="sm">
                Criada em {accountCreated}
              </Text>
            </Box>
          </Flex>
          <Flex gap="2" wrap="wrap">
            <Button as="label" variant="outline" leftIcon={<Camera size={16} />}>
              Editar foto
              <Input type="file" accept="image/*" display="none" onChange={upload} />
            </Button>
            <Button type="submit" leftIcon={<Save size={17} />} isLoading={saving}>
              Salvar perfil
            </Button>
          </Flex>
        </Flex>
      </Box>

      <Grid templateColumns={{ base: "1fr", xl: "1fr 320px" }} gap="5">
        <Box {...panel} p={{ base: "4", md: "5" }}>
          <Tabs variant="soft-rounded" colorScheme="blue">
            <TabList overflowX="auto" pb="3">
              <Tab gap="2" flexShrink={0}>
                <UserRound size={16} />
                Dados pessoais
              </Tab>
              <Tab flexShrink={0}>Financeiro</Tab>
              <Tab gap="2" flexShrink={0}>
                <Lock size={16} />
                Segurança
              </Tab>
              <Tab gap="2" flexShrink={0}>
                <Palette size={16} />
                Aparência
              </Tab>
              <Tab gap="2" flexShrink={0}>
                <Bell size={16} />
                Notificações
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel px="0">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                  <FormControl isRequired>
                    <FormLabel>Nome completo</FormLabel>
                    <Input
                      value={profile.nome ?? ""}
                      onChange={(e) => set("nome", e.target.value)}
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>E-mail</FormLabel>
                    <Input
                      type="email"
                      value={profile.email ?? ""}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Telefone</FormLabel>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={profile.telefone ?? ""}
                      onChange={(e) => set("telefone", e.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Foto de perfil</FormLabel>
                    <Flex gap="2">
                      <Button as="label" variant="outline" leftIcon={<Camera size={15} />}>
                        Alterar foto
                        <Input
                          type="file"
                          accept="image/*"
                          display="none"
                          onChange={upload}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        colorScheme="red"
                        leftIcon={<Trash2 size={15} />}
                        onClick={() => set("avatar_url", null)}
                      >
                        Remover
                      </Button>
                    </Flex>
                  </FormControl>
                </SimpleGrid>
              </TabPanel>

              <TabPanel px="0">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                  <FormControl>
                    <FormLabel>Salário mensal previsto</FormLabel>
                    <CurrencyInput
                      value={profile.salario_previsto ?? 0}
                      onValueChange={(value) => set("salario_previsto", value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Dia de recebimento</FormLabel>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={profile.dia_salario ?? ""}
                      onChange={(e) =>
                        set(
                          "dia_salario",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Banco principal</FormLabel>
                    <Input
                      value={profile.banco_principal ?? ""}
                      onChange={(e) => set("banco_principal", e.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Conta principal</FormLabel>
                    <Select
                      value={profile.conta_principal ?? ""}
                      onChange={(e) => set("conta_principal", e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {data?.contas_financeiras
                        .filter((account) => account.status === "ativa")
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.nome}
                          </option>
                        ))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Moeda padrão</FormLabel>
                    <Select
                      value={profile.moeda ?? "BRL"}
                      onChange={(e) => set("moeda", e.target.value)}
                    >
                      <option value="BRL">Real brasileiro (BRL)</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Forma de recebimento</FormLabel>
                    <Select
                      value={profile.forma_recebimento_salario ?? "Pix"}
                      onChange={(e) =>
                        set("forma_recebimento_salario", e.target.value)
                      }
                    >
                      {["Pix", "Transferência", "Dinheiro", "Boleto"].map(
                        (method) => (
                          <option key={method}>{method}</option>
                        ),
                      )}
                    </Select>
                  </FormControl>
                  <FormControl
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <FormLabel mb="0">Salário recorrente</FormLabel>
                      <Text fontSize="xs" color="muted">
                        Gera apenas uma previsão por competência.
                      </Text>
                    </Box>
                    <Switch
                      isChecked={profile.salario_recorrente ?? false}
                      onChange={(e) => {
                        set("salario_recorrente", e.target.checked);
                        set("salary_recurring_enabled", e.target.checked);
                      }}
                    />
                  </FormControl>
                  <FormControl
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <FormLabel mb="0">Confirmar no dia</FormLabel>
                      <Text fontSize="xs" color="muted">
                        Marca como recebido no dia do salário.
                      </Text>
                    </Box>
                    <Switch
                      isChecked={profile.salario_auto_recebido ?? false}
                      onChange={(e) => {
                        set("salario_auto_recebido", e.target.checked);
                        set("salary_confirm_on_day", e.target.checked);
                      }}
                    />
                  </FormControl>
                  <FormControl gridColumn={{ md: "span 2" }}>
                    <FormLabel>Objetivo financeiro principal</FormLabel>
                    <Textarea
                      value={profile.objetivo_principal ?? ""}
                      onChange={(e) =>
                        set("objetivo_principal", e.target.value)
                      }
                    />
                  </FormControl>
                </SimpleGrid>
              </TabPanel>

              <TabPanel px="0">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4" maxW="760px">
                  <FormControl>
                    <FormLabel>Nova senha</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Confirmar nova senha</FormLabel>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </FormControl>
                </SimpleGrid>
                <Flex mt="4" gap="3" wrap="wrap">
                  <Button variant="outline" onClick={() => void updatePassword()}>
                    Alterar senha
                  </Button>
                </Flex>
                <Text mt="3" color="muted" fontSize="sm">
                  Último acesso não disponível pelo provedor atual.
                </Text>
              </TabPanel>

              <TabPanel px="0">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                  <FormControl>
                    <FormLabel>Tema</FormLabel>
                    <Select
                      value={colorMode}
                      onChange={(e) => {
                        setColorMode(e.target.value);
                        set("tema", e.target.value);
                      }}
                    >
                      <option value="dark">Escuro</option>
                      <option value="light">Claro</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Sidebar padrão</FormLabel>
                    <Select
                      value={preferences.sidebarDefault}
                      onChange={(e) =>
                        setPreference(
                          "sidebarDefault",
                          e.target.value as Preferences["sidebarDefault"],
                        )
                      }
                    >
                      <option value="expanded">Expandida</option>
                      <option value="collapsed">Recolhida</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Densidade visual</FormLabel>
                    <Select
                      value={preferences.density}
                      onChange={(e) =>
                        setPreference(
                          "density",
                          e.target.value as Preferences["density"],
                        )
                      }
                    >
                      <option value="comfortable">Confortável</option>
                      <option value="compact">Compacta</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Preferência de dashboard</FormLabel>
                    <Select
                      value={preferences.dashboardPreference}
                      onChange={(e) =>
                        setPreference(
                          "dashboardPreference",
                          e.target.value as Preferences["dashboardPreference"],
                        )
                      }
                    >
                      <option value="complete">Completa</option>
                      <option value="summary">Resumo</option>
                      <option value="analytics">Analítica</option>
                    </Select>
                  </FormControl>
                </SimpleGrid>
              </TabPanel>

              <TabPanel px="0">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                  {[
                    ["alert_invoice_due_enabled", "Alertar faturas próximas"],
                    ["alert_expense_due_enabled", "Alertar despesas vencidas"],
                    ["alert_budget_80_enabled", "Alertar orçamento acima de 80%"],
                    ["alert_goal_delay_enabled", "Alertar metas atrasadas"],
                    ["alert_salary_received_enabled", "Alertar salário recebido"],
                  ].map(([key, label]) => (
                    <FormControl
                      key={key}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      bg="panel2"
                      p="4"
                      borderRadius="xl"
                    >
                      <FormLabel mb="0">{label}</FormLabel>
                      <Switch
                        isChecked={Boolean(
                          profile[key as keyof Profile],
                        )}
                        onChange={(e) =>
                          set(key as keyof Profile, e.target.checked as never)
                        }
                      />
                    </FormControl>
                  ))}
                  <FormControl>
                    <FormLabel>Dias de antecedência</FormLabel>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={profile.alert_days_before ?? 3}
                      onChange={(e) =>
                        set("alert_days_before", Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormControl
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <FormLabel mb="0">Notificações gerais</FormLabel>
                      <Text color="muted" fontSize="xs">
                        Ativa ou pausa todos os avisos financeiros.
                      </Text>
                    </Box>
                    <Switch
                      isChecked={profile.notificacoes ?? true}
                      onChange={(e) => set("notificacoes", e.target.checked)}
                    />
                  </FormControl>
                </SimpleGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        <Stack spacing="4">
          <SummaryCard
            label="Salário configurado"
            value={formatCurrencyBRL(profile.salario_previsto ?? 0)}
            icon={<WalletCards size={18} />}
          />
          <SummaryCard
            label="Dia de recebimento"
            value={profile.dia_salario ? `Dia ${profile.dia_salario}` : "Não definido"}
            icon={<Bell size={18} />}
          />
          <SummaryCard
            label="Banco principal"
            value={profile.banco_principal || "Não informado"}
            icon={<Landmark size={18} />}
          />
          <SummaryCard
            label="Tema atual"
            value={colorMode === "dark" ? "Escuro" : "Claro"}
            icon={<Palette size={18} />}
          />
          <SimpleGrid columns={2} spacing="3">
            <SummaryCard
              label="Categorias"
              value={String(categories)}
              icon={<UserRound size={18} />}
            />
            <SummaryCard
              label="Cartões ativos"
              value={String(activeCards)}
              icon={<CreditCard size={18} />}
            />
          </SimpleGrid>
        </Stack>
      </Grid>
    </form>
  );
}
