export const goalProgress = (current: number, target: number) => target > 0 ? Math.min(100, Math.max(0, current / target * 100)) : 0;
export const monthlySavingsRate = (income: number, expenses: number) => income > 0 ? (income - expenses) / income * 100 : 0;
