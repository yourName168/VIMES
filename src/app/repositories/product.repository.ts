import type { DataSource } from "typeorm";
import { ProductEntity, type ProductView } from "../entities/product.entity.js";

export interface ProductRepositoryPort {
  search(query: string, limit: number): Promise<ProductView[]>;
}

export class ProductRepository implements ProductRepositoryPort {
  constructor(private readonly dataSource: DataSource) {}

  async search(query: string, limit: number): Promise<ProductView[]> {
    const contains = "%" + escapeLike(query) + "%";
    const startsWith = escapeLike(query) + "%";
    const products = await this.dataSource
      .getRepository(ProductEntity)
      .createQueryBuilder("product")
      .where("product.isActive = TRUE")
      .andWhere(
        "(product.code ILIKE :contains ESCAPE E'\\\\' OR product.name ILIKE :contains ESCAPE E'\\\\')",
        { contains },
      )
      .orderBy(
        "CASE WHEN LOWER(product.code) = LOWER(:query) THEN 0 " +
          "WHEN product.code ILIKE :startsWith ESCAPE E'\\\\' THEN 1 ELSE 2 END",
        "ASC",
      )
      .addOrderBy("product.code", "ASC")
      .setParameters({ query, startsWith })
      .take(limit)
      .getMany();

    return products.map((product) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      specification: product.specification,
      defaultUnit: product.defaultUnit,
      defaultPrice: product.defaultPrice,
    }));
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
