import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { ProductRepositoryPort } from "../src/app/repositories/product.repository.js";
import type { WarehouseReceiptRepositoryPort } from "../src/app/repositories/warehouse-receipt.repository.js";
import { createApp } from "../src/main/create-app.js";

const receiptRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  list: vi.fn().mockResolvedValue([]),
} as WarehouseReceiptRepositoryPort;
const productRepository = {
  search: vi.fn().mockResolvedValue([]),
} as ProductRepositoryPort;

describe("standard API response envelope", () => {
  it("uses the success envelope for health check", async () => {
    const response = await request(createApp(receiptRepository, productRepository))
      .get("/health")
      .set("x-request-id", "health-check-id");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { status: "ok" },
      meta: { requestId: "health-check-id" },
    });
  });

  it("uses the error envelope for an unknown route", async () => {
    const response = await request(createApp(receiptRepository, productRepository))
      .get("/api/not-found")
      .set("x-request-id", "not-found-id");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "Không tìm thấy GET /api/not-found",
      },
      meta: { requestId: "not-found-id" },
    });
  });
});
