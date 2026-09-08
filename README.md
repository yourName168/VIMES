# VIMES Warehouse Receipts

Ứng dụng nhập và quản lý phiếu nhập kho theo mẫu 01-VT trong đề bài.

## Công nghệ

- Node.js 20+, Express 5, TypeScript
- PostgreSQL, TypeORM và driver pg
- Zod cho validation
- Vitest và Supertest cho unit/API tests
- HTML, CSS, JavaScript thuần cho giao diện nhẹ và dễ chạy

## Chạy dự án

1. Sao chép .env.example thành .env.
2. Chạy docker compose up -d.
3. Chạy npm install.
4. Chạy npm run db:migrate.
5. Chạy npm run dev.
6. Mở http://localhost:3000.

## Dữ liệu mẫu

Chạy `npm run db:seed` để tạo 8 sản phẩm và 3 phiếu nhập kho mẫu. Seed có thể chạy lại an toàn; dữ liệu mẫu đã tồn tại sẽ không bị tạo trùng.

## Kiểm tra

Chạy npm run typecheck, npm test và npm run build.

## Thiết kế dữ liệu

- suppliers: đơn vị giao hàng.
- products: danh mục hàng hóa, đơn vị và giá nhập gợi ý gần nhất.
- warehouse_receipts: thông tin đầu phiếu, tài khoản kế toán và tổng tiền.
- warehouse_receipt_items: các dòng hàng, liên kết tùy chọn tới products; amount được PostgreSQL sinh từ số lượng thực nhập và đơn giá.

API tự tính lại thành tiền và tổng tiền. Giá trị tính từ trình duyệt không được lưu trực tiếp. Việc tạo nhà cung cấp, phiếu và các dòng hàng nằm trong cùng một transaction.

Số phiếu do backend tự sinh theo mẫu PNK-YYYYMMDD-001. Bảng receipt_daily_sequences khóa và tăng số thứ tự theo ngày ngay trong transaction, tránh trùng số khi nhiều người lưu đồng thời.

## API

- POST /api/receipts: tạo phiếu nhập kho.
- GET /api/receipts?limit=20: danh sách phiếu gần đây.
- GET /api/receipts/:id: chi tiết một phiếu.
- GET /api/products?q=keyword&limit=10: tìm hàng hóa theo mã hoặc tên.
- GET /health: health check.

## Chuẩn response và global exception

Response thành công:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

Mọi lỗi HTTP đi qua error middleware và có cùng định dạng:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu chưa hợp lệ",
    "details": []
  },
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

Request ID được nhận từ header x-request-id hoặc tự sinh. Các lỗi không dự kiến chỉ được ghi vào server log; stack trace và nội dung nội bộ không được trả về client. Process handler thực hiện graceful shutdown khi có uncaughtException hoặc unhandledRejection.

Schema được quản lý bằng TypeORM migrations trong src/database/migrations.

## Kiến trúc source code

```text
src/
├── app/
│   ├── entities/             # TypeORM entities
│   ├── controllers/          # HTTP controllers
│   ├── services/             # Nghiệp vụ ứng dụng
│   ├── repositories/         # TypeORM queries và transaction
│   ├── schemas/              # Zod request validation
│   ├── routes/               # Express routes
│   ├── errors/               # Lỗi nghiệp vụ
│   └── utils/                # Tính tiền và định dạng số phiếu
├── database/
│   ├── migrations/           # TypeORM migrations có version
│   ├── data-source.ts        # Kết nối, entities và pool config
│   └── migrate.ts            # Migration runner
├── shared/
│   ├── errors/               # Base application exception
│   └── http/                 # Response và middleware dùng chung
├── main/                     # Dependency injection và khởi động server
└── app.ts                    # Cấu hình Express, middleware và routes
```

Luồng xử lý một request:

```text
Route -> Controller -> Service -> TypeORM Repository -> PostgreSQL
```

Quy tắc dependency:

- App được chia theo các layer entity, controller, service và repository.
- Service chứa quy tắc và điều phối nghiệp vụ.
- TypeORM repository xử lý truy vấn, lưu dữ liệu và transaction.
- TypeORM DataSource quyết định entities, migrations và connection pool.
- Shared HTTP chịu trách nhiệm response và global exception.
- app.ts đăng ký middleware và route của các module.
- Main là composition root, nơi khởi tạo và nối các dependency.
