export type ErrorDetails = Record<string, unknown> | Array<Record<string, unknown>>;

export class AppException extends Error {
  readonly isOperational = true;

  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number,
    readonly details?: ErrorDetails,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}
