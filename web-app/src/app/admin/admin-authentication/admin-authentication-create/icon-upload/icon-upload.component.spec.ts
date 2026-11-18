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

  it('should show the uploaded icon on the previewed sign in button without zone.js', async () => {
    const fixture = TestBed.createComponent(ButtonPreviewComponent);
    fixture.componentRef.setInput('strategy', { title: 'Example', textColor: '#FFFFFF', buttonColor: '#1E88E5', icon: null });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('authentication-button img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.icon-thumbnail__empty')).not.toBeNull();

    const iconUpload = fixture.debugElement.query(By.directive(IconUploadComponent)).componentInstance as IconUploadComponent;
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'icon.png', { type: 'image/png' });
    iconUpload.onImageChange({ target: { files: [file] } });

    await new Promise((resolve) => setTimeout(resolve, 50));
    await fixture.whenStable();

    const previewIcon: HTMLImageElement | null = fixture.nativeElement.querySelector('authentication-button img');
    expect(previewIcon?.src).toMatch(/^data:image\/png;base64,/);
    expect(fixture.nativeElement.querySelector('.icon-thumbnail img')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.icon-thumbnail__empty')).toBeNull();
  });

  it('should clear the file input so the same file can be picked again', () => {
    const fixture = TestBed.createComponent(IconUploadComponent);
    fixture.componentRef.setInput('strategy', { title: 'Example', icon: null });
    const target: any = { files: [new File([new Uint8Array([137, 80, 78, 71])], 'icon.png', { type: 'image/png' })], value: 'C:\\fakepath\\icon.png' };

    fixture.componentInstance.onImageChange({ target });

    expect(target.value).toBe('');
  });

  it('should remove the icon from the button', async () => {
    const fixture = TestBed.createComponent(ButtonPreviewComponent);
    const strategy: any = { title: 'Example', textColor: '#FFFFFF', buttonColor: '#1E88E5', icon: 'data:image/png;base64,iVBORw0KGgo=' };
    fixture.componentRef.setInput('strategy', strategy);
    let changed = 0;
    fixture.componentInstance.changed.subscribe(() => changed++);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('authentication-button img')).not.toBeNull();

    const remove: HTMLButtonElement = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('.icon-actions button'))
      .find(button => button.textContent.trim() === 'Remove');
    remove.click();
    await fixture.whenStable();

    expect(strategy.icon).toBeNull();
    expect(changed).toBe(1);
    expect(fixture.nativeElement.querySelector('authentication-button img')).toBeNull();
  });
});
