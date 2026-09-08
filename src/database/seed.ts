import "reflect-metadata";
import { ProductEntity } from "../app/entities/product.entity.js";
import { WarehouseReceiptEntity } from "../app/entities/warehouse-receipt.entity.js";
import { WarehouseReceiptRepository } from "../app/repositories/warehouse-receipt.repository.js";
import { WarehouseReceiptService } from "../app/services/warehouse-receipt.service.js";
import { appDataSource } from "./data-source.js";

const products = [
  {
    code: "VT-001",
    name: "Vòng bi 6204",
    specification: "NSK 20x47x14 mm",
    defaultUnit: "Cái",
    defaultPrice: 125_500,
    isActive: true,
  },
  {
    code: "VT-002",
    name: "Dây curoa B-52",
    specification: "Bản B, chiều dài 52 inch",
    defaultUnit: "Sợi",
    defaultPrice: 186_000,
    isActive: true,
  },
  {
    code: "DL-010",
    name: "Dầu thủy lực ISO VG 46",
    specification: "Can 18 lít",
    defaultUnit: "Can",
    defaultPrice: 1_245_000,
    isActive: true,
  },
  {
    code: "DC-101",
    name: "Động cơ điện 3 pha",
    specification: "2.2 kW, 380 V",
    defaultUnit: "Bộ",
    defaultPrice: 4_850_000,
    isActive: true,
  },
  {
    code: "BL-025",
    name: "Bu lông inox M10x50",
    specification: "Inox 304",
    defaultUnit: "Cái",
    defaultPrice: 8_500,
    isActive: true,
  },
  {
    code: "PK-220",
    name: "Phớt cơ khí 22 mm",
    specification: "Carbon ceramic",
    defaultUnit: "Cái",
    defaultPrice: 215_000,
    isActive: true,
  },
  {
    code: "TB-040",
    name: "Tủ điện công nghiệp",
    specification: "400x600x200 mm, IP54",
    defaultUnit: "Tủ",
    defaultPrice: 2_680_000,
    isActive: true,
  },
  {
    code: "CD-016",
    name: "Cáp điện Cadivi 1x16",
    specification: "Cuộn 100 mét",
    defaultUnit: "Cuộn",
    defaultPrice: 3_150_000,
    isActive: true,
  },
] satisfies Array<Partial<ProductEntity>>;

const sampleReceipts = [
  {
    receiptDate: "2026-09-08",
    documentNumber: "HD-AP-0908",
    documentDate: "2026-09-08",
    supplierName: "Công ty Thiết bị An Phát",
    supplierAddress: "125 Nguyễn Văn Linh, Hải Phòng",
    supplierTaxCode: "0201987654",
    delivererName: "Nguyễn Minh Quân",
    deliveryReason: "Nhập vật tư bảo trì định kỳ",
    warehouseName: "Kho vật tư chính",
    warehouseAddress: "Khu công nghiệp Đình Vũ, Hải Phòng",
    debitAccount: "152",
    creditAccount: "331",
    notes: "Dữ liệu mẫu",
    items: [
      { itemName: "Vòng bi 6204", itemCode: "VT-001", unit: "Cái", quantityDocument: 24, quantityActual: 24, unitPrice: 125_500 },
      { itemName: "Dây curoa B-52", itemCode: "VT-002", unit: "Sợi", quantityDocument: 12, quantityActual: 12, unitPrice: 186_000 },
      { itemName: "Dầu thủy lực ISO VG 46", itemCode: "DL-010", unit: "Can", quantityDocument: 4, quantityActual: 4, unitPrice: 1_245_000 },
    ],
  },
  {
    receiptDate: "2026-09-07",
    documentNumber: "PGH-ME-4821",
    documentDate: "2026-09-07",
    supplierName: "Công ty Cơ điện Minh Hải",
    supplierAddress: "48 Phạm Văn Đồng, Hà Nội",
    supplierTaxCode: "0109234567",
    delivererName: "Trần Đức Long",
    deliveryReason: "Nhập thiết bị cho dây chuyền số 2",
    warehouseName: "Kho thiết bị",
    warehouseAddress: "Khu công nghiệp Quang Minh, Hà Nội",
    debitAccount: "156",
    creditAccount: "331",
    notes: "Dữ liệu mẫu",
    items: [
      { itemName: "Động cơ điện 3 pha", itemCode: "DC-101", unit: "Bộ", quantityDocument: 2, quantityActual: 2, unitPrice: 4_850_000 },
      { itemName: "Tủ điện công nghiệp", itemCode: "TB-040", unit: "Tủ", quantityDocument: 1, quantityActual: 1, unitPrice: 2_680_000 },
    ],
  },
  {
    receiptDate: "2026-09-06",
    documentNumber: "HD-KL-0916",
    documentDate: "2026-09-06",
    supplierName: "Công ty Kim khí Long Thành",
    supplierAddress: "76 Quốc lộ 51, Đồng Nai",
    supplierTaxCode: "3603789012",
    delivererName: "Lê Hoàng Nam",
    deliveryReason: "Bổ sung vật tư tiêu hao",
    warehouseName: "Kho vật tư chính",
    warehouseAddress: "Khu công nghiệp Đình Vũ, Hải Phòng",
    debitAccount: "152",
    creditAccount: "331",
    notes: "Dữ liệu mẫu",
    items: [
      { itemName: "Bu lông inox M10x50", itemCode: "BL-025", unit: "Cái", quantityDocument: 500, quantityActual: 500, unitPrice: 8_500 },
      { itemName: "Phớt cơ khí 22 mm", itemCode: "PK-220", unit: "Cái", quantityDocument: 20, quantityActual: 20, unitPrice: 215_000 },
    ],
  },
];

try {
  await appDataSource.initialize();
  await appDataSource.runMigrations({ transaction: "each" });

  const productRepository = appDataSource.getRepository(ProductEntity);
  await productRepository.upsert(products, { conflictPaths: ["code"] });

  const receiptService = new WarehouseReceiptService(
    new WarehouseReceiptRepository(appDataSource),
  );
  const receiptRepository = appDataSource.getRepository(WarehouseReceiptEntity);
  let createdReceipts = 0;

  for (const sample of sampleReceipts) {
    const exists = await receiptRepository.existsBy({
      documentNumber: sample.documentNumber,
      notes: "Dữ liệu mẫu",
    });
    if (!exists) {
      await receiptService.create(sample);
      createdReceipts += 1;
    }
  }

  console.log(
    `Seed hoàn tất: ${products.length} sản phẩm, ${createdReceipts} phiếu mới`,
  );
} finally {
  if (appDataSource.isInitialized) await appDataSource.destroy();
}
