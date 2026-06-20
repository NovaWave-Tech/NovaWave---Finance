import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Avatar,
  Box,
  Button,
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
import { Bell, Camera, Lock, Palette, Save, UserRound } from "lucide-react";
import type { Profile } from "../../types/database";
import { profileService } from "../../services/profileService";
import { CurrencyInput } from "../../components/forms/CurrencyInput";

const section = {
  bg: "panel",
  border: "1px solid",
  borderColor: "line",
  borderRadius: "2xl",
  p: { base: "4", md: "6" },
} as const;
export default function ProfilePage({
  userId,
  email,
  onUpdated,
}: {
  userId: string;
  email: string;
  onUpdated?: (profile: Profile) => void | Promise<void>;
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
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [password, setPassword] = useState("");
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
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await profileService.update(userId, profile);
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
  if (loading)
    return (
      <Flex minH="400px" align="center" justify="center">
        <Spinner />
      </Flex>
    );
  return (
    <form onSubmit={save}>
      <Flex
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap="4"
        mb="6"
      >
        <Box>
          <Heading size="lg">Perfil e preferências</Heading>
          <Text color="muted">
            Personalize sua experiência e seus padrões financeiros.
          </Text>
        </Box>
        <Button type="submit" leftIcon={<Save size={17} />} isLoading={saving}>
          Salvar alterações
        </Button>
      </Flex>
      <Tabs variant="soft-rounded" colorScheme="blue">
        <TabList overflowX="auto" pb="2">
          <Tab gap="2">
            <UserRound size={16} />
            Dados pessoais
          </Tab>
          <Tab>Financeiro</Tab>
          <Tab gap="2">
            <Lock size={16} />
            Segurança
          </Tab>
          <Tab gap="2">
            <Palette size={16} />
            Aparência
          </Tab>
          <Tab gap="2">
            <Bell size={16} />
            Notificações
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel px="0">
            <Box {...section}>
              <Flex gap="6" direction={{ base: "column", md: "row" }}>
                <Stack align="center">
                  <Avatar
                    size="2xl"
                    name={profile.nome ?? email}
                    src={profile.avatar_url ?? undefined}
                  />
                  <Button
                    as="label"
                    size="sm"
                    variant="outline"
                    leftIcon={<Camera size={15} />}
                    cursor="pointer"
                  >
                    Alterar foto
                    <Input
                      type="file"
                      accept="image/*"
                      display="none"
                      onChange={upload}
                    />
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => set("avatar_url", null)}
                  >
                    Remover
                  </Button>
                </Stack>
                <SimpleGrid flex="1" columns={{ base: 1, md: 2 }} spacing="4">
                  <FormControl>
                    <FormLabel>Nome</FormLabel>
                    <Input
                      value={profile.nome ?? ""}
                      onChange={(e) => set("nome", e.target.value)}
                    />
                  </FormControl>
                  <FormControl>
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
                      value={profile.telefone ?? ""}
                      onChange={(e) => set("telefone", e.target.value)}
                    />
                  </FormControl>
                </SimpleGrid>
              </Flex>
            </Box>
          </TabPanel>
          <TabPanel px="0">
            <Box {...section}>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                <FormControl>
                  <FormLabel>Moeda padrão</FormLabel>
                  <Select
                    value={profile.moeda}
                    onChange={(e) => set("moeda", e.target.value)}
                  >
                    <option value="BRL">Real brasileiro (BRL)</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Dia do salário</FormLabel>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={profile.dia_salario ?? ""}
                    onChange={(e) => set("dia_salario", Number(e.target.value))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Salário mensal previsto</FormLabel>
                  <CurrencyInput
                    value={profile.salario_previsto ?? 0}
                    onValueChange={(value) => set("salario_previsto", value)}
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
                  <FormLabel>Forma de recebimento do salário</FormLabel>
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
                    <FormLabel mb="0">Lançamento mensal automático</FormLabel>
                    <Text fontSize="xs" color="muted">
                      Cria uma única previsão por competência.
                    </Text>
                  </Box>
                  <Switch
                    isChecked={profile.salario_recorrente ?? false}
                    onChange={(e) =>
                      set("salario_recorrente", e.target.checked)
                    }
                  />
                </FormControl>
                <FormControl
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <FormLabel mb="0">Confirmar no dia do pagamento</FormLabel>
                    <Text fontSize="xs" color="muted">
                      Marca como recebido automaticamente ao chegar a data.
                    </Text>
                  </Box>
                  <Switch
                    isChecked={profile.salario_auto_recebido ?? false}
                    onChange={(e) =>
                      set("salario_auto_recebido", e.target.checked)
                    }
                  />
                </FormControl>
                <FormControl gridColumn={{ md: "span 2" }}>
                  <FormLabel>Objetivo financeiro principal</FormLabel>
                  <Textarea
                    value={profile.objetivo_principal ?? ""}
                    onChange={(e) => set("objetivo_principal", e.target.value)}
                  />
                </FormControl>
              </Grid>
            </Box>
          </TabPanel>
          <TabPanel px="0">
            <Box {...section} maxW="600px">
              <Heading size="sm" mb="4">
                Alterar senha
              </Heading>
              <FormControl>
                <FormLabel>Nova senha</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormControl>
              <Button
                mt="4"
                variant="outline"
                onClick={async () => {
                  try {
                    await profileService.updatePassword(password);
                    setPassword("");
                    toast({ title: "Senha alterada", status: "success" });
                  } catch (error) {
                    toast({
                      title: "Erro ao alterar senha",
                      description: (error as Error).message,
                      status: "error",
                    });
                  }
                }}
              >
                Atualizar senha
              </Button>
            </Box>
          </TabPanel>
          <TabPanel px="0">
            <Box {...section}>
              <FormControl>
                <FormLabel>Tema</FormLabel>
                <Select
                  maxW="300px"
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
              <FormControl mt="4">
                <FormLabel>Visualização inicial</FormLabel>
                <Select
                  maxW="300px"
                  value={profile.visualizacao_inicial}
                  onChange={(e) => set("visualizacao_inicial", e.target.value)}
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="receitas">Receitas</option>
                  <option value="despesas">Despesas</option>
                </Select>
              </FormControl>
            </Box>
          </TabPanel>
          <TabPanel px="0">
            <Box {...section}>
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontWeight="700">Alertas financeiros</Text>
                  <Text color="muted" fontSize="sm">
                    Orçamentos, vencimentos e metas fora do ritmo.
                  </Text>
                </Box>
                <Switch
                  isChecked={profile.notificacoes}
                  onChange={(e) => set("notificacoes", e.target.checked)}
                />
              </Flex>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </form>
  );
}
