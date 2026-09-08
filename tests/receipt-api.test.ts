import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { ProductRepositoryPort } from "../src/app/repositories/product.repository.js";
import type { WarehouseReceiptRepositoryPort } from "../src/app/repositories/warehouse-receipt.repository.js";
import type { WarehouseReceiptView } from "../src/app/entities/warehouse-receipt.entity.js";
import { DuplicateReceiptNumberError } from "../src/app/errors/warehouse-receipt.errors.js";
import { createApp } from "../src/main/create-app.js";

const payload = {
  receiptDate: "2026-09-08",
  supplierName: "Công ty Thiết bị An Phát",
  supplierAddress: "Hà Nội",
  delivererName: "Nguyễn Minh Quân",
  deliveryReason: "Nhập hàng mua ngoài",
  warehouseName: "Kho chính",
  warehouseAddress: "Hà Nội",
  debitAccount: "156",
  creditAccount: "331",
  items: [{ itemName: "Vòng bi 6204", unit: "Cái", quantityDocument: 10, quantityActual: 10, unitPrice: 125500 }],
};

function repository(
  overrides: Partial<WarehouseReceiptRepositoryPort> = {},
): WarehouseReceiptRepositoryPort {
  const saved = {
    ...payload,
    id: "15",
    receiptNumber: "PNK-20260908-001",
    totalAmount: 1_255_000,
    createdAt: "2026-09-08T10:00:00.000Z",
    items: [{ ...payload.items[0], id: "22", lineNumber: 1, amount: 1_255_000 }],
  } as WarehouseReceiptView;
  return {
    create: vi.fn().mockResolvedValue(saved),
    findById: vi.fn().mockResolvedValue(saved),
    list: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const productRepository: ProductRepositoryPort = { search: vi.fn().mockResolvedValue([]) };

describe("receipt API", () => {
  it("creates a valid warehouse receipt", async () => {
    const response = await request(createApp(repository(), productRepository)).post("/api/receipts").send(payload);
    expect(response.status).toBe(201);
    expect(response.headers.location).toBe("/api/receipts/15");
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalAmount).toBe(1_255_000);
    expect(response.body.meta.requestId).toBeTruthy();
  });

  it("rejects a receipt without items", async () => {
    const repo = repository();
    const response = await request(createApp(repo, productRepository)).post("/api/receipts").send({ ...payload, items: [] });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.message).toBe("Dữ liệu chưa hợp lệ");
    expect(response.body.success).toBe(false);
    expect(response.body.meta.requestId).toBeTruthy();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("returns conflict for a duplicated receipt number", async () => {
    const repo = repository({ create: vi.fn().mockRejectedValue(new DuplicateReceiptNumberError()) });
    const response = await request(createApp(repo, productRepository)).post("/api/receipts").send(payload);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("RECEIPT_NUMBER_DUPLICATE");
  });

  it("returns 404 when a receipt does not exist", async () => {
    const repo = repository({ findById: vi.fn().mockResolvedValue(null) });
    const response = await request(createApp(repo, productRepository)).get("/api/receipts/999");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("RECEIPT_NOT_FOUND");
  });

  it("handles malformed JSON globally", async () => {
    const response = await request(createApp(repository(), productRepository))
      .post("/api/receipts")
      .set("Content-Type", "application/json")
      .send('{"receiptDate":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });

  it("does not expose an unexpected internal error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const repo = repository({ list: vi.fn().mockRejectedValue(new Error("database password secret")) });
    const response = await request(createApp(repo, productRepository)).get("/api/receipts");

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(JSON.stringify(response.body)).not.toContain("password secret");
    log.mockRestore();
  });

  it("uses the incoming request id in an error response", async () => {
    const response = await request(createApp(repository(), productRepository))
      .get("/api/receipts/not-a-number")
      .set("x-request-id", "request-from-client");

    expect(response.status).toBe(400);
    expect(response.headers["x-request-id"]).toBe("request-from-client");
    expect(response.body.error.code).toBe("RECEIPT_ID_INVALID");
    expect(response.body.meta.requestId).toBe("request-from-client");
  });
});
