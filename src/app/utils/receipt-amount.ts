import type { CreateReceiptInput } from "../entities/warehouse-receipt.entity.js";

export function calculateLineAmount(quantityActual: number, unitPrice: number): number {
  const quantityThousandths = Math.round((quantityActual + Number.EPSILON) * 1_000);
  const priceCents = Math.round((unitPrice + Number.EPSILON) * 100);
  return Math.round(quantityThousandths * priceCents / 1_000) / 100;
}

export function calculateReceiptTotal(input: CreateReceiptInput): number {
  const itemAmounts = input.items.map((item) =>
    calculateLineAmount(item.quantityActual, item.unitPrice),
  );
  const totalCents = itemAmounts.reduce(
    (sum, amount) => sum + Math.round(amount * 100),
    0,
  );
  return totalCents / 100;
}
