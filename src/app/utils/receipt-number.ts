export function formatWarehouseReceiptNumber(
  receiptDate: string,
  sequence: number,
): string {
  const datePart = receiptDate.replaceAll("-", "");
  return `PNK-${datePart}-${String(sequence).padStart(3, "0")}`;
}
