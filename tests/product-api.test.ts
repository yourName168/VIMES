import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { ProductRepositoryPort } from "../src/app/repositories/product.repository.js";
import type { WarehouseReceiptRepositoryPort } from "../src/app/repositories/warehouse-receipt.repository.js";
import { createApp } from "../src/main/create-app.js";

const receiptRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  list: vi.fn(),
} as WarehouseReceiptRepositoryPort;

describe("product search API", () => {
  it("returns matching products", async () => {
    const search = vi.fn().mockResolvedValue([
      {
        id: "5",
        code: "VT-001",
        name: "Vòng bi 6204",
        specification: "",
        defaultUnit: "Cái",
        defaultPrice: 125500,
      },
    ]);
    const productRepository = { search } as ProductRepositoryPort;
    const response = await request(createApp(receiptRepository, productRepository))
      .get("/api/products?q=VT&limit=10");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0].code).toBe("VT-001");
    expect(response.body.meta.count).toBe(1);
    expect(search).toHaveBeenCalledWith("VT", 10);
  });

  it("does not query the database for an empty search", async () => {
    const search = vi.fn();
    const productRepository = { search } as ProductRepositoryPort;
    const response = await request(createApp(receiptRepository, productRepository))
      .get("/api/products?q=");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });
});
