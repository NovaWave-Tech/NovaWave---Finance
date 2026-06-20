import {
  Box,
  Button,
  Center,
  Container,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Grid,
  Heading,
  IconButton,
  SimpleGrid,
  Stack,
  Text,
  useColorMode,
  useDisclosure,
} from "@chakra-ui/react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CreditCard,
  Goal,
  Menu,
  Moon,
  PieChart,
  Receipt,
  ShieldCheck,
  Sun,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BrandLogo } from "../../components/brand/BrandLogo";
const MotionBox = motion(Box);
const features = [
  ["Receitas", WalletCards, "Acompanhe tudo que entra e suas previsões."],
  ["Despesas", Receipt, "Entenda para onde seu dinheiro está indo."],
  ["Cartões", CreditCard, "Faturas e parcelas ligadas ao seu caixa."],
  ["Metas", Goal, "Transforme objetivos em aportes consistentes."],
  [
    "Investimentos",
    TrendingUp,
    "Veja caixa e patrimônio sem confundir os dois.",
  ],
  ["Relatórios", BarChart3, "Decisões apoiadas em dados financeiros reais."],
  ["Controle de gastos", PieChart, "Orçamentos e alertas antes do excesso."],
  ["Calendário", CalendarDays, "Vencimentos e compromissos em um só lugar."],
] as const;
function Header() {
  const menu = useDisclosure(),
    { colorMode, toggleColorMode } = useColorMode();
  const links = ["Recursos", "Funcionalidades", "Dashboard", "Segurança"];
  return (
    <Box
      position="fixed"
      top="0"
      insetX="0"
      zIndex="30"
      bg={colorMode === "dark" ? "rgba(10,10,10,.78)" : "rgba(255,255,255,.82)"}
      borderBottom="1px solid"
      borderColor="line"
      backdropFilter="blur(18px)"
    >
      <Container maxW="7xl">
        <Flex h="76px" align="center" justify="space-between">
          <BrandLogo />
          <Flex display={{ base: "none", lg: "flex" }} align="center" gap="7">
            {links.map((link) => (
              <Text
                as="a"
                href={`#${link.toLowerCase()}`}
                key={link}
                fontSize="sm"
                color="muted"
                _hover={{ color: "textMain" }}
              >
                {link}
              </Text>
            ))}
            <Button as={Link} to="/login" variant="ghost">
              Entrar
            </Button>
            <Button
              as={Link}
              to="/cadastro"
              rightIcon={<ArrowRight size={16} />}
            >
              Começar agora
            </Button>
            <IconButton
              aria-label="Tema"
              icon={colorMode === "dark" ? <Sun /> : <Moon />}
              variant="ghost"
              onClick={toggleColorMode}
            />
          </Flex>
          <IconButton
            display={{ lg: "none" }}
            aria-label="Menu"
            icon={<Menu />}
            variant="ghost"
            onClick={menu.onOpen}
          />
        </Flex>
      </Container>
      <Drawer isOpen={menu.isOpen} onClose={menu.onClose} placement="right">
        <DrawerOverlay />
        <DrawerContent bg="panel">
          <DrawerBody p="6">
            <Flex justify="space-between" align="center">
              <BrandLogo />
              <IconButton
                aria-label="Fechar"
                icon={<X />}
                variant="ghost"
                onClick={menu.onClose}
              />
            </Flex>
            <Stack mt="10" spacing="4">
              {links.map((link) => (
                <Button
                  as="a"
                  href={`#${link.toLowerCase()}`}
                  variant="ghost"
                  justifyContent="flex-start"
                  key={link}
                  onClick={menu.onClose}
                >
                  {link}
                </Button>
              ))}
              <Button as={Link} to="/login" variant="outline">
                Entrar
              </Button>
              <Button as={Link} to="/cadastro">
                Criar conta
              </Button>
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
function DashboardMockup() {
  return (
    <Box
      bg="#10131a"
      border="1px solid #293041"
      borderRadius="24px"
      p={{ base: "4", md: "6" }}
      boxShadow="0 35px 100px rgba(0,0,0,.45)"
      transform={{ xl: "perspective(1100px) rotateY(-5deg) rotateX(2deg)" }}
    >
      <Flex justify="space-between">
        <Box>
          <Text color="#8c96a8" fontSize="xs">
            SALDO DISPONÍVEL
          </Text>
          <Heading color="white" size="lg" mt="1">
            R$ 18.420,80
          </Heading>
        </Box>
        <Center
          w="42px"
          h="42px"
          bg="rgba(34,197,94,.12)"
          color="#22C55E"
          borderRadius="xl"
        >
          <TrendingUp />
        </Center>
      </Flex>
      <SimpleGrid columns={3} spacing="3" mt="6">
        {[
          ["Receitas", "R$ 9.250"],
          ["Despesas", "R$ 4.180"],
          ["Economia", "R$ 5.070"],
        ].map(([l, v]) => (
          <Box key={l} bg="#171b23" p="3" borderRadius="xl">
            <Text color="#8c96a8" fontSize="10px">
              {l}
            </Text>
            <Text
              color="white"
              fontSize={{ base: "xs", md: "sm" }}
              fontWeight="700"
            >
              {v}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
      <Flex
        h="165px"
        mt="5"
        align="flex-end"
        gap="3"
        borderBottom="1px solid #2b3240"
      >
        {[38, 58, 47, 78, 65, 90, 72, 105, 82, 125, 108, 145].map(
          (height, index) => (
            <Box
              key={index}
              flex="1"
              h={`${height}px`}
              maxH="90%"
              borderRadius="5px 5px 0 0"
              bgGradient={
                index > 8
                  ? "linear(to-t,#0F62FE,#6C3BFF)"
                  : "linear(to-t,#253b72,#315aab)"
              }
            />
          ),
        )}
      </Flex>
      <Flex justify="space-between" mt="5">
        <Box>
          <Text color="#8c96a8" fontSize="xs">
            Meta: Reserva
          </Text>
          <Text color="white" fontSize="sm" fontWeight="700">
            74% concluída
          </Text>
        </Box>
        <Text color="#22C55E" fontSize="sm">
          +12,4% este mês
        </Text>
      </Flex>
    </Box>
  );
}
export default function LandingPage() {
  return (
    <Box overflow="hidden">
      <Header />
      <Box pt="76px" position="relative">
        <Box
          position="absolute"
          inset="0 0 auto"
          h="760px"
          bg="radial-gradient(circle at 20% 25%,rgba(15,98,254,.18),transparent 32%),radial-gradient(circle at 82% 35%,rgba(108,59,255,.16),transparent 30%)"
          pointerEvents="none"
        />
        <Container maxW="7xl" py={{ base: "72px", lg: "120px" }}>
          <Grid
            templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
            gap={{ base: "14", lg: "20" }}
            alignItems="center"
          >
            <MotionBox
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Text
                display="inline-flex"
                px="3"
                py="1.5"
                bg="rgba(15,98,254,.12)"
                color="brand.300"
                borderRadius="full"
                fontWeight="700"
                fontSize="sm"
              >
                Finanças conectadas. Decisões melhores.
              </Text>
              <Heading
                mt="6"
                fontSize={{ base: "42px", md: "58px", xl: "68px" }}
                lineHeight="1.04"
                letterSpacing="-3px"
              >
                Controle suas finanças de forma{" "}
                <Text
                  as="span"
                  bgGradient="linear(to-r,#477cff,#8c67ff)"
                  bgClip="text"
                >
                  inteligente.
                </Text>
              </Heading>
              <Text
                mt="6"
                color="muted"
                fontSize={{ base: "md", md: "xl" }}
                maxW="620px"
              >
                Receitas, despesas, cartões, metas e investimentos em uma
                plataforma criada para dar clareza ao seu dinheiro.
              </Text>
              <Flex mt="8" gap="3" wrap="wrap">
                <Button
                  as={Link}
                  to="/cadastro"
                  size="lg"
                  rightIcon={<ArrowRight />}
                >
                  Criar conta gratuitamente
                </Button>
                <Button as={Link} to="/login" size="lg" variant="outline">
                  Entrar
                </Button>
              </Flex>
              <Flex mt="8" gap="6" wrap="wrap">
                {[
                  "Dados protegidos",
                  "Sem planilhas",
                  "Visão em tempo real",
                ].map((item) => (
                  <Flex
                    key={item}
                    align="center"
                    gap="2"
                    color="muted"
                    fontSize="sm"
                  >
                    <Check size={16} color="#22C55E" />
                    {item}
                  </Flex>
                ))}
              </Flex>
            </MotionBox>
            <MotionBox
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <DashboardMockup />
            </MotionBox>
          </Grid>
        </Container>
      </Box>
      <Box id="funcionalidades" bg="panel2" py={{ base: "72px", lg: "100px" }}>
        <Container maxW="7xl">
          <Center flexDir="column" textAlign="center">
            <Text color="brand.300" fontWeight="800">
              TUDO CONECTADO
            </Text>
            <Heading mt="3" size="xl">
              Uma central para sua vida financeira
            </Heading>
            <Text color="muted" mt="3" maxW="650px">
              Cada movimentação atualiza caixa, patrimônio, metas e previsões
              automaticamente.
            </Text>
          </Center>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing="4" mt="12">
            {features.map(([title, Icon, desc], index) => (
              <MotionBox
                key={title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
                bg="panel"
                border="1px solid"
                borderColor="line"
                borderRadius="2xl"
                p="5"
                _hover={{
                  transform: "translateY(-4px)",
                  borderColor: "brand.500",
                }}
              >
                <Center
                  w="42px"
                  h="42px"
                  bg="rgba(15,98,254,.12)"
                  color="brand.300"
                  borderRadius="xl"
                >
                  <Icon size={21} />
                </Center>
                <Heading size="sm" mt="4">
                  {title}
                </Heading>
                <Text color="muted" fontSize="sm" mt="2">
                  {desc}
                </Text>
              </MotionBox>
            ))}
          </SimpleGrid>
        </Container>
      </Box>
      <Box id="segurança" py="90px">
        <Container maxW="5xl">
          <Grid
            templateColumns={{ base: "1fr", md: "1fr 1fr" }}
            gap="10"
            alignItems="center"
          >
            <Center>
              <Center
                w="150px"
                h="150px"
                borderRadius="40px"
                bg="rgba(34,197,94,.1)"
                color="#22C55E"
              >
                <ShieldCheck size={72} />
              </Center>
            </Center>
            <Box>
              <Text color="green.300" fontWeight="800">
                SEGURANÇA PRIMEIRO
              </Text>
              <Heading size="xl" mt="3">
                Seus dados são realmente seus.
              </Heading>
              <Text color="muted" mt="4">
                Autenticação segura, isolamento por usuário e políticas Row
                Level Security em todas as tabelas privadas.
              </Text>
            </Box>
          </Grid>
        </Container>
      </Box>
      <Box borderTop="1px solid" borderColor="line" py="10">
        <Container maxW="7xl">
          <Flex
            justify="space-between"
            direction={{ base: "column", md: "row" }}
            gap="6"
          >
            <BrandLogo />
            <Flex gap="6" color="muted" fontSize="sm" wrap="wrap">
              <Text>Sobre</Text>
              <Text>Política de Privacidade</Text>
              <Text>Termos de Uso</Text>
              <Text>Suporte</Text>
            </Flex>
            <Text color="muted" fontSize="sm">
              Desenvolvido por NovaWave Tech
            </Text>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}
