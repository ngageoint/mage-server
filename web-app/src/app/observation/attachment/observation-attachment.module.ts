import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FilenamePipe } from '../../filename/filename.pipe';
import { AttachmentComponent } from './attachment.component';
import { AttachmentCarouselComponent } from './attachment-carousel.component';
import { AttachUploadComponent } from './attachment-upload/attachment-upload.component';

@NgModule({
  declarations: [AttachmentComponent, AttachmentCarouselComponent, AttachUploadComponent, FilenamePipe],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  exports: [AttachmentComponent, AttachmentCarouselComponent, AttachUploadComponent, FilenamePipe]
})
export class ObservationAttachmentModule {}
