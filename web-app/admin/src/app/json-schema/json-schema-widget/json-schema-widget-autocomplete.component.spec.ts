import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input'
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { JsonSchemaWidgetAutocompleteComponent } from './json-schema-widget-autocomplete.component';
import { JsonSchemaModule } from '../json-schema.module';


describe('AutocompleteMaterialSelectComponent', () => {
  let component: JsonSchemaWidgetAutocompleteComponent;
  let fixture: ComponentFixture<JsonSchemaWidgetAutocompleteComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        MatFormFieldModule,
        MatIconModule,
        FormsModule,
        MatInputModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        JsonSchemaModule,
        NoopAnimationsModule
      ],
      declarations: [JsonSchemaWidgetAutocompleteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(JsonSchemaWidgetAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
