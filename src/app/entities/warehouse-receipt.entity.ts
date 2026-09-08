import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from "typeorm";
import { numericTransformer } from "../../database/numeric-transformer.js";
import { SupplierEntity } from "./supplier.entity.js";
import { WarehouseReceiptItemEntity } from "./warehouse-receipt-item.entity.js";

@Entity({ name: "warehouse_receipts" })
@Index("warehouse_receipts_date_idx", ["receiptDate"])
@Index("warehouse_receipts_supplier_idx", ["supplierId"])
export class WarehouseReceiptEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "receipt_number", type: "varchar", length: 50, unique: true })
  receiptNumber!: string;

  @Column({ name: "receipt_date", type: "date" })
  receiptDate!: string;

  @Column({ name: "document_number", type: "varchar", length: 50, nullable: true })
  documentNumber!: string | null;

  @Column({ name: "document_date", type: "date", nullable: true })
  documentDate!: string | null;

  @Column({ name: "supplier_id", type: "bigint" })
  supplierId!: string;

  @ManyToOne(() => SupplierEntity, (supplier) => supplier.receipts, { nullable: false })
  @JoinColumn({ name: "supplier_id" })
  supplier!: Relation<SupplierEntity>;

  @Column({ name: "deliverer_name", type: "varchar", length: 255 })
  delivererName!: string;

  @Column({ name: "delivery_reason", type: "text" })
  deliveryReason!: string;

  @Column({ name: "warehouse_name", type: "varchar", length: 255 })
  warehouseName!: string;

  @Column({ name: "warehouse_address", type: "text", default: "" })
  warehouseAddress!: string;

  @Column({ name: "debit_account", type: "varchar", length: 20 })
  debitAccount!: string;

  @Column({ name: "credit_account", type: "varchar", length: 20 })
  creditAccount!: string;

  @Column({ type: "text", default: "" })
  notes!: string;

  @Column({
    name: "total_amount",
    type: "numeric",
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  totalAmount!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => WarehouseReceiptItemEntity, (item) => item.receipt)
  items!: Relation<WarehouseReceiptItemEntity[]>;
}

export interface ReceiptItemInput {
  itemName: string;
  itemCode?: string | undefined;
  unit: string;
  quantityDocument: number;
  quantityActual: number;
  unitPrice: number;
}

export interface CreateReceiptInput {
  receiptDate: string;
  documentNumber?: string | undefined;
  documentDate?: string | undefined;
  supplierName: string;
  supplierAddress: string;
  supplierTaxCode?: string | undefined;
  delivererName: string;
  deliveryReason: string;
  warehouseName: string;
  warehouseAddress: string;
  debitAccount: string;
  creditAccount: string;
  notes?: string | undefined;
  items: ReceiptItemInput[];
}

export interface ReceiptItemView extends ReceiptItemInput {
  id: string;
  lineNumber: number;
  amount: number;
}

export interface WarehouseReceiptView extends CreateReceiptInput {
  id: string;
  receiptNumber: string;
  totalAmount: number;
  createdAt: string;
  items: ReceiptItemView[];
}

export interface WarehouseReceiptSummary {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  supplierName: string;
  warehouseName: string;
  totalAmount: number;
  itemCount: number;
}
