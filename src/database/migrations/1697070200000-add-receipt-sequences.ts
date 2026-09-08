import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddReceiptSequences1697070200000 implements MigrationInterface {
  name = "AddReceiptSequences1697070200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS receipt_daily_sequences (
        receipt_date DATE PRIMARY KEY,
        last_value INTEGER NOT NULL,
        CONSTRAINT receipt_daily_sequences_positive CHECK (last_value > 0)
      )
    `);
    await queryRunner.query(`
      INSERT INTO receipt_daily_sequences (receipt_date, last_value)
      SELECT receipt_date, MAX(SUBSTRING(receipt_number FROM '([0-9]+)$')::INTEGER)
      FROM warehouse_receipts
      WHERE receipt_number ~ '^PNK-[0-9]{8}-[0-9]+$'
      GROUP BY receipt_date
      ON CONFLICT (receipt_date) DO UPDATE
      SET last_value = GREATEST(receipt_daily_sequences.last_value, EXCLUDED.last_value)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS receipt_daily_sequences");
  }
}
