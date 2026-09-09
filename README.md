# VIMES Warehouse Receipts

Ứng dụng nhập và quản lý Phiếu nhập kho theo mẫu số 01-VT. Hệ thống hỗ trợ danh mục hàng hóa, tìm kiếm mã hàng, tự điền giá gợi ý, tự sinh số phiếu, lưu dữ liệu bằng transaction và in chứng từ.

## Chức năng

- Tạo phiếu nhập kho với nhiều dòng hàng.
- Tự sinh số phiếu theo mẫu `PNK-YYYYMMDD-001`.
- Tìm hàng hóa theo mã hoặc tên bằng search combobox.
- Tự điền tên, đơn vị tính và giá nhập gợi ý khi chọn hàng.
- Tính thành tiền từng dòng và tổng phiếu tại frontend lẫn backend.
- Tự cập nhật danh mục và giá gần nhất khi nhập một mã hàng mới.
- Xem danh sách phiếu gần đây và in phiếu theo bố cục chứng từ.
- Response API và global exception có định dạng thống nhất.

## Công nghệ

- Node.js 20 trở lên, Express 5 và TypeScript.
- PostgreSQL 17, TypeORM và driver `pg`.
- Zod để kiểm tra request.
- Vitest và Supertest cho unit/API tests.
- HTML, CSS và JavaScript thuần cho giao diện.

## Yêu cầu môi trường

- Node.js 20 trở lên.
- npm 10 trở lên.
- Docker và Docker Compose.

## Chạy nhanh

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Mở ứng dụng tại [http://localhost:3100](http://localhost:3100).

PostgreSQL của dự án được ánh xạ ra cổng `55432` để tránh xung đột với PostgreSQL khác trên máy.

## Biến môi trường

```env
PORT=3100
DATABASE_URL=postgresql://vimes:vimes@localhost:55432/vimes_warehouse
DB_SSL=false
DB_POOL_MAX=10
DB_LOGGING=false
```

| Biến | Ý nghĩa | Mặc định |
|---|---|---|
| `PORT` | Cổng HTTP của ứng dụng | `3100` |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL | PostgreSQL Docker cổng `55432` |
| `DB_SSL` | Bật SSL khi kết nối database | `false` |
| `DB_POOL_MAX` | Số connection tối đa mỗi Node instance | `10` |
| `DB_LOGGING` | Hiển thị truy vấn TypeORM | `false` |

Tổng connection tối đa bằng `số Node instance x DB_POOL_MAX`.

## Các lệnh npm

| Lệnh | Chức năng |
|---|---|
| `npm run dev` | Chạy development server và tự reload |
| `npm run build` | Xóa build cũ và biên dịch TypeScript |
| `npm start` | Chạy production build trong `dist` |
| `npm run db:migrate` | Chạy TypeORM migrations chưa được áp dụng |
| `npm run db:seed` | Tạo dữ liệu mẫu, có thể chạy lại an toàn |
| `npm run typecheck` | Kiểm tra TypeScript và unused code |
| `npm test` | Chạy toàn bộ test |
| `npm run test:watch` | Chạy test ở chế độ theo dõi |
| `npm run clean` | Xóa thư mục `dist` |

## Dữ liệu mẫu

```bash
npm run db:seed
```

Seed tạo 8 sản phẩm, 3 nhà cung cấp, 3 phiếu nhập kho và 7 dòng hàng. Seed là idempotent: chạy lại không tạo phiếu mẫu trùng vì hệ thống kiểm tra `documentNumber` và nhãn `Dữ liệu mẫu` trước khi tạo.

## Cấu trúc source code

```text
src/
├── app/
│   ├── entities/             # TypeORM entities và response models
│   ├── controllers/          # Nhận request và gọi service
│   ├── services/             # Quy tắc và điều phối nghiệp vụ
│   ├── repositories/         # TypeORM queries và transaction
│   ├── schemas/              # Zod request validation
│   ├── routes/               # Express routes
│   ├── errors/               # Exception nghiệp vụ
│   └── utils/                # Tính tiền và định dạng số phiếu
├── database/
│   ├── migrations/           # TypeORM migrations có version
│   ├── data-source.ts        # Entities, migrations và connection pool
│   ├── migrate.ts            # Migration runner
│   ├── seed.ts               # Dữ liệu mẫu
│   └── numeric-transformer.ts
├── shared/
│   ├── errors/               # Base application exception
│   └── http/                 # Response và global middleware
├── main/
│   ├── create-app.ts         # Dependency injection
│   ├── process-error-handlers.ts
│   └── server.ts             # Khởi tạo DataSource và HTTP server
└── app.ts                    # Cấu hình Express, middleware và routes
```

Luồng xử lý:

```text
Route -> Controller -> Service -> Repository -> TypeORM -> PostgreSQL
```

Controller không chứa truy vấn database. Service xử lý nghiệp vụ. Repository chịu trách nhiệm truy vấn và transaction.

## Mô hình dữ liệu

```text
suppliers 1 ---- N warehouse_receipts
warehouse_receipts 1 ---- N warehouse_receipt_items
products 1 ---- N warehouse_receipt_items
receipt_daily_sequences
```

- `products`: mã hàng duy nhất, tên, quy cách, đơn vị, giá gợi ý và trạng thái.
- `suppliers`: tên, địa chỉ và mã số thuế của đơn vị giao hàng.
- `warehouse_receipts`: thông tin đầu phiếu, chứng từ, kho, tài khoản và tổng tiền.
- `warehouse_receipt_items`: snapshot mã, tên, đơn vị, số lượng và giá tại thời điểm nhập. PostgreSQL tự tính `amount`.
- `receipt_daily_sequences`: bộ đếm số phiếu theo ngày.

TypeORM được cấu hình `synchronize: false`. Schema chỉ thay đổi thông qua migrations trong `src/database/migrations`.

## Transaction tạo phiếu

Toàn bộ thao tác sau nằm trong một TypeORM transaction:

1. Tăng bộ đếm số phiếu theo ngày bằng câu lệnh PostgreSQL atomic.
2. Tạo nhà cung cấp.
3. Tạo thông tin đầu phiếu.
4. Upsert hàng hóa có mã.
5. Tạo các dòng hàng.
6. Đọc và trả phiếu hoàn chỉnh.

Nếu một thao tác thất bại, TypeORM rollback toàn bộ transaction.

## API

### Health check

```http
GET /health
```

### Tìm hàng hóa

```http
GET /api/products?q=VT&limit=10
```

`q` tìm theo một phần mã hoặc tên. `limit` được giới hạn tối đa 20.

### Danh sách và chi tiết phiếu

```http
GET /api/receipts?limit=20
GET /api/receipts/5
```

### Tạo phiếu nhập

```http
POST /api/receipts
Content-Type: application/json
```

Ví dụ request:

```json
{
  "receiptDate": "2026-09-09",
  "documentNumber": "HD-2026-0909",
  "documentDate": "2026-09-09",
  "supplierName": "Công ty Thiết bị An Phát",
  "supplierAddress": "125 Nguyễn Văn Linh, Hải Phòng",
  "supplierTaxCode": "0201987654",
  "delivererName": "Nguyễn Minh Quân",
  "deliveryReason": "Nhập vật tư bảo trì",
  "warehouseName": "Kho vật tư chính",
  "warehouseAddress": "Khu công nghiệp Đình Vũ, Hải Phòng",
  "debitAccount": "152",
  "creditAccount": "331",
  "items": [
    {
      "itemName": "Vòng bi 6204",
      "itemCode": "VT-001",
      "unit": "Cái",
      "quantityDocument": 10,
      "quantityActual": 10,
      "unitPrice": 125500
    }
  ]
}
```

`receiptNumber`, thành tiền và tổng tiền không nhận từ client. Backend tự sinh và tính lại các giá trị này.

## Chuẩn response

Thành công:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

Lỗi:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu chưa hợp lệ",
    "details": [
      {
        "field": "items",
        "message": "Phiếu phải có ít nhất một mặt hàng"
      }
    ]
  },
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

Client có thể gửi `x-request-id`. Nếu không có, hệ thống tự sinh UUID và trả lại trong header lẫn `meta.requestId`.

| HTTP | Error code | Ý nghĩa |
|---|---|---|
| `400` | `INVALID_JSON` | JSON không hợp lệ |
| `400` | `RECEIPT_ID_INVALID` | ID phiếu không hợp lệ |
| `404` | `RECEIPT_NOT_FOUND` | Không tìm thấy phiếu |
| `404` | `ROUTE_NOT_FOUND` | Không tồn tại endpoint |
| `409` | `DATA_CONFLICT` | Dữ liệu bị trùng |
| `422` | `VALIDATION_ERROR` | Request không đạt schema |
| `503` | `DATABASE_UNAVAILABLE` | Không kết nối được database |
| `500` | `INTERNAL_SERVER_ERROR` | Lỗi nội bộ không dự kiến |

Stack trace và thông tin nội bộ chỉ được ghi ở server log, không trả về client.

## Kiểm thử

```bash
npm run typecheck
npm test
npm run build
```

Bộ test kiểm tra tính tiền, validation, tạo và đọc phiếu, tìm sản phẩm, response envelope, global exception, JSON sai cú pháp, bảo vệ lỗi nội bộ và request ID.

## Chạy production

```bash
npm run build
npm start
```

Ứng dụng xử lý `SIGINT`, `SIGTERM`, `uncaughtException` và `unhandledRejection`. Khi dừng, server ngừng nhận request và đóng TypeORM DataSource trước khi process thoát.

## Dừng Docker

```bash
docker compose down
```

Lệnh trên không xóa volume. Chỉ dùng `docker compose down -v` khi muốn xóa toàn bộ database local.

## Xử lý sự cố

- Nếu cổng `3100` bận, đổi `PORT` trong `.env`.
- Nếu cổng `55432` bận, đổi port mapping trong `docker-compose.yml` và `DATABASE_URL`.
- Nếu database chưa sẵn sàng, kiểm tra `docker compose ps` rồi chạy lại migration.
- Khi đổi TypeORM entity, tạo migration mới và không bật `synchronize` trên môi trường có dữ liệu.
