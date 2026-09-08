import "dotenv/config";
import { appDataSource } from "../database/data-source.js";
import { WarehouseReceiptRepository } from "../app/repositories/warehouse-receipt.repository.js";
import { ProductRepository } from "../app/repositories/product.repository.js";
import { createApp } from "./create-app.js";
import { registerProcessErrorHandlers } from "./process-error-handlers.js";

const port = Number(process.env.PORT ?? 3000);
await appDataSource.initialize();
const app = createApp(
  new WarehouseReceiptRepository(appDataSource),
  new ProductRepository(appDataSource),
);
const server = app.listen(port, () => {
  console.log("VIMES Warehouse chạy tại http://localhost:" + port);
});
registerProcessErrorHandlers({ server, dataSource: appDataSource });
