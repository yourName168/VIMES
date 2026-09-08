import { Router } from "express";
import type { ProductController } from "../controllers/product.controller.js";

export function createProductRouter(controller: ProductController): Router {
  const router = Router();
  router.get("/", controller.search);
  return router;
}
