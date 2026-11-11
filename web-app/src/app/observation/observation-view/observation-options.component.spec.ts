import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';

import { ObservationOption, ObservationOptionsComponent, ObservationOptionsData } from './observation-options.component';

describe('ObservationOptionsComponent', () => {
  let fixture: ComponentFixture<ObservationOptionsComponent>;
  let bottomSheetRef: jasmine.SpyObj<MatBottomSheetRef<ObservationOptionsComponent>>;

  function create(data: ObservationOptionsData): void {
    bottomSheetRef = jasmine.createSpyObj('MatBottomSheetRef', ['dismiss']);

    TestBed.configureTestingModule({
      imports: [ObservationOptionsComponent],
      providers: [
        { provide: MatBottomSheetRef, useValue: bottomSheetRef },
        { provide: MAT_BOTTOM_SHEET_DATA, useValue: data }
      ]
    });

    fixture = TestBed.createComponent(ObservationOptionsComponent);
    fixture.detectChanges();
  }

  function items(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('mat-list-item'))
      .map(item => item.textContent.trim());
  }

  it('lists clone first, then download and delete', () => {
    create({ canClone: true, canDelete: true });

    expect(items()).toEqual([
      'content_copyClone Observation',
      'downloadDownload Observation',
      'deleteDelete Observation'
    ]);
  });

  it('only lists download when clone and delete are not allowed', () => {
    create({ canClone: false, canDelete: false });

    expect(items()).toEqual(['downloadDownload Observation']);
  });

  it('dismisses with the clone option when clone is clicked', () => {
    create({ canClone: true, canDelete: true });

    fixture.nativeElement.querySelector('.options-clone').click();

    expect(bottomSheetRef.dismiss).toHaveBeenCalledOnceWith(ObservationOption.CLONE);
  });

  it('dismisses with the download option when download is clicked', () => {
    create({ canClone: true, canDelete: true });

    fixture.nativeElement.querySelector('.options-download').click();

    expect(bottomSheetRef.dismiss).toHaveBeenCalledOnceWith(ObservationOption.DOWNLOAD);
  });

  it('dismisses with the delete option when delete is clicked', () => {
    create({ canClone: true, canDelete: true });

    fixture.nativeElement.querySelector('.options-delete').click();

    expect(bottomSheetRef.dismiss).toHaveBeenCalledOnceWith(ObservationOption.DELETE);
  });
});
