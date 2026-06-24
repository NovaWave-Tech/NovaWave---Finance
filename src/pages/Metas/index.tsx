import { useState, type FormEvent } from "react";
import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormLabel,
  Grid,
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
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Select,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { Edit2, History, Plus, Target, Trash2 } from "lucide-react";
import type { FinanceRecord, FinanceTable } from "../../types/database";
import { formatCurrency } from "../../utils/formatters";
import { formatDateBR, todayISO } from "../../utils/date";
import { CurrencyInput } from "../../components/forms/CurrencyInput";
import { DateInputBR } from "../../components/forms/DateInputBR";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

const panel = {
  bg: "panel",
  border: "1px solid",
  borderColor: "line",
  borderRadius: "2xl",
  boxShadow: "card",
} as const;
export default function GoalsPage({
  goals,
  contributions,
  categories,
  save,
  remove,
}: {
  goals: FinanceRecord[];
  contributions: FinanceRecord[];
  categories: FinanceRecord[];
  save: (table: FinanceTable, item: FinanceRecord) => Promise<void>;
  remove: (table: FinanceTable, id: string) => Promise<void>;
}) {
  const editor = useDisclosure(),
    aporte = useDisclosure();
  const [selected, setSelected] = useState<FinanceRecord>();
  const [form, setForm] = useState({
    nome: "",
    valor_alvo: "",
    valor_atual: "0",
    aporte_mensal: "",
    data_objetivo: "",
    categoria: "",
    observacao: "",
    status: "em_andamento",
  });
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pendingContributionDelete, setPendingContributionDelete] =
    useState<FinanceRecord>();
  const [pendingGoalDelete, setPendingGoalDelete] = useState<FinanceRecord>();
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const open = (goal?: FinanceRecord) => {
    setSelected(goal);
    setForm({
      nome: goal?.nome ?? "",
      valor_alvo: String(goal?.valor_alvo ?? ""),
      valor_atual: String(goal?.valor_atual ?? 0),
      aporte_mensal: String(goal?.aporte_mensal ?? ""),
      data_objetivo: goal?.data_objetivo ?? "",
      categoria: goal?.categoria ?? "",
      observacao: goal?.observacao ?? "",
      status: goal?.status ?? "em_andamento",
    });
    editor.onOpen();
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (Number(form.valor_alvo) <= 0)
        throw new Error("O valor alvo deve ser maior que zero.");
      if (
        !form.data_objetivo ||
        Number.isNaN(new Date(`${form.data_objetivo}T12:00:00`).getTime())
      )
        throw new Error("Informe uma data objetivo válida.");
      await save("metas_financeiras", {
        id: selected?.id ?? crypto.randomUUID(),
        nome: form.nome,
        valor_alvo: Number(form.valor_alvo),
        valor_atual: Number(form.valor_atual),
        aporte_mensal: Number(form.aporte_mensal),
        data_objetivo: form.data_objetivo,
        categoria: form.categoria,
        categoria_id:
          categories.find((x) => x.nome === form.categoria && x.tipo === "meta")
            ?.id ?? selected?.categoria_id,
        observacao: form.observacao,
        status: form.status,
      });
      toast({ title: "Meta salva", status: "success" });
      editor.onClose();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: (error as Error).message,
        status: "error",
      });
    }
  };
  const addContribution = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const value = Number(amount);
    try {
      if ((selected.status ?? "em_andamento") !== "em_andamento")
        throw new Error("Apenas metas em andamento podem receber aportes.");
      if (value <= 0) throw new Error("O aporte deve ser maior que zero.");
      await save("aportes_metas", {
        id: crypto.randomUUID(),
        meta_id: selected.id,
        valor: value,
        data: todayISO(),
        observacao: note,
        status: "confirmado",
      });
      await save("metas_financeiras", {
        ...selected,
        valor_atual: (selected.valor_atual ?? 0) + value,
        status:
          (selected.valor_atual ?? 0) + value >=
          (selected.valor_alvo ?? Infinity)
            ? "concluida"
            : selected.status,
      });
      toast({ title: "Aporte adicionado", status: "success" });
      setAmount("");
      setNote("");
      aporte.onClose();
    } catch (error) {
      toast({
        title: "Erro no aporte",
        description: (error as Error).message,
        status: "error",
      });
    }
  };
  const removeContribution = async (contribution: FinanceRecord) => {
    const goal = goals.find((x) => x.id === contribution.meta_id);
    if (!goal) return;
    setDeleting(true);
    try {
      await remove("aportes_metas", contribution.id);
      if (contribution.status !== "pendente") {
        const next = Math.max(
          0,
          (goal.valor_atual ?? 0) - (contribution.valor ?? 0),
        );
        await save("metas_financeiras", {
          ...goal,
          valor_atual: next,
          status:
            goal.status === "concluida" && next < (goal.valor_alvo ?? 0)
              ? "em_andamento"
              : goal.status,
        });
      }
      toast({ title: "Aporte removido", status: "success" });
      setPendingContributionDelete(undefined);
    } catch (error) {
      toast({
        title: "Erro ao remover aporte",
        description: (error as Error).message,
        status: "error",
      });
    } finally {
      setDeleting(false);
    }
  };
  const removeGoal = async () => {
    if (!pendingGoalDelete) return;
    setDeleting(true);
    try {
      await remove("metas_financeiras", pendingGoalDelete.id);
      toast({ title: "Meta excluída", status: "success" });
      setPendingGoalDelete(undefined);
    } catch (error) {
      toast({
        title: "Erro ao excluir meta",
        description: (error as Error).message,
        status: "error",
      });
    } finally {
      setDeleting(false);
    }
  };
  const confirmContribution = async (contribution: FinanceRecord) => {
    const goal = goals.find((x) => x.id === contribution.meta_id);
    if (!goal || contribution.status !== "pendente") return;
    const next = (goal.valor_atual ?? 0) + (contribution.valor ?? 0);
    await save("aportes_metas", { ...contribution, status: "confirmado" });
    await save("metas_financeiras", {
      ...goal,
      valor_atual: next,
      status: next >= (goal.valor_alvo ?? Infinity) ? "concluida" : goal.status,
    });
    toast({ title: "Aporte confirmado", status: "success" });
  };
  return (
    <>
      <Flex justify="space-between" align="center" mb="6">
        <Box>
          <Heading size="lg">Metas financeiras</Heading>
          <Text color="muted">
            Transforme objetivos em aportes consistentes.
          </Text>
        </Box>
        <Button leftIcon={<Plus size={18} />} onClick={() => open()}>
          Nova meta
        </Button>
      </Flex>
      <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} spacing="16px">
        {goals.map((goal) => {
          const current = goal.valor_atual ?? 0,
            target = goal.valor_alvo ?? 1,
            progress = Math.min(100, (current / target) * 100);
          const remaining = Math.max(0, target - current);
          const targetDate = new Date(`${goal.data_objetivo}T12:00:00`);
          const months = Math.max(
            1,
            (targetDate.getFullYear() - new Date().getFullYear()) * 12 +
              targetDate.getMonth() -
              new Date().getMonth(),
          );
          const ideal = remaining / months;
          const forecast =
            (goal.aporte_mensal ?? 0) > 0
              ? Math.ceil(remaining / (goal.aporte_mensal ?? 1))
              : null;
          const history = contributions.filter((x) => x.meta_id === goal.id);
          return (
            <Box key={goal.id} {...panel} p="22px">
              <Flex justify="space-between">
                <Center
                  w="42px"
                  h="42px"
                  borderRadius="xl"
                  bg="rgba(15,98,254,.15)"
                  color="brand.300"
                >
                  <Target />
                </Center>
                <Flex>
                  <IconButton
                    aria-label="Editar"
                    icon={<Edit2 size={16} />}
                    variant="ghost"
                    onClick={() => open(goal)}
                  />
                  <IconButton
                    aria-label="Excluir"
                    icon={<Trash2 size={16} />}
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => setPendingGoalDelete(goal)}
                  />
                </Flex>
              </Flex>
              <Heading size="md" mt="4">
                {goal.nome}
              </Heading>
              <Badge mt="2" colorScheme="blue">
                {goal.categoria} · {goal.status ?? "em_andamento"}
              </Badge>
              <Flex justify="space-between" mt="5" mb="2">
                <Text fontWeight="700">{formatCurrency(current)}</Text>
                <Text color="muted">{progress.toFixed(1)}%</Text>
              </Flex>
              <Progress value={progress} borderRadius="full" />
              <SimpleGrid columns={2} spacing="3" mt="5">
                <Box>
                  <Text fontSize="xs" color="muted">
                    Falta
                  </Text>
                  <Text fontSize="sm" fontWeight="600">
                    {formatCurrency(remaining)}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="muted">
                    Aporte ideal
                  </Text>
                  <Text fontSize="sm" fontWeight="600">
                    {formatCurrency(ideal)}/mês
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="muted">
                    Prazo
                  </Text>
                  <Text fontSize="sm">{months} meses</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="muted">
                    Previsão atual
                  </Text>
                  <Text fontSize="sm">
                    {forecast ? `${forecast} meses` : "Sem previsão"}
                  </Text>
                </Box>
              </SimpleGrid>
              <Button
                w="full"
                mt="5"
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelected(goal);
                  aporte.onOpen();
                }}
                isDisabled={(goal.status ?? "em_andamento") !== "em_andamento"}
              >
                Adicionar aporte
              </Button>
              {history.length > 0 && (
                <Box mt="4" pt="4" borderTop="1px solid" borderColor="line">
                  <Flex align="center" gap="2" mb="2">
                    <History size={14} />
                    <Text fontSize="xs" fontWeight="700">
                      HISTÓRICO
                    </Text>
                  </Flex>
                  <Stack maxH="110px" overflowY="auto">
                    {history.map((item) => (
                      <Flex
                        key={item.id}
                        justify="space-between"
                        align="center"
                      >
                        <Text fontSize="xs">
                          {formatDateBR(item.data)} ·{" "}
                          {formatCurrency(item.valor)}
                        </Text>
                        <Flex>
                          {item.status === "pendente" && (
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => void confirmContribution(item)}
                            >
                              Confirmar
                            </Button>
                          )}
                          <IconButton
                            aria-label="Remover aporte"
                            icon={<Trash2 size={12} />}
                            size="xs"
                            variant="ghost"
                            onClick={() => setPendingContributionDelete(item)}
                          />
                        </Flex>
                      </Flex>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          );
        })}
        {!goals.length && (
          <Center {...panel} minH="300px" color="muted">
            Nenhuma meta cadastrada.
          </Center>
        )}
      </SimpleGrid>
      <Modal isOpen={editor.isOpen} onClose={editor.onClose} size="lg">
        <ModalOverlay />
        <ModalContent as="form" onSubmit={submit}>
          <ModalHeader>{selected ? "Editar" : "Nova"} meta</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
              <FormControl isRequired>
                <FormLabel>Nome</FormLabel>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </FormControl>
              {(["valor_alvo", "valor_atual", "aporte_mensal"] as const).map(
                (key) => (
                  <FormControl key={key} isRequired>
                    <FormLabel>
                      {
                        {
                          valor_alvo: "Valor alvo",
                          valor_atual: "Valor atual",
                          aporte_mensal: "Aporte mensal",
                        }[key]
                      }
                    </FormLabel>
                    <CurrencyInput
                      value={Number(form[key])}
                      onValueChange={(value) =>
                        setForm({ ...form, [key]: String(value) })
                      }
                    />
                  </FormControl>
                ),
              )}
              <FormControl isRequired>
                <FormLabel>Data objetivo</FormLabel>
                <DateInputBR
                  value={form.data_objetivo}
                  onChange={(e) =>
                    setForm({ ...form, data_objetivo: e.target.value })
                  }
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Categoria</FormLabel>
                <Select
                  value={form.categoria}
                  onChange={(e) =>
                    setForm({ ...form, categoria: e.target.value })
                  }
                >
                  <option value="">Selecione</option>
                  {categories
                    .filter(
                      (x) =>
                        (x.status ?? "ativa") === "ativa" && x.tipo === "meta",
                    )
                    .map((x) => (
                      <option key={x.id}>{x.nome}</option>
                    ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Status</FormLabel>
                <Select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluida">Concluída</option>
                  <option value="pausada">Pausada</option>
                  <option value="cancelada">Cancelada</option>
                </Select>
              </FormControl>
            </Grid>
            <FormControl mt="4">
              <FormLabel>Observação</FormLabel>
              <Textarea
                value={form.observacao}
                onChange={(e) =>
                  setForm({ ...form, observacao: e.target.value })
                }
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button type="submit">Salvar meta</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={aporte.isOpen} onClose={aporte.onClose}>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={addContribution}>
          <ModalHeader>Novo aporte</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired>
              <FormLabel>Valor</FormLabel>
              <CurrencyInput
                value={Number(amount)}
                onValueChange={(value) => setAmount(String(value))}
              />
            </FormControl>
            <FormControl mt="4">
              <FormLabel>Observação</FormLabel>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button type="submit">Adicionar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <ConfirmModal
        isOpen={Boolean(pendingGoalDelete)}
        onClose={() => setPendingGoalDelete(undefined)}
        onConfirm={() => void removeGoal()}
        title="Excluir meta"
        description="Essa ação remove a meta financeira do banco."
        itemName={pendingGoalDelete?.nome}
        impact="Aportes vinculados podem perder o contexto da meta. Revise o histórico de aportes depois da exclusão."
        confirmLabel="Confirmar exclusão"
        isLoading={deleting}
      />
      <ConfirmModal
        isOpen={Boolean(pendingContributionDelete)}
        onClose={() => setPendingContributionDelete(undefined)}
        onConfirm={() =>
          pendingContributionDelete &&
          void removeContribution(pendingContributionDelete)
        }
        title="Remover aporte"
        description="Essa ação remove o aporte e recalcula o valor atual da meta quando o aporte já estava confirmado."
        itemName={
          pendingContributionDelete
            ? formatCurrency(pendingContributionDelete.valor)
            : undefined
        }
        impact="O progresso da meta pode diminuir imediatamente após a confirmação."
        confirmLabel="Remover aporte"
        isLoading={deleting}
      />
    </>
  );
}
