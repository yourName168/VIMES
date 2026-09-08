import { AppException } from "../../shared/errors/app-exception.js";

export class DuplicateReceiptNumberError extends AppException {
  constructor() {
    super("Số phiếu đã tồn tại", "RECEIPT_NUMBER_DUPLICATE", 409);
  }
}

export class ReceiptNotFoundError extends AppException {
  constructor() {
    super("Không tìm thấy phiếu nhập kho", "RECEIPT_NOT_FOUND", 404);
  }
}

export class InvalidReceiptIdError extends AppException {
  constructor() {
    super("Mã phiếu không hợp lệ", "RECEIPT_ID_INVALID", 400);
  }
}
