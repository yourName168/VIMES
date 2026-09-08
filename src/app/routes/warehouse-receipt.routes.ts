import { Router } from "express";
import type { WarehouseReceiptController } from "../controllers/warehouse-receipt.controller.js";

export function createReceiptRouter(controller: WarehouseReceiptController): Router {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  return router;
}
