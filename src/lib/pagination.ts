import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export interface ListQueryParams {
  page: number;
  limit: number;
  search: string;
  sort: string;
  filters: Record<string, string>;
}

export function parseListQuery(searchParams: URLSearchParams): ListQueryParams {
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") || DEFAULT_PAGE_SIZE))
  );
  const search = searchParams.get("search")?.trim() || "";
  const sort = searchParams.get("sort") || "-createdAt";

  const filters: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key.startsWith("filter.")) {
      filters[key.replace("filter.", "")] = value;
    }
  });

  return { page, limit, search, sort, filters };
}

export function buildTextSearch(
  search: string | undefined,
  fields: string[]
): Record<string, unknown> {
  if (!search) return {};
  const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return {
    $or: fields.map((field) => ({ [field]: regex })),
  };
}

export function paginateMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
