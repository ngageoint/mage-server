import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HelpModule } from './help.module';
import { GuideEditorComponent } from './guide-editor.component';
import { GuideCustomizationService } from './guide-customization.service';
import { eventGuide, guideSource } from './guide-customization';

const event = { id: 7, name: 'Flood', forms: [{ id: 3, name: 'Damage', archived: false,
  fields: [{ id: 9, title: 'Depth', type: 'numberfield', required: true, archived: false }] }] } as any;

describe('GuideEditorComponent', () => {
  let save: jasmine.Spy;
  let upload: jasmine.Spy;
  function create(overrides: any = {}) {
    save = jasmine.createSpy('save').and.callFake((s: any) => of({ ...s, revision: s.revision + 1 }));
    upload = jasmine.createSpy('uploadImage');
    TestBed.configureTestingModule({ imports: [HelpModule], providers: [{ provide: GuideCustomizationService, useValue: { save, uploadImage: upload, get: () => of({ revision: 9, overrides: {} }) } }] });
    const fixture = TestBed.createComponent(GuideEditorComponent);
    fixture.componentInstance.topics = [eventGuide(event)];
    fixture.componentInstance.state = { revision: 1, overrides };
    fixture.componentInstance.scope = '7';
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    return fixture;
  }

  it('lists individual form fields with default-included toggles and event-only warning', () => {
    const el: HTMLElement = create().nativeElement;
    const field = el.querySelector('[data-key="event-forms/form-3-field-9"] input[type=checkbox]') as HTMLInputElement;
    expect(field.checked).toBeTrue();
    expect(el.textContent).toContain('Event readers only');
    expect(el.textContent).toContain('does not change permissions');
  });

  it('excluding a field and editing steps saves only overrides with original source', () => {
    const fixture = create();
    const el: HTMLElement = fixture.nativeElement;
    const box = el.querySelector('[data-key="event-forms/form-3-field-9"] input[type=checkbox]') as HTMLInputElement;
    box.checked = false; box.dispatchEvent(new Event('change'));
    const steps = el.querySelector('[data-key="event-forms/form-3"] .steps-input') as HTMLTextAreaElement;
    steps.value = 'Open the form\n\nMeasure depth'; steps.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (el.querySelector('.save') as HTMLButtonElement).click();
    const sent = save.calls.mostRecent().args;
    expect(sent[1]).toBe('7');
    const section = eventGuide(event).sections[0];
    expect(sent[0].overrides).toEqual({
      'event-forms/form-3-field-9': { hidden: true },
      'event-forms/form-3': { steps: ['Open the form', '', 'Measure depth'], source: guideSource(section) }
    });
  });

  it('typing the generated text back removes the override', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    const row = c.rows[1];
    c.setTitle(row, 'Other');
    c.setTitle(row, row.title);
    expect(c.draft).toEqual({});
  });

  it('preserves spaces and newlines while typing manual instructions', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    const row = c.rows[1];
    c.setTitle(row, 'Example ');
    expect(c.titleOf(row)).toBe('Example ');
    c.setBody(row, 'First line\n');
    expect(c.bodyOf(row)).toBe('First line\n');
    c.setBody(row, 'First line\nSecond line');
    expect(c.bodyOf(row)).toBe('First line\nSecond line');
  });

  it('supports placement, captions, ordering, removal and reset of workflow screenshots', () => {
    const fixture = create();
    const c = fixture.componentInstance;
    const row = c.rows[1];
    c.setBody(row, 'First\nSecond');
    c.setSteps(row, 'Open\nSave');
    c.draft[row.key].images = [
      { assetId: 'a'.repeat(32), dataUrl: 'data:image/png;base64,AAAA', alt: 'Training', caption: '', afterStep: 0 },
      { assetId: 'b'.repeat(32), dataUrl: 'data:image/png;base64,AAAA', alt: 'Next', caption: '', afterStep: 1 }
    ];
    c.placeImage(row, 0, 'paragraph:1');
    c.updateImage(row, 0, { caption: 'After opening' });
    expect(c.positionOf(row, c.imagesOf(row)[0])).toBe('paragraph:1');
    expect(c.positions(row).map(p => p.label)).toContain('After paragraph 2');
    expect(c.positions(row).map(p => p.label)).toContain('After step 2');
    c.moveImage(row, 0, 1);
    expect(c.imagesOf(row)[1].caption).toBe('After opening');
    c.removeImage(row, 0);
    c.save();
    expect(save.calls.mostRecent().args[0].overrides[row.key].images.length).toBe(1);
    c.restoreImages(row);
    expect(c.draft[row.key].images).toBeUndefined();
  });

  it('reads a selected screenshot, uploads it in the event scope, and adds it to the unsaved draft', async () => {
    const fixture = create();
    const c = fixture.componentInstance;
    let uploaded: () => void;
    const completed = new Promise<void>(resolve => uploaded = resolve);
    upload.and.callFake(() => {
      uploaded();
      return of({ assetId: 'a'.repeat(32), dataUrl: 'data:image/png;base64,AQID' });
    });
    const input = fixture.nativeElement.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File([new Uint8Array([1, 2, 3])], 'training.png', { type: 'image/png' })] });
    input.dispatchEvent(new Event('change'));
    await completed;
    fixture.detectChanges();
    expect(upload.calls.mostRecent().args[1]).toBe('7');
    expect(c.imagesOf(c.rows[1])[0].assetId).toBe('a'.repeat(32));
    expect(c.uploading).toBeFalse();
    expect(c.dirty).toBeTrue();
    expect(save).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.screenshot img').src).toContain('data:image/png;base64,AQID');
  });
});
