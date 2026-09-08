import { describe, expect, it, vi } from "vitest";
import type { WarehouseReceiptRepositoryPort } from "../src/app/repositories/warehouse-receipt.repository.js";
import { WarehouseReceiptService } from "../src/app/services/warehouse-receipt.service.js";
import type { CreateReceiptInput } from "../src/app/entities/warehouse-receipt.entity.js";
import { calculateLineAmount, calculateReceiptTotal } from "../src/app/utils/receipt-amount.js";

const input: CreateReceiptInput = {
  receiptDate: "2026-09-08",
  supplierName: "Công ty Thiết bị An Phát",
  supplierAddress: "Hà Nội",
  delivererName: "Nguyễn Minh Quân",
  deliveryReason: "Nhập hàng mua ngoài",
  warehouseName: "Kho chính",
  warehouseAddress: "Hà Nội",
  debitAccount: "156",
  creditAccount: "331",
  items: [
    { itemName: "Vòng bi 6204", unit: "Cái", quantityDocument: 10, quantityActual: 10, unitPrice: 125_500 },
    { itemName: "Dầu máy công nghiệp", unit: "Lít", quantityDocument: 5.5, quantityActual: 5.5, unitPrice: 82_300 },
  ],
};

describe("receipt calculations", () => {
  it("rounds a line amount to two decimal places", () => {
    expect(calculateLineAmount(1.125, 10.25)).toBe(11.53);
  });

  it("calculates the total from actual quantities", () => {
    expect(calculateReceiptTotal(input)).toBe(1_707_650);
  });

  it("passes server-calculated amounts to the repository", async () => {
    const create = vi.fn().mockResolvedValue({ id: "1" });
    const repository = { create, findById: vi.fn(), list: vi.fn() } as unknown as WarehouseReceiptRepositoryPort;
    await new WarehouseReceiptService(repository).create(input);
    expect(create).toHaveBeenCalledWith(input, 1_707_650);
  });
});
