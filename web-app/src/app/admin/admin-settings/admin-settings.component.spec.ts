import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSettingsComponent } from './admin-settings.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatSnackBarModule, MatSnackBar, MatSnackBarDismiss } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { LocalStorageService, Settings, Team, Event, AuthenticationConfigurationService, UserService } from 'src/app/upgrade/ajs-upgraded-providers';
import { Subject, Observable } from 'rxjs';
import { StateService, TransitionService } from '@uirouter/core';

class MockSnackbarRef {
    private readonly _afterDismissed = new Subject<MatSnackBarDismiss>()

    afterDismissed(): Observable<MatSnackBarDismiss> {
        return this._afterDismissed
    }

    dismiss(): void {
        this._afterDismissed.next({ dismissedByAction: false })
        this._afterDismissed.complete()
    }

    dismissWithAction(): void {
        this._afterDismissed.next({ dismissedByAction: true })
        this._afterDismissed.complete()
    }
}

class MockSnackbar {
    private snackbarRef = new MockSnackbarRef()

    get _openedSnackBarRef(): any {
        return this.snackbarRef
    }

    open(): any {
        return this.snackbarRef
    }
}

class MockSettings {
    query(): any {
        return { $promise: Promise.resolve({}) };
    }
}

class MockTeam {
    query(): any {
        return { $promise: Promise.resolve([]) };
    }
}

class MockEvent {
    query(): any {
        return { $promise: Promise.resolve([]) };
    }
}

class MockAuthenticationConfigurationService {
    getAllConfigurations(): Promise<any> {
        return Promise.resolve({
            data: []
        });
    }
}

class MockStateService {

}

class MockTransitionService {
    onExit(a: any, b: any, c: any): void {

    }

}

describe('AdminSettingsComponent', () => {
    let component: AdminSettingsComponent;
    let fixture: ComponentFixture<AdminSettingsComponent>;

    beforeEach(async(() => {
        const mockLocalStorageService = { getToken: (): string => '1' };
        const mockDialogRef = { close: (): void => { } };
        const mockUserService =  { myself: { role: { permissions: ['UPDATE_AUTH_CONFIG'] } } };

        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, MatPaginatorModule, MatSortModule, MatSnackBarModule, MatTableModule, MatDialogModule,
                MatProgressSpinnerModule, MatInputModule, MatFormFieldModule, MatIconModule, HttpClientTestingModule,
                NoopAnimationsModule, MatCheckboxModule, MatListModule, MatCardModule, MatExpansionModule, MatRadioModule,
                MatSelectModule, MatOptionModule, MatDatepickerModule, MatNativeDateModule, FormsModule, MatChipsModule],
            providers: [
                { provide: LocalStorageService, useValue: mockLocalStorageService },
                { provide: Settings, useClass: MockSettings },
                { provide: Team, useClass: MockTeam },
                { provide: Event, useClass: MockEvent },
                { provide: AuthenticationConfigurationService, useClass: MockAuthenticationConfigurationService },
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MatSnackBar, useClass: MockSnackbar },
                { provide: UserService, useValue: mockUserService },
                { provide: StateService, useClass: MockStateService },
                { provide: TransitionService, useClass: MockTransitionService }
            ],
            declarations: [AdminSettingsComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(AdminSettingsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
