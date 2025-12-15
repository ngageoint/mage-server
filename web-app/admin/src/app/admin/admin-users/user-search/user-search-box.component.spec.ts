import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { UserSearchBoxComponent } from './user-search-box.component';
import { UserPagingService } from 'admin/src/app/upgrade/ajs-upgraded-providers';

describe('UserSearchBoxComponent', () => {
  let component: UserSearchBoxComponent;
  let fixture: ComponentFixture<UserSearchBoxComponent>;

  const mockUsers = [
    { id: '1', displayName: 'Alice Adams' } as any,
    { id: '2', displayName: 'Bob Brown' } as any
  ];

  const mockUserPaging = {
    constructDefault: jasmine.createSpy('constructDefault').and.returnValue({
      all: {}
    }),
    refresh: jasmine.createSpy('refresh').and.returnValue(Promise.resolve()),
    search: jasmine.createSpy('search').and.returnValue(Promise.resolve(mockUsers))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [UserSearchBoxComponent],
      providers: [
        { provide: UserPagingService, useValue: mockUserPaging }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserSearchBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(mockUserPaging.constructDefault).toHaveBeenCalled();
    expect(mockUserPaging.refresh).toHaveBeenCalled();
  });

  it('should call search and update results when user types', fakeAsync(() => {
    component.onUserInput('al');
    tick();

    expect(mockUserPaging.search).toHaveBeenCalled();
    expect(component.searchResults.length).toBe(2);
    expect(component.searchResults[0].displayName).toBe('Alice Adams');
  }));

  it('should clear results when input is empty', fakeAsync(() => {
    component.onUserInput('');
    tick();

    expect(component.searchResults.length).toBe(0);
  }));

  it('should emit selected user and update text', () => {
    const emitSpy = spyOn(component.userSelected, 'emit');
    component.searchResults = mockUsers;

    component.selectUser(mockUsers[1]);

    expect(emitSpy).toHaveBeenCalledWith(mockUsers[1]);
    expect(component.userText).toBe('Bob Brown');
    expect(component.searchResults.length).toBe(0);
  });

  it('should emit null when cleared', () => {
    const emitSpy = spyOn(component.userSelected, 'emit');

    component.userText = 'something';
    component.clear();

    expect(emitSpy).toHaveBeenCalledWith(null);
    expect(component.userText).toBe('');
    expect(component.searchResults.length).toBe(0);
  });

  it('should render suggestion items', fakeAsync(() => {
    component.onUserInput('a');
    tick();
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.suggestion-item');

    expect(items.length).toBe(2);
    expect(items[0].textContent.trim()).toBe('Alice Adams');
  }));
});
