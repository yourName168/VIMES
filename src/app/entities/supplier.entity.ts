import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, type Relation } from "typeorm";
import { WarehouseReceiptEntity } from "./warehouse-receipt.entity.js";

@Entity({ name: "suppliers" })
export class SupplierEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", default: "" })
  address!: string;

  @Column({ name: "tax_code", type: "varchar", length: 32, nullable: true })
  taxCode!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @OneToMany(() => WarehouseReceiptEntity, (receipt) => receipt.supplier)
  receipts!: Relation<WarehouseReceiptEntity[]>;
}
