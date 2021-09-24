
export interface PagingParameters {
  pageSize: number,
  pageIndex: number,
  includeTotalCount?: boolean | null
}

export interface PageOf<T> {
  pageSize: number,
  pageIndex: number,
  totalCount?: number | null,
  next?: PagingParameters | null
  prev?: PagingParameters | null
  items: T[]
}

export const pageForItemIndex = (itemIndex: number, pageSize: number | PagingParameters): number => {
  if (typeof pageSize === 'object') {
    pageSize = pageSize.pageSize
  }
  return Math.floor(itemIndex / pageSize)
}

/**
 * Return the range of item indexes for the given page and page size.  The last
 * end portion of the range is exclusive, so when indexing an array the last
 * item of the page would have position `end - 1`.  This allows one to pass the
 * values to `Array.slice()`.
 * @param pageIndex
 * @param pageSize
 * @returns
 */
export const itemRangeOfPage: {
  (pageIndex: number, pageSize: number): [ number, number ]
  (paging: PagingParameters)
} = (pageIndex: number | PagingParameters, pageSize?: number): [ number, number ] => {
  if (typeof pageIndex === 'object') {
    pageSize = pageIndex.pageSize
    pageIndex = pageIndex.pageIndex
  }
  const start = pageSize * pageIndex
  const end = start + pageSize
  return [ start, end ]
}
