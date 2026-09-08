import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddProducts1697070100000 implements MigrationInterface {
  name = "AddProducts1697070100000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        code VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        specification TEXT NOT NULL DEFAULT '',
        default_unit VARCHAR(30) NOT NULL,
        default_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT products_code_not_blank CHECK (BTRIM(code) <> ''),
        CONSTRAINT products_name_not_blank CHECK (BTRIM(name) <> ''),
        CONSTRAINT products_price_nonnegative CHECK (default_price >= 0)
      )
    `);
    await queryRunner.query(`
      ALTER TABLE warehouse_receipt_items
      ADD COLUMN IF NOT EXISTS product_id BIGINT REFERENCES products(id)
    `);
    await queryRunner.query("CREATE INDEX IF NOT EXISTS products_name_search_idx ON products(LOWER(name))");
    await queryRunner.query("CREATE INDEX IF NOT EXISTS warehouse_receipt_items_product_idx ON warehouse_receipt_items(product_id)");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE warehouse_receipt_items DROP COLUMN IF EXISTS product_id");
    await queryRunner.query("DROP TABLE IF EXISTS products");
  }
}
