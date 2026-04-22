import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { MatDialogModule as MatDialogModule, MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog'
import { Feed } from '@ngageoint/mage.web-core-lib/feed'
import { AdminFeedDeleteComponent } from './admin-feed-delete.component'
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('AdminFeedDeleteComponent', () => {
  let component: AdminFeedDeleteComponent
  let fixture: ComponentFixture<AdminFeedDeleteComponent>

  const feedData: Feed = {
    id: 'feed1',
    title: 'Test Feed'
  } as unknown as Feed

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [AdminFeedDeleteComponent],
    imports: [MatDialogModule],
    providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: feedData },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
    ]
})
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminFeedDeleteComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
