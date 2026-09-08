import type { WarehouseReceiptRepositoryPort } from "../repositories/warehouse-receipt.repository.js";
import type {
  CreateReceiptInput,
  WarehouseReceiptView,
  WarehouseReceiptSummary,
} from "../entities/warehouse-receipt.entity.js";
import { ReceiptNotFoundError } from "../errors/warehouse-receipt.errors.js";
import { calculateReceiptTotal } from "../utils/receipt-amount.js";

export class WarehouseReceiptService {
  constructor(private readonly repository: WarehouseReceiptRepositoryPort) {}

  async create(input: CreateReceiptInput): Promise<WarehouseReceiptView> {
    const totalAmount = calculateReceiptTotal(input);
    return this.repository.create(input, totalAmount);
  }

  async getById(id: string): Promise<WarehouseReceiptView> {
    const receipt = await this.repository.findById(id);
    if (!receipt) throw new ReceiptNotFoundError();
    return receipt;
  }

  list(limit = 20): Promise<WarehouseReceiptSummary[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return this.repository.list(safeLimit);
  }
}
