import type { DataSource, EntityManager } from "typeorm";
import { ProductEntity } from "../entities/product.entity.js";
import { SupplierEntity } from "../entities/supplier.entity.js";
import { WarehouseReceiptItemEntity } from "../entities/warehouse-receipt-item.entity.js";
import {
  WarehouseReceiptEntity,
  type CreateReceiptInput,
  type ReceiptItemInput,
  type WarehouseReceiptSummary,
  type WarehouseReceiptView,
} from "../entities/warehouse-receipt.entity.js";
import { DuplicateReceiptNumberError } from "../errors/warehouse-receipt.errors.js";
import { formatWarehouseReceiptNumber } from "../utils/receipt-number.js";

export interface WarehouseReceiptRepositoryPort {
  create(input: CreateReceiptInput, totalAmount: number): Promise<WarehouseReceiptView>;
  findById(id: string): Promise<WarehouseReceiptView | null>;
  list(limit: number): Promise<WarehouseReceiptSummary[]>;
}

export class WarehouseReceiptRepository implements WarehouseReceiptRepositoryPort {
  constructor(private readonly dataSource: DataSource) {}

  async create(input: CreateReceiptInput, totalAmount: number): Promise<WarehouseReceiptView> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const receiptNumber = await this.nextReceiptNumber(manager, input.receiptDate);
        const supplier = await this.createSupplier(manager, input);
        const receipt = await this.createReceipt(
          manager,
          input,
          receiptNumber,
          supplier.id,
          totalAmount,
        );
        await this.createItems(manager, receipt.id, input.items);
        const saved = await this.findEntityById(manager, receipt.id);
        if (!saved) throw new Error("Không thể đọc phiếu vừa tạo");
        return mapReceipt(saved);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateReceiptNumberError();
      throw error;
    }
  }

  async findById(id: string): Promise<WarehouseReceiptView | null> {
    const receipt = await this.findEntityById(this.dataSource.manager, id);
    return receipt ? mapReceipt(receipt) : null;
  }

  async list(limit: number): Promise<WarehouseReceiptSummary[]> {
    const rows = await this.dataSource
      .getRepository(WarehouseReceiptEntity)
      .createQueryBuilder("receipt")
      .innerJoin("receipt.supplier", "supplier")
      .leftJoin("receipt.items", "item")
      .select("receipt.id", "id")
      .addSelect("receipt.receiptNumber", "receiptNumber")
      .addSelect("TO_CHAR(receipt.receiptDate, 'YYYY-MM-DD')", "receiptDate")
      .addSelect("supplier.name", "supplierName")
      .addSelect("receipt.warehouseName", "warehouseName")
      .addSelect("receipt.totalAmount", "totalAmount")
      .addSelect("COUNT(item.id)", "itemCount")
      .groupBy("receipt.id")
      .addGroupBy("supplier.name")
      .orderBy("receipt.receiptDate", "DESC")
      .addOrderBy("receipt.id", "DESC")
      .take(limit)
      .getRawMany<SummaryRow>();

    return rows.map((row) => ({
      id: row.id,
      receiptNumber: row.receiptNumber,
      receiptDate: row.receiptDate,
      supplierName: row.supplierName,
      warehouseName: row.warehouseName,
      totalAmount: Number(row.totalAmount),
      itemCount: Number(row.itemCount),
    }));
  }

  private async nextReceiptNumber(manager: EntityManager, receiptDate: string): Promise<string> {
    const rows = await manager.query<Array<{ last_value: number }>>(
      `INSERT INTO receipt_daily_sequences (receipt_date, last_value)
       VALUES ($1, 1)
       ON CONFLICT (receipt_date) DO UPDATE
       SET last_value = receipt_daily_sequences.last_value + 1
       RETURNING last_value`,
      [receiptDate],
    );
    const sequence = rows[0]?.last_value;
    if (!sequence) throw new Error("Không thể sinh số phiếu");
    return formatWarehouseReceiptNumber(receiptDate, sequence);
  }

  private async createSupplier(
    manager: EntityManager,
    input: CreateReceiptInput,
  ): Promise<SupplierEntity> {
    const repository = manager.getRepository(SupplierEntity);
    return repository.save(repository.create({
      name: input.supplierName,
      address: input.supplierAddress,
      taxCode: input.supplierTaxCode ?? null,
    }));
  }

  private async createReceipt(
    manager: EntityManager,
    input: CreateReceiptInput,
    receiptNumber: string,
    supplierId: string,
    totalAmount: number,
  ): Promise<WarehouseReceiptEntity> {
    const repository = manager.getRepository(WarehouseReceiptEntity);
    return repository.save(repository.create({
      receiptNumber,
      receiptDate: input.receiptDate,
      documentNumber: input.documentNumber ?? null,
      documentDate: input.documentDate ?? null,
      supplierId,
      delivererName: input.delivererName,
      deliveryReason: input.deliveryReason,
      warehouseName: input.warehouseName,
      warehouseAddress: input.warehouseAddress,
      debitAccount: input.debitAccount,
      creditAccount: input.creditAccount,
      notes: input.notes ?? "",
      totalAmount,
    }));
  }

  private async createItems(
    manager: EntityManager,
    receiptId: string,
    items: ReceiptItemInput[],
  ): Promise<void> {
    const itemRepository = manager.getRepository(WarehouseReceiptItemEntity);
    const entities: WarehouseReceiptItemEntity[] = [];
    for (const [index, item] of items.entries()) {
      const productId = item.itemCode ? await this.upsertProduct(manager, item) : null;
      entities.push(itemRepository.create({
        receiptId,
        productId,
        lineNumber: index + 1,
        itemName: item.itemName,
        itemCode: item.itemCode?.trim().toUpperCase() ?? null,
        unit: item.unit,
        quantityDocument: item.quantityDocument,
        quantityActual: item.quantityActual,
        unitPrice: item.unitPrice,
      }));
    }
    await itemRepository.save(entities);
  }

  private async upsertProduct(manager: EntityManager, item: ReceiptItemInput): Promise<string> {
    const repository = manager.getRepository(ProductEntity);
    const code = item.itemCode!.trim().toUpperCase();
    await repository.upsert(
      {
        code,
        name: item.itemName,
        defaultUnit: item.unit,
        defaultPrice: item.unitPrice,
        isActive: true,
      },
      { conflictPaths: ["code"] },
    );
    const product = await repository.findOneBy({ code });
    if (!product) throw new Error("Không thể đồng bộ danh mục hàng hóa");
    return product.id;
  }

  private findEntityById(
    manager: EntityManager,
    id: string,
  ): Promise<WarehouseReceiptEntity | null> {
    return manager.getRepository(WarehouseReceiptEntity).findOne({
      where: { id },
      relations: { supplier: true, items: true },
      order: { items: { lineNumber: "ASC" } },
    });
  }
}

function mapReceipt(receipt: WarehouseReceiptEntity): WarehouseReceiptView {
  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    receiptDate: receipt.receiptDate,
    documentNumber: receipt.documentNumber ?? undefined,
    documentDate: receipt.documentDate ?? undefined,
    supplierName: receipt.supplier.name,
    supplierAddress: receipt.supplier.address,
    supplierTaxCode: receipt.supplier.taxCode ?? undefined,
    delivererName: receipt.delivererName,
    deliveryReason: receipt.deliveryReason,
    warehouseName: receipt.warehouseName,
    warehouseAddress: receipt.warehouseAddress,
    debitAccount: receipt.debitAccount,
    creditAccount: receipt.creditAccount,
    notes: receipt.notes || undefined,
    totalAmount: receipt.totalAmount,
    createdAt: receipt.createdAt.toISOString(),
    items: receipt.items.map((item) => ({
      id: item.id,
      lineNumber: item.lineNumber,
      itemName: item.itemName,
      itemCode: item.itemCode ?? undefined,
      unit: item.unit,
      quantityDocument: item.quantityDocument,
      quantityActual: item.quantityActual,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505") return true;
  return "driverError" in error && typeof error.driverError === "object" &&
    error.driverError !== null && "code" in error.driverError &&
    error.driverError.code === "23505";
}

interface SummaryRow {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  supplierName: string;
  warehouseName: string;
  totalAmount: string;
  itemCount: string;
}
