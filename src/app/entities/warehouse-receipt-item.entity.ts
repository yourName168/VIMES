import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import { numericTransformer } from "../../database/numeric-transformer.js";
import { ProductEntity } from "./product.entity.js";
import { WarehouseReceiptEntity } from "./warehouse-receipt.entity.js";

@Entity({ name: "warehouse_receipt_items" })
@Index("warehouse_receipt_items_receipt_idx", ["receiptId"])
@Index("warehouse_receipt_items_product_idx", ["productId"])
@Index("warehouse_receipt_items_unique_line", ["receiptId", "lineNumber"], { unique: true })
export class WarehouseReceiptItemEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "receipt_id", type: "bigint" })
  receiptId!: string;

  @ManyToOne(() => WarehouseReceiptEntity, (receipt) => receipt.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "receipt_id" })
  receipt!: Relation<WarehouseReceiptEntity>;

  @Column({ name: "product_id", type: "bigint", nullable: true })
  productId!: string | null;

  @ManyToOne(() => ProductEntity, (product) => product.receiptItems, { nullable: true })
  @JoinColumn({ name: "product_id" })
  product!: Relation<ProductEntity> | null;

  @Column({ name: "line_number", type: "integer" })
  lineNumber!: number;

  @Column({ name: "item_name", type: "varchar", length: 255 })
  itemName!: string;

  @Column({ name: "item_code", type: "varchar", length: 80, nullable: true })
  itemCode!: string | null;

  @Column({ type: "varchar", length: 30 })
  unit!: string;

  @Column({ name: "quantity_document", type: "numeric", precision: 18, scale: 3, transformer: numericTransformer })
  quantityDocument!: number;

  @Column({ name: "quantity_actual", type: "numeric", precision: 18, scale: 3, transformer: numericTransformer })
  quantityActual!: number;

  @Column({ name: "unit_price", type: "numeric", precision: 18, scale: 2, transformer: numericTransformer })
  unitPrice!: number;

  @Column({ type: "numeric", precision: 18, scale: 2, insert: false, update: false, transformer: numericTransformer })
  amount!: number;
}
