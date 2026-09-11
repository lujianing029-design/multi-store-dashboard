import { Prisma } from "@/generated/prisma";

export interface MetricSale {
  orderId: string;
  amount: Prisma.Decimal | string;
  units: number;
}

export interface MetricRefund {
  amount: Prisma.Decimal | string;
}

export interface MetricResult {
  paidGmv: Prisma.Decimal;
  netSales: Prisma.Decimal;
  paidOrders: number;
  unitsSold: number;
  refundAmount: Prisma.Decimal;
  refundRate: Prisma.Decimal;
  aov: Prisma.Decimal;
}

const ZERO = new Prisma.Decimal(0);

export function calculateMetrics(
  sales: readonly MetricSale[],
  refunds: readonly MetricRefund[]
): MetricResult {
  const paidGmv = sales.reduce(
    (sum, sale) => sum.plus(new Prisma.Decimal(sale.amount)),
    ZERO
  );
  const refundAmount = refunds.reduce(
    (sum, refund) => sum.plus(new Prisma.Decimal(refund.amount)),
    ZERO
  );
  const paidOrders = new Set(sales.map((sale) => sale.orderId)).size;
  const unitsSold = sales.reduce((sum, sale) => sum + sale.units, 0);

  return {
    paidGmv,
    netSales: paidGmv.minus(refundAmount),
    paidOrders,
    unitsSold,
    refundAmount,
    refundRate: paidGmv.isZero() ? ZERO : refundAmount.dividedBy(paidGmv),
    aov: paidOrders === 0 ? ZERO : paidGmv.dividedBy(paidOrders)
  };
}

export function periodChange(
  current: Prisma.Decimal | string,
  previous: Prisma.Decimal | string
): Prisma.Decimal | null {
  const currentValue = new Prisma.Decimal(current);
  const previousValue = new Prisma.Decimal(previous);
  if (previousValue.isZero()) return null;
  return currentValue.minus(previousValue).dividedBy(previousValue);
}

