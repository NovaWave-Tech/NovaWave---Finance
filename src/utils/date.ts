export const APP_TIMEZONE = "America/Sao_Paulo";
export const formatDateBR = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
        new Date(`${value}T12:00:00Z`),
      )
    : "—";
export const todayISO = () => new Date().toISOString().slice(0, 10);
