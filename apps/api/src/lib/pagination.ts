import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export function paginate(query: PaginationQuery) {
  const { page, limit } = query;
  return {
    limit,
    offset: (page - 1) * limit,
  };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  query: PaginationQuery
) {
  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
