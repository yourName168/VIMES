import type { Request, Response } from "express";
import type { ProductService } from "../services/product.service.js";
import { sendSuccess } from "../../shared/http/api-response.js";

export class ProductController {
  constructor(private readonly service: ProductService) {}

  search = async (request: Request, response: Response): Promise<void> => {
    const query = typeof request.query.q === "string" ? request.query.q : "";
    const requestedLimit = Number(request.query.limit ?? 10);
    const limit = Number.isInteger(requestedLimit) ? requestedLimit : 10;
    const products = await this.service.search(query, limit);
    sendSuccess(response, products, 200, { count: products.length });
  };
}
