import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ButtonPreviewComponent } from '../button-preview/button-preview.component';
import { IconUploadComponent } from './icon-upload.component';

describe('IconUploadComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonPreviewComponent],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
  });

  it('should show the uploaded icon in the surrounding button preview without zone.js', async () => {
    const fixture = TestBed.createComponent(ButtonPreviewComponent);
    fixture.componentRef.setInput('strategy', { title: 'Example', textColor: '#FFFFFF', buttonColor: '#1E88E5', icon: null });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.auth-button-preview img')).toBeNull();

    const iconUpload = fixture.debugElement.query(By.directive(IconUploadComponent)).componentInstance as IconUploadComponent;
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'icon.png', { type: 'image/png' });
    iconUpload.onImageChange({ target: { files: [file] } });

    await new Promise((resolve) => setTimeout(resolve, 50));
    await fixture.whenStable();

    const previewIcon: HTMLImageElement | null = fixture.nativeElement.querySelector('.auth-button-preview img');
    expect(previewIcon?.src).toMatch(/^data:image\/png;base64,/);
  });
});
