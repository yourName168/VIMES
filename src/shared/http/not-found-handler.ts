import type { RequestHandler } from "express";
import { AppException } from "../errors/app-exception.js";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(
    new AppException(
      `Không tìm thấy ${request.method} ${request.path}`,
      "ROUTE_NOT_FOUND",
      404,
    ),
  );
};
