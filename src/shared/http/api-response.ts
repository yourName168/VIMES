import type { Response } from "express";

export interface ApiMeta {
  requestId: string;
  [key: string]: unknown;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
}

export function sendSuccess<T>(
  response: Response,
  data: T,
  statusCode = 200,
  meta: Record<string, unknown> = {},
): void {
  const body: SuccessResponse<T> = {
    success: true,
    data,
    meta: {
      ...meta,
      requestId: getRequestId(response),
    },
  };
  response.status(statusCode).json(body);
}

export function sendError(
  response: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const body: ErrorResponse = {
    success: false,
    error: { code, message },
    meta: { requestId: getRequestId(response) },
  };
  if (details !== undefined) body.error.details = details;
  response.status(statusCode).json(body);
}

function getRequestId(response: Response): string {
  return String(response.locals.requestId ?? "unknown");
}
