import "dotenv/config";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { ProductEntity } from "../app/entities/product.entity.js";
import { ReceiptDailySequenceEntity } from "../app/entities/receipt-daily-sequence.entity.js";
import { SupplierEntity } from "../app/entities/supplier.entity.js";
import { WarehouseReceiptItemEntity } from "../app/entities/warehouse-receipt-item.entity.js";
import { WarehouseReceiptEntity } from "../app/entities/warehouse-receipt.entity.js";
import { InitialSchema1697070000000 } from "./migrations/1697070000000-initial-schema.js";
import { AddProducts1697070100000 } from "./migrations/1697070100000-add-products.js";
import { AddReceiptSequences1697070200000 } from "./migrations/1697070200000-add-receipt-sequences.js";

export const appDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  poolSize: Number(process.env.DB_POOL_MAX ?? 10),
  synchronize: false,
  migrationsRun: false,
  migrationsTableName: "typeorm_migrations",
  migrationsTransactionMode: "each",
  logging: process.env.DB_LOGGING === "true",
  entities: [
    ProductEntity,
    ReceiptDailySequenceEntity,
    SupplierEntity,
    WarehouseReceiptEntity,
    WarehouseReceiptItemEntity,
  ],
  migrations: [
    InitialSchema1697070000000,
    AddProducts1697070100000,
    AddReceiptSequences1697070200000,
  ],
});
