import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportMetadataDialogComponent } from './export-metadata-dialog.component';
import { MatDialogModule, MatPaginatorModule, MatSortModule, MatSnackBarModule, MatTableModule, MatProgressSpinnerModule, MatInputModule, MatFormFieldModule, MatIconModule, MatDialogRef } from '@angular/material';
import { LocalStorageService, EventService } from '../upgrade/ajs-upgraded-providers';
import { ExportMetadataService } from './export-metadata.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Export Metadata Dialog Component', () => {

    let component: ExportMetadataDialogComponent;
    let fixture: ComponentFixture<ExportMetadataDialogComponent>;
    let httpTestingController: HttpTestingController;

    beforeEach(async(() => {
        const fakeLocalStorageService = { getToken: () => '1234567890' };

        TestBed.configureTestingModule({
            imports: [MatPaginatorModule, MatSortModule, MatSnackBarModule, MatTableModule, MatDialogModule,
                MatProgressSpinnerModule, MatInputModule, MatFormFieldModule, MatIconModule, HttpClientTestingModule, NoopAnimationsModule],
            providers: [
                { provide: EventService },
                { provide: LocalStorageService, useValue: fakeLocalStorageService },
                { provide: MatDialogRef, useValue: {} },
                { provide: ExportMetadataService }
            ],
            declarations: [ExportMetadataDialogComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        expect(TestBed.get(LocalStorageService)).toBeDefined();
        fixture = TestBed.createComponent(ExportMetadataDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeDefined();
    });
});