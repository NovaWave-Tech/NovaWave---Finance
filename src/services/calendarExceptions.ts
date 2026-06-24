import type { FinanceRecord } from "../types/database";
import type { FinanceData } from "./financialEngine";

export const CALENDAR_SKIP_TYPE = "excecao_calendario";

export const calendarExceptionKey = (source: string, id: string) =>
  `${source}:${id}`;

export const isCalendarSkipEvent = (event: FinanceRecord) =>
  event.tipo === CALENDAR_SKIP_TYPE;

export function getCalendarSkipKeys(data: FinanceData, month: string) {
  return new Set(
    data.eventos_financeiros
      .filter(
        (event) =>
          isCalendarSkipEvent(event) &&
          event.status !== "pago" &&
          (event.competencia?.startsWith(month) || event.data?.startsWith(month)),
      )
      .map((event) => event.origem)
      .filter(Boolean) as string[],
  );
}

export function isSkippedThisMonth(
  skips: Set<string>,
  source: string,
  id?: string,
) {
  return Boolean(id && skips.has(calendarExceptionKey(source, id)));
}

