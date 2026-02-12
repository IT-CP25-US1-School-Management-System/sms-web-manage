export interface AsyncMultiSelectOption {
  id: string;
  value: string;
  label: string;
  description?: string;
}

export interface AsyncMultiSelectPageResult {
  items: AsyncMultiSelectOption[];
  page: number;
  total_pages: number;
  total_rows: number;
}

export interface AsyncMultiSelectLoadParams {
  page: number;
  per_page: number;
  search_word?: string;
}

export type AsyncMultiSelectLoader = (
  params: AsyncMultiSelectLoadParams
) => Promise<AsyncMultiSelectPageResult>;
