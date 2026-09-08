import type { Server } from "node:http";
import type { DataSource } from "typeorm";

interface ProcessHandlerDependencies {
  server: Server;
  dataSource: DataSource;
}

export function registerProcessErrorHandlers({
  server,
  dataSource,
}: ProcessHandlerDependencies): void {
  let shuttingDown = false;

  const shutdown = (reason: string, exitCode: number, error?: unknown): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.exitCode = exitCode;

    if (error !== undefined) {
      console.error({ level: "fatal", reason, error: serializeError(error) });
    } else {
      console.info({ level: "info", reason });
    }

    const forceExitTimer = setTimeout(() => {
      console.error({ level: "fatal", reason: "FORCED_SHUTDOWN_TIMEOUT" });
      process.exit(exitCode);
    }, 10_000);
    forceExitTimer.unref();

    server.close(async () => {
      try {
        if (dataSource.isInitialized) await dataSource.destroy();
      } catch (dataSourceError) {
        console.error({
          level: "error",
          reason: "DATA_SOURCE_CLOSE_FAILED",
          error: serializeError(dataSourceError),
        });
      } finally {
        clearTimeout(forceExitTimer);
        process.exit(exitCode);
      }
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT", 0));
  process.once("SIGTERM", () => shutdown("SIGTERM", 0));
  process.once("uncaughtException", (error) => shutdown("UNCAUGHT_EXCEPTION", 1, error));
  process.once("unhandledRejection", (reason) => shutdown("UNHANDLED_REJECTION", 1, reason));
}

function serializeError(error: unknown): unknown {
  return error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error;
}
