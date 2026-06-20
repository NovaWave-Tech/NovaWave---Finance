export const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(value) ? value : 0,
  );
export const parseCurrency = (value: string) => {
  const normalized = value
    .replace(/[^\d,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
export const formatPercentage = (value = 0, digits = 1) =>
  `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)}%`;
export const formatNumber = (value = 0, digits = 2) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
export const formatDateBR = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
        new Date(`${value.slice(0, 10)}T12:00:00Z`),
      )
    : "—";
export const formatMonthYear = (value: string | Date) => {
  const date =
    typeof value === "string"
      ? new Date(`${value.slice(0, 7)}-01T12:00:00`)
      : value;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
};
export const formatInstallment = (
  current: number,
  total: number,
  value?: number,
) =>
  `${current}/${total}${value !== undefined ? ` · ${formatCurrency(value)}` : ""}`;
export const formatDueDateStatus = (date?: string, status?: string) => {
  if (status === "pago" || status === "paga") return "pago";
  if (status === "cancelado" || status === "cancelada") return "cancelado";
  if (!date) return status ?? "pendente";
  const today = new Date().toISOString().slice(0, 10);
  if (date < today) return "atrasado";
  const days = Math.ceil(
    (new Date(date).getTime() - new Date(today).getTime()) / 86400000,
  );
  return days <= 5 ? "vencendo" : (status ?? "pendente");
};

// API canônica de formatação do produto. Os aliases antigos permanecem para
// compatibilidade enquanto todas as telas convergem para estes nomes.
export const formatCurrencyBRL = formatCurrency;
export const parseCurrencyBRL = parseCurrency;
export const formatPercent = formatPercentage;
export const formatNumberBR = formatNumber;
export const formatMonthYearBR = formatMonthYear;
export const formatDueDate = (value?: string) =>
  value ? `Vence em ${formatDateBR(value)}` : "Sem vencimento";
export const formatStatus = (status?: string) =>
  ({
    pago: "Pago",
    paga: "Paga",
    recebida: "Recebida",
    pendente: "Pendente",
    atrasado: "Atrasado",
    atrasada: "Atrasada",
    cancelado: "Cancelado",
    cancelada: "Cancelada",
    aberta: "Aberta",
    fechada: "Fechada",
  })[status ?? ""] ??
  status ??
  "Pendente";
export const formatCardLimit = (used = 0, limit = 0) =>
  `${formatCurrencyBRL(used)} de ${formatCurrencyBRL(limit)}`;
