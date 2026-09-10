import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { Attachment, AttachmentProcessingStatus } from '../../entities/observation/entities.observation';

@Component({
  selector: 'attachment-carousel',
  templateUrl: './attachment-carousel.component.html',
  styleUrls: ['./attachment-carousel.component.scss'],
  standalone: false
})
export class AttachmentCarouselComponent {
  @Input() attachments: Attachment[] = []

  @ViewChild('scrollContainer') scrollContainer: ElementRef<HTMLDivElement>

  currentIndex = 0

  private scrollDebounce: ReturnType<typeof setTimeout>

  // Passed attachments (in their existing relative order) first, then failed ones (in their
  // existing relative order) - so a real image always leads the carousel on mixed pass/fail
  // observations, mirroring mage-ios's AttachmentSlideshow.populate().
  get orderedAttachments(): Attachment[] {
    const isFailed = (attachment: Attachment) =>
      attachment.processingStatus === AttachmentProcessingStatus.Rejected || attachment.processingStatus === AttachmentProcessingStatus.Error
    return [
      ...this.attachments.filter(a => !isFailed(a)),
      ...this.attachments.filter(a => isFailed(a))
    ]
  }

  onScroll(): void {
    clearTimeout(this.scrollDebounce)
    this.scrollDebounce = setTimeout(() => this.updateCurrentIndex(), 100)
  }

  goToPrevious(event: MouseEvent): void {
    event.stopPropagation()
    this.goToSlide(this.currentIndex - 1)
  }

  goToNext(event: MouseEvent): void {
    event.stopPropagation()
    this.goToSlide(this.currentIndex + 1)
  }

  private goToSlide(index: number): void {
    const el = this.scrollContainer?.nativeElement
    if (!el) return
    const clamped = Math.max(0, Math.min(index, this.attachments.length - 1))
    this.currentIndex = clamped
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
  }

  private updateCurrentIndex(): void {
    const el = this.scrollContainer?.nativeElement
    if (!el?.clientWidth) return
    this.currentIndex = Math.round(el.scrollLeft / el.clientWidth)
  }
}
