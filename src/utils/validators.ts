export const isPositiveMoney = (value: number) => Number.isFinite(value) && value > 0;
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
