export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";
export interface Subscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  priceId?: string;
  currentPeriodEnd?: string;
}
