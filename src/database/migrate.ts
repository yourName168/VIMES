import { appDataSource } from "./data-source.js";

try {
  await appDataSource.initialize();
  const migrations = await appDataSource.runMigrations({ transaction: "each" });
  console.log(
    migrations.length > 0
      ? `Đã chạy ${migrations.length} TypeORM migration`
      : "Database đã ở phiên bản mới nhất",
  );
} finally {
  if (appDataSource.isInitialized) await appDataSource.destroy();
}
