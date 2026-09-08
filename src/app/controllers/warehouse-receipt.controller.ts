import type { Request, Response } from "express";
import type { WarehouseReceiptService } from "../services/warehouse-receipt.service.js";
import { InvalidReceiptIdError } from "../errors/warehouse-receipt.errors.js";
import { createReceiptSchema } from "../schemas/warehouse-receipt.schema.js";
import { sendSuccess } from "../../shared/http/api-response.js";

export class WarehouseReceiptController {
  constructor(private readonly service: WarehouseReceiptService) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const input = createReceiptSchema.parse(request.body);
    const receipt = await this.service.create(input);
    response.location(`/api/receipts/${receipt.id}`);
    sendSuccess(response, receipt, 201);
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const id = typeof request.params.id === "string" ? request.params.id : "";
    if (!/^\d+$/.test(id)) {
      throw new InvalidReceiptIdError();
    }
    sendSuccess(response, await this.service.getById(id));
  };

  list = async (request: Request, response: Response): Promise<void> => {
    const requestedLimit = Number(request.query.limit ?? 20);
    const limit = Number.isInteger(requestedLimit) ? requestedLimit : 20;
    const receipts = await this.service.list(limit);
    sendSuccess(response, receipts, 200, { count: receipts.length });
  };
}
