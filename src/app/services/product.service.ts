import type { ProductRepositoryPort } from "../repositories/product.repository.js";
import type { ProductView } from "../entities/product.entity.js";

export class ProductService {
  constructor(private readonly repository: ProductRepositoryPort) {}

  search(query: string, limit = 10): Promise<ProductView[]> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 1) return Promise.resolve([]);
    const safeLimit = Math.min(Math.max(limit, 1), 20);
    return this.repository.search(normalizedQuery, safeLimit);
  }
}
