import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "receipt_daily_sequences" })
export class ReceiptDailySequenceEntity {
  @PrimaryColumn({ name: "receipt_date", type: "date" })
  receiptDate!: string;

  @Column({ name: "last_value", type: "integer" })
  lastValue!: number;
}
