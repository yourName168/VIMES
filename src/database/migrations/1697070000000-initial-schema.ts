import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1697070000000 implements MigrationInterface {
  name = "InitialSchema1697070000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        tax_code VARCHAR(32),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT suppliers_name_not_blank CHECK (BTRIM(name) <> '')
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouse_receipts (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        receipt_number VARCHAR(50) NOT NULL UNIQUE,
        receipt_date DATE NOT NULL,
        document_number VARCHAR(50),
        document_date DATE,
        supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
        deliverer_name VARCHAR(255) NOT NULL,
        delivery_reason TEXT NOT NULL,
        warehouse_name VARCHAR(255) NOT NULL,
        warehouse_address TEXT NOT NULL DEFAULT '',
        debit_account VARCHAR(20) NOT NULL,
        credit_account VARCHAR(20) NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT warehouse_receipts_total_nonnegative CHECK (total_amount >= 0),
        CONSTRAINT warehouse_receipts_number_not_blank CHECK (BTRIM(receipt_number) <> '')
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouse_receipt_items (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        receipt_id BIGINT NOT NULL REFERENCES warehouse_receipts(id) ON DELETE CASCADE,
        line_number INTEGER NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        item_code VARCHAR(80),
        unit VARCHAR(30) NOT NULL,
        quantity_document NUMERIC(18, 3) NOT NULL,
        quantity_actual NUMERIC(18, 3) NOT NULL,
        unit_price NUMERIC(18, 2) NOT NULL,
        amount NUMERIC(18, 2) GENERATED ALWAYS AS (ROUND(quantity_actual * unit_price, 2)) STORED,
        CONSTRAINT warehouse_receipt_items_unique_line UNIQUE (receipt_id, line_number),
        CONSTRAINT warehouse_receipt_items_name_not_blank CHECK (BTRIM(item_name) <> ''),
        CONSTRAINT warehouse_receipt_items_quantity_nonnegative CHECK (
          quantity_document >= 0 AND quantity_actual > 0 AND unit_price >= 0
        )
      )
    `);
    await queryRunner.query("CREATE INDEX IF NOT EXISTS warehouse_receipts_date_idx ON warehouse_receipts(receipt_date DESC)");
    await queryRunner.query("CREATE INDEX IF NOT EXISTS warehouse_receipts_supplier_idx ON warehouse_receipts(supplier_id)");
    await queryRunner.query("CREATE INDEX IF NOT EXISTS warehouse_receipt_items_receipt_idx ON warehouse_receipt_items(receipt_id)");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS warehouse_receipt_items");
    await queryRunner.query("DROP TABLE IF EXISTS warehouse_receipts");
    await queryRunner.query("DROP TABLE IF EXISTS suppliers");
  }
}
