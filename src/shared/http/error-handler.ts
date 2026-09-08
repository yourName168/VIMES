import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppException } from "../errors/app-exception.js";
import { sendError } from "./api-response.js";

export const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const requestId = String(response.locals.requestId ?? "unknown");
  if (error instanceof ZodError) {
    sendError(response, 422, "VALIDATION_ERROR", "Dữ liệu chưa hợp lệ",
      error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
    return;
  }

  if (isMalformedJsonError(error)) {
    sendError(response, 400, "INVALID_JSON", "Nội dung JSON không hợp lệ");
    return;
  }

  if (error instanceof AppException) {
    sendError(response, error.statusCode, error.code, error.message, error.details);
    return;
  }

  const databaseError = mapDatabaseError(error);
  if (databaseError) {
    logError(error, request, requestId);
    sendError(response, databaseError.status, databaseError.code, databaseError.message);
    return;
  }

  logError(error, request, requestId);
  sendError(response, 500, "INTERNAL_SERVER_ERROR", "Có lỗi xảy ra khi xử lý dữ liệu");
};

function isMalformedJsonError(error: unknown): boolean {
  return error instanceof SyntaxError && typeof error === "object" && error !== null &&
    "status" in error && error.status === 400 && "body" in error;
}

function mapDatabaseError(error: unknown): { status: number; code: string; message: string } | null {
  if (!hasErrorCode(error)) return null;
  if (error.code === "23505") {
    return { status: 409, code: "DATA_CONFLICT", message: "Dữ liệu đã tồn tại" };
  }
  if (error.code === "23503") {
    return { status: 409, code: "REFERENCE_CONFLICT", message: "Dữ liệu đang được tham chiếu" };
  }
  if (error.code === "ECONNREFUSED" || error.code === "57P01") {
    return { status: 503, code: "DATABASE_UNAVAILABLE", message: "Cơ sở dữ liệu tạm thời không khả dụng" };
  }
  return null;
}

function hasErrorCode(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string";
}

function logError(error: unknown, request: Parameters<ErrorRequestHandler>[1], requestId: string): void {
  console.error({
    level: "error",
    requestId,
    method: request.method,
    path: request.originalUrl,
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
  });
}
