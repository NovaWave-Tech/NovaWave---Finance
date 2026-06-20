import { useState, type FormEvent } from "react";
import {
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Divider,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Goal,
  LockKeyhole,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../../components/brand/BrandLogo";
import { CurrencyInput } from "../../components/forms/CurrencyInput";
import { authService } from "../../services/authService";
const MotionBox = motion(Box);
export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register",
    navigate = useNavigate(),
    toast = useToast();
  const [form, setForm] = useState({
      nome: "",
      email: "",
      password: "",
      confirm: "",
      salary: 0,
      goal: "",
    }),
    [show, setShow] = useState(false),
    [loading, setLoading] = useState(false),
    [reset, setReset] = useState(false),
    [remember, setRemember] = useState(true);
  const passwordError =
    register && form.confirm.length > 0 && form.password !== form.confirm;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (passwordError) return;
    setLoading(true);
    try {
      if (reset) {
        await authService.resetPassword(form.email);
        toast({
          title: "E-mail de recuperação enviado",
          description: "Confira sua caixa de entrada.",
          status: "success",
        });
        setReset(false);
      } else if (register) {
        const data = await authService.signUp({
          nome: form.nome,
          email: form.email,
          password: form.password,
          salario_previsto: form.salary || undefined,
          objetivo_principal: form.goal || undefined,
        });
        if (data.session) {
          navigate("/app");
        } else {
          toast({
            title: "Conta criada",
            description: "Confirme seu e-mail para entrar.",
            status: "success",
          });
          navigate("/login");
        }
      } else {
        await authService.signIn(form.email, form.password);
        if (!remember) sessionStorage.setItem("novawave-session-only", "true");
        navigate("/app");
      }
    } catch (error) {
      toast({
        title: reset ? "Não foi possível enviar" : "Não foi possível continuar",
        description: (error as Error).message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Grid
      minH="100vh"
      templateColumns={{ base: "1fr", lg: "1.05fr .95fr" }}
      bg="appBg"
    >
      <Box
        display={{ base: "none", lg: "flex" }}
        position="relative"
        overflow="hidden"
        bg="#080a10"
        p={{ lg: "48px", xl: "64px" }}
        flexDir="column"
        justifyContent="space-between"
      >
        <Box
          position="absolute"
          inset="0"
          bg="radial-gradient(circle at 18% 28%,rgba(15,98,254,.28),transparent 32%),radial-gradient(circle at 82% 75%,rgba(108,59,255,.22),transparent 30%)"
        />
        <Box zIndex="1">
          <BrandLogo inverse />
        </Box>
        <MotionBox
          zIndex="1"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          maxW="580px"
        >
          <Badge colorScheme="blue" px="3" py="1.5" borderRadius="full">
            NOVA GERAÇÃO DE CONTROLE FINANCEIRO
          </Badge>
          <Heading
            color="white"
            fontSize={{ lg: "52px", xl: "64px" }}
            lineHeight="1.05"
            letterSpacing="-2.5px"
            mt="6"
          >
            Seu dinheiro sob{" "}
            <Text
              as="span"
              bgGradient="linear(to-r,#5c8eff,#9974ff)"
              bgClip="text"
            >
              controle.
            </Text>
          </Heading>
          <Text color="#9aa4b6" fontSize="lg" mt="5">
            Clareza para organizar hoje. Inteligência para construir o amanhã.
          </Text>
          <SimpleGrid columns={3} spacing="3" mt="9">
            {[
              ["Saldo", "R$ 18,4 mil", WalletCards],
              ["Patrimônio", "R$ 46,8 mil", TrendingUp],
              ["Meta principal", "74%", Goal],
            ].map(([label, value, Icon]) => (
              <Box
                key={String(label)}
                bg="rgba(22,27,37,.82)"
                border="1px solid #293142"
                borderRadius="2xl"
                p="4"
                backdropFilter="blur(10px)"
              >
                <Flex justify="space-between" color="#6f9aff">
                  <Text color="#8f99aa" fontSize="10px">
                    {String(label).toUpperCase()}
                  </Text>
                  <Icon size={16} />
                </Flex>
                <Text color="white" fontWeight="800" mt="3">
                  {value as string}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
          <Box
            mt="4"
            h="110px"
            bg="rgba(22,27,37,.7)"
            border="1px solid #293142"
            borderRadius="2xl"
            p="4"
          >
            <Flex h="full" align="flex-end" gap="2">
              {[30, 46, 38, 62, 54, 78, 67, 92, 81, 100].map(
                (height, index) => (
                  <Box
                    key={index}
                    flex="1"
                    h={`${height}%`}
                    maxW="34px"
                    borderRadius="4px 4px 0 0"
                    bgGradient={
                      index > 6
                        ? "linear(to-t,#0F62FE,#6C3BFF)"
                        : "linear(to-t,#223b72,#315baf)"
                    }
                  />
                ),
              )}
            </Flex>
          </Box>
        </MotionBox>
        <Flex zIndex="1" gap="5" color="#8791a3" fontSize="sm">
          {["Dados protegidos", "RLS por usuário", "Conexão segura"].map(
            (item) => (
              <Flex key={item} align="center" gap="2">
                <CheckCircle2 size={15} color="#22C55E" />
                {item}
              </Flex>
            ),
          )}
        </Flex>
      </Box>
      <Center p={{ base: "24px", sm: "40px", lg: "56px" }} position="relative">
        <Button
          as={Link}
          to="/"
          variant="ghost"
          position="absolute"
          top={{ base: "18px", md: "30px" }}
          left={{ base: "14px", md: "30px" }}
          leftIcon={<ArrowLeft size={16} />}
        >
          Voltar
        </Button>
        <MotionBox
          initial={{ opacity: 0, y: 18, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.42 }}
          w="full"
          maxW="450px"
          mt={{ base: "54px", lg: "0" }}
        >
          <Box display={{ lg: "none" }} mb="8">
            <BrandLogo />
          </Box>
          <Heading size="xl" letterSpacing="-1px">
            {reset
              ? "Recuperar acesso"
              : register
                ? "Crie sua conta"
                : "Bem-vindo de volta"}
          </Heading>
          <Text color="muted" mt="2" mb="8">
            {reset
              ? "Enviaremos um link seguro para seu e-mail."
              : register
                ? "Comece a organizar sua vida financeira hoje."
                : "Entre para acessar sua central financeira."}
          </Text>
          <form onSubmit={submit}>
            <Stack spacing="4">
              {register && (
                <FormControl isRequired>
                  <FormLabel>Nome completo</FormLabel>
                  <Input
                    size="lg"
                    autoComplete="name"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Como podemos chamar você?"
                  />
                </FormControl>
              )}
              <FormControl isRequired>
                <FormLabel>E-mail</FormLabel>
                <Input
                  size="lg"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="voce@email.com"
                />
              </FormControl>
              {!reset && (
                <>
                  <FormControl isRequired isInvalid={passwordError}>
                    <FormLabel>Senha</FormLabel>
                    <InputGroup size="lg">
                      <Input
                        type={show ? "text" : "password"}
                        minLength={register ? 8 : undefined}
                        autoComplete={
                          register ? "new-password" : "current-password"
                        }
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                        placeholder={
                          register
                            ? "Mínimo de 8 caracteres"
                            : "Digite sua senha"
                        }
                        pr="12"
                      />
                      <InputRightElement>
                        <IconButton
                          aria-label="Mostrar senha"
                          size="sm"
                          variant="ghost"
                          icon={show ? <EyeOff size={18} /> : <Eye size={18} />}
                          onClick={() => setShow(!show)}
                        />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>
                  {register && (
                    <FormControl isRequired isInvalid={passwordError}>
                      <FormLabel>Confirmar senha</FormLabel>
                      <Input
                        size="lg"
                        type={show ? "text" : "password"}
                        value={form.confirm}
                        onChange={(e) =>
                          setForm({ ...form, confirm: e.target.value })
                        }
                      />
                      <FormErrorMessage>
                        As senhas não coincidem.
                      </FormErrorMessage>
                    </FormControl>
                  )}
                  {register && (
                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing="4">
                      <FormControl>
                        <FormLabel>
                          Salário mensal{" "}
                          <Text as="span" color="muted" fontSize="xs">
                            opcional
                          </Text>
                        </FormLabel>
                        <CurrencyInput
                          value={form.salary}
                          onValueChange={(salary) =>
                            setForm({ ...form, salary })
                          }
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Objetivo principal</FormLabel>
                        <Input
                          value={form.goal}
                          onChange={(e) =>
                            setForm({ ...form, goal: e.target.value })
                          }
                          placeholder="Ex.: Reserva"
                        />
                      </FormControl>
                    </SimpleGrid>
                  )}
                  {!register && (
                    <Flex justify="space-between" align="center">
                      <Checkbox
                        isChecked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      >
                        Lembrar acesso
                      </Checkbox>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setReset(true)}
                      >
                        Esqueci minha senha
                      </Button>
                    </Flex>
                  )}
                </>
              )}
              <Button
                type="submit"
                size="lg"
                isLoading={loading}
                mt="2"
                rightIcon={reset ? <LockKeyhole size={18} /> : undefined}
              >
                {reset
                  ? "Enviar link"
                  : register
                    ? "Criar minha conta"
                    : "Entrar"}
              </Button>
              {reset && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setReset(false)}
                >
                  Voltar ao login
                </Button>
              )}
            </Stack>
          </form>
          {!reset && (
            <>
              <Flex align="center" gap="3" my="6">
                <Divider />
                <Text color="muted" fontSize="xs" whiteSpace="nowrap">
                  ACESSO SEGURO
                </Text>
                <Divider />
              </Flex>
              <Button
                as={Link}
                to={register ? "/login" : "/cadastro"}
                variant="outline"
                w="full"
                size="lg"
              >
                {register ? "Já tenho uma conta" : "Criar uma conta"}
              </Button>
            </>
          )}
          <Flex
            mt="7"
            justify="center"
            align="center"
            gap="2"
            color="muted"
            fontSize="xs"
          >
            <ShieldCheck size={14} />
            Protegido por autenticação Supabase
          </Flex>
        </MotionBox>
      </Center>
    </Grid>
  );
}
