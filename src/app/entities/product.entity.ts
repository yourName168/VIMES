import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from "typeorm";
import { numericTransformer } from "../../database/numeric-transformer.js";
import { WarehouseReceiptItemEntity } from "./warehouse-receipt-item.entity.js";

@Entity({ name: "products" })
export class ProductEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ type: "varchar", length: 80, unique: true })
  code!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", default: "" })
  specification!: string;

  @Column({ name: "default_unit", type: "varchar", length: 30 })
  defaultUnit!: string;

  @Column({
    name: "default_price",
    type: "numeric",
    precision: 18,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  defaultPrice!: number;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => WarehouseReceiptItemEntity, (item) => item.product)
  receiptItems!: Relation<WarehouseReceiptItemEntity[]>;
}

export interface ProductView {
  id: string;
  code: string;
  name: string;
  specification: string;
  defaultUnit: string;
  defaultPrice: number;
}
