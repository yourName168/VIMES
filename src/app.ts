import express, { type Express } from "express";
import { join } from "node:path";
import type { WarehouseReceiptController } from "./app/controllers/warehouse-receipt.controller.js";
import type { ProductController } from "./app/controllers/product.controller.js";
import { createReceiptRouter } from "./app/routes/warehouse-receipt.routes.js";
import { createProductRouter } from "./app/routes/product.routes.js";
import { errorHandler } from "./shared/http/error-handler.js";
import { notFoundHandler } from "./shared/http/not-found-handler.js";
import { requestContext } from "./shared/http/request-context.js";
import { sendSuccess } from "./shared/http/api-response.js";

export function createHttpApp(
  receiptController: WarehouseReceiptController,
  productController: ProductController,
): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestContext);
  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(join(process.cwd(), "public")));
  app.get("/health", (_request, response) =>
    sendSuccess(response, { status: "ok" }),
  );
  app.use("/api/receipts", createReceiptRouter(receiptController));
  app.use("/api/products", createProductRouter(productController));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
