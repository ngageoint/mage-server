import { JsonSchemaFormModule } from '@ajsf/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { JsonSchemaFormWithServiceComponent } from './json-schema.component';



describe('JsonSchemaFormWithServiceComponent', () => {
  let component: JsonSchemaFormWithServiceComponent;
  let fixture: ComponentFixture<JsonSchemaFormWithServiceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        JsonSchemaFormModule
      ],
      declarations: [ JsonSchemaFormWithServiceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(JsonSchemaFormWithServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
