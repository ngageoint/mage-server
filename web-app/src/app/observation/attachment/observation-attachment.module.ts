import { NgModule } from '@angular/core';
import { FilenamePipe } from '../../filename/filename.pipe';
import { AttachmentComponent } from './attachment.component';
import { AttachmentCarouselComponent } from './attachment-carousel.component';
import { AttachUploadComponent } from './attachment-upload/attachment-upload.component';

@NgModule({
  imports: [
    AttachmentComponent,
    AttachmentCarouselComponent,
    AttachUploadComponent,
    FilenamePipe,
  ],
  exports: [AttachmentComponent, AttachmentCarouselComponent, AttachUploadComponent, FilenamePipe]
})
export class ObservationAttachmentModule {}
