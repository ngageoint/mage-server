import { Component, Inject, InjectionToken, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'
import { Subscription } from 'rxjs'

const selector = 'mage-xhr-img'

/**
 * This is a simple interface that includes the [methods](https://www.w3.org/TR/FileAPI/#creating-revoking)
 * from the [URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL) for
 * managing blob URLs.  This allows a service to be injected into
 * `XhrImgComponent` and overridden for testing.
 */
export interface ObjectUrlService {
  createObjectURL: (typeof URL)['createObjectURL']
  revokeObjectURL: (typeof URL)['revokeObjectURL']
}
export const OBJECT_URL_SERVICE = new InjectionToken<ObjectUrlService>(`${selector}.objectUrlService`)

/**
 * This component allows fetching images by `XMLHttpRequest` rather than the
 * browser's native mechanism.  These image requests are subject to HTTP
 * interceptors that can add authorization headers to the request instead of
 * using cache-defeating URL query parameters to set an auth token.  Applying
 * headers to the browser's native `img` requests is impossible, so a query
 * parameter is necessary for authorization, but adding the parameter to the
 * URL effectively bypasses the browser's caching mechanism when the auth token
 * changes for images that
 * should otherwise be subject to caching.
 *
 * The catch to fetching images by XHR is the response must be fetched as a
 * `Blob`.  The user then gets a browser-specific URL for the blob by
 * `URL.createObjectURL(blob)`, which can then be assigned to the `src`
 * attribute of an `img` tag.  These blob URLs must then be "revoked" by
 * `URL.revokeObjectURL(url)` in order to reclaim object URL's associated
 * resources.  See [Mozilla's docs](https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#example_using_object_urls_to_display_images)
 * on the subject.
 *
 * To use the component, simply add the tag to a template and bind the `src`
 * attribute to the source URL of the desired image.
 * ```
 * <mage-xhr-img [src]="someComponent.imageUrlRequiresAuth"></mage-xhr-img>
 * ```
 * The component encapsulates the logic of creating and releasing the object
 * URLs for the image data, preventing memory leaks.
 */
@Component({
  selector: `${selector}`,
  template: `<img [attr.src]="safeBlobUrl" (load)="onImgLoad()"/>`,
  styles: [ `img { height: 100%; width: 100% }` ],
  providers: [
    {
      provide: OBJECT_URL_SERVICE,
      useValue: URL
    }
  ]
})
export class XhrImgComponent implements OnChanges, OnDestroy {

  @Input('src')
  sourceUrl: string | null = null
  safeBlobUrl: SafeUrl | null = null

  private blobUrl: string
  private subscription: Subscription

  constructor(@Inject(OBJECT_URL_SERVICE) private objectUrlService: ObjectUrlService, private webClient: HttpClient, private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.sourceUrl) {
      return
    }
    if (changes.sourceUrl.isFirstChange() && !this.sourceUrl) {
      return
    }
    this.disposeCurrent()
    if (!this.sourceUrl) {
      return
    }
    this.subscription = this.webClient.get(this.sourceUrl, { responseType: 'blob' })
      .subscribe(x => {
        this.objectUrlService.revokeObjectURL(this.blobUrl)
        this.blobUrl = this.objectUrlService.createObjectURL(x)
        this.safeBlobUrl = this.sanitizer.bypassSecurityTrustUrl(this.blobUrl)
      })
  }

  ngOnDestroy(): void {
    this.disposeCurrent()
  }

  onImgLoad(): void {
    this.disposeCurrent()
  }

  private disposeCurrent(): void {
    if (this.blobUrl) {
      this.objectUrlService.revokeObjectURL(this.blobUrl)
    }
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
    this.blobUrl = null
  }
}