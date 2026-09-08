import { z } from "zod";

const requiredText = (label: string, max = 255) =>
  z.string().trim().min(1, `${label} không được để trống`).max(max, `${label} quá dài`);

const optionalText = (max = 255) =>
  z.string().trim().max(max, "Nội dung quá dài").optional()
    .transform((value) => value || undefined);

const isoDate = (label: string) => z.string().date(`${label} không đúng định dạng YYYY-MM-DD`);

const optionalDate = (label: string) =>
  z.union([z.literal(""), isoDate(label)]).optional()
    .transform((value) => value || undefined);

export const createReceiptSchema = z.object({
  receiptDate: isoDate("Ngày nhập"),
  documentNumber: optionalText(50),
  documentDate: optionalDate("Ngày chứng từ"),
  supplierName: requiredText("Đơn vị giao", 255),
  supplierAddress: z.string().trim().max(1000, "Địa chỉ quá dài").default(""),
  supplierTaxCode: optionalText(32),
  delivererName: requiredText("Họ tên người giao", 255),
  deliveryReason: requiredText("Lý do nhập", 1000),
  warehouseName: requiredText("Kho nhập", 255),
  warehouseAddress: z.string().trim().max(1000, "Địa điểm kho quá dài").default(""),
  debitAccount: requiredText("Tài khoản Nợ", 20),
  creditAccount: requiredText("Tài khoản Có", 20),
  notes: optionalText(2000),
  items: z.array(z.object({
    itemName: requiredText("Tên hàng", 255),
    itemCode: optionalText(80),
    unit: requiredText("Đơn vị tính", 30),
    quantityDocument: z.number().finite().min(0, "Số lượng chứng từ không được âm").max(1_000_000_000),
    quantityActual: z.number().finite().positive("Số lượng thực nhập phải lớn hơn 0").max(1_000_000_000),
    unitPrice: z.number().finite().min(0, "Đơn giá không được âm").max(1_000_000_000_000),
  })).min(1, "Phiếu phải có ít nhất một mặt hàng").max(200, "Một phiếu chỉ được tối đa 200 mặt hàng"),
}).strict();
