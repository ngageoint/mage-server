import { CollectionViewer, DataSource } from '@angular/cdk/collections'
import { BehaviorSubject, Observable, Subscription } from 'rxjs'
import { pageForItemIndex, PageOf, PagingParameters } from './paging.model'

/**
 * This class is an adaptation from the [Angular Material Guide](https://v8.material.angular.io/cdk/scrolling/overview), _"Specifying data" example_, also
 * available on [StackBlitz](https://stackblitz.com/angular/mrbkjagnnra?file=src%2Fapp%2Fcdk-virtual-scroll-data-source-example.ts).
 */
export class PagingDataSource<T> extends DataSource<T> {

  private data: T[] | null = null
  private data$ = new BehaviorSubject<T[]>([])
  private fetchedPages = new Set<number>()
  private subscription = new Subscription()

  constructor(private pageSize: number, private fetchPage: (paging: PagingParameters) => Observable<PageOf<T>>) {
    super()
  }

  connect(collectionViewer: CollectionViewer): Observable<T[]> {
    this.subscription.add(collectionViewer.viewChange.subscribe(range => {
      const startPage = this.pageForItemIndex(range.start)
      const endPage = this.pageForItemIndex(range.end - 1)
      for (let page = startPage; page <= endPage; page++) {
        this.fetch(page)
      }
    }))
    return this.data$
  }

  disconnect(): void {
    this.subscription.unsubscribe()
  }

  private pageForItemIndex(index: number): number {
    return pageForItemIndex(index, this.pageSize)
  }

  private fetch(pageIndex: number) {
    if (this.fetchedPages.has(pageIndex)) {
      return
    }
    this.fetchedPages.add(pageIndex)
    const includeTotalCount = !this.data
    this.fetchPage({ pageSize: this.pageSize, pageIndex: pageIndex, includeTotalCount }).subscribe(page => {
      if (!this.data) {
        if (typeof(page.totalCount) !== 'number') {
          throw new Error('data is null and no total count is available to inform allocation')
        }
        this.data = Array.from({ length: page.totalCount })
      }
      this.data.splice(pageIndex * this.pageSize, this.pageSize, ...page.items)
      this.data$.next(this.data)
    })
  }
}
