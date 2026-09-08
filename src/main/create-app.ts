import type { ProductRepositoryPort } from "../app/repositories/product.repository.js";
import { ProductService } from "../app/services/product.service.js";
import { ProductController } from "../app/controllers/product.controller.js";
import type { WarehouseReceiptRepositoryPort } from "../app/repositories/warehouse-receipt.repository.js";
import { WarehouseReceiptService } from "../app/services/warehouse-receipt.service.js";
import { WarehouseReceiptController } from "../app/controllers/warehouse-receipt.controller.js";
import { createHttpApp } from "../app.js";

export function createApp(
  receiptRepository: WarehouseReceiptRepositoryPort,
  productRepository: ProductRepositoryPort,
) {
  const receiptController = new WarehouseReceiptController(
    new WarehouseReceiptService(receiptRepository),
  );
  const productController = new ProductController(new ProductService(productRepository));
  return createHttpApp(receiptController, productController);
}
