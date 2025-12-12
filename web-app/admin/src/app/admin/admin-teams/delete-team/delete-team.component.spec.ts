import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { DeleteTeamComponent } from './delete-team.component';
import { TeamsService } from '../teams-service';
import { UserService } from 'admin/src/app/upgrade/ajs-upgraded-providers';
import { Team } from '../team';

describe('DeleteTeamComponent', () => {
  let component: DeleteTeamComponent;
  let fixture: ComponentFixture<DeleteTeamComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DeleteTeamComponent>>;
  let mockTeamsService: jasmine.SpyObj<TeamsService>;
  let mockUserService: jasmine.SpyObj<any>;

  const mockTeam: Team = {
    id: 'team123' as any,
    name: 'Test Team',
    description: 'Test Description',
    teamEventId: null,
    users: [
      { id: 'user1', displayName: 'User One' },
      { id: 'user2', displayName: 'User Two' }
    ] as any,
    acl: {} as any
  };

  beforeEach(async () => {
    // Create spies for dependencies
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockTeamsService = jasmine.createSpyObj('TeamsService', ['deleteTeam']);
    mockUserService = jasmine.createSpyObj('UserService', ['deleteUser']);

    await TestBed.configureTestingModule({
      declarations: [DeleteTeamComponent],
      imports: [FormsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { team: mockTeam } },
        { provide: TeamsService, useValue: mockTeamsService },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct team data', () => {
    expect(component.team).toEqual(mockTeam);
    expect(component.deleteAllUsers).toBe(false);
    expect(component.deleting).toBe(false);
    expect(component.confirm).toEqual({});
  });

  it('should display team name in the template', () => {
    const teamNameElement = fixture.debugElement.query(By.css('.warning-message strong'));
    expect(teamNameElement.nativeElement.textContent).toBe(`"${mockTeam.name}"`);
  });

  it('should show danger zone when deleteAllUsers is true', () => {
    component.deleteAllUsers = true;
    fixture.detectChanges();

    const dangerZone = fixture.debugElement.query(By.css('.danger-zone'));
    expect(dangerZone).toBeTruthy();
  });

  it('should hide danger zone when deleteAllUsers is false', () => {
    component.deleteAllUsers = false;
    fixture.detectChanges();

    const dangerZone = fixture.debugElement.query(By.css('.danger-zone'));
    expect(dangerZone).toBeFalsy();
  });

  it('should enable delete button when not deleting all users', () => {
    component.deleteAllUsers = false;
    fixture.detectChanges();

    const deleteButton = fixture.debugElement.query(By.css('button.btn-danger'));
    expect(deleteButton.nativeElement.disabled).toBe(false);
  });

  it('should disable delete button when deleting all users and team name not confirmed', () => {
    component.deleteAllUsers = true;
    component.confirm.text = 'wrong name';
    fixture.detectChanges();

    const deleteButton = fixture.debugElement.query(By.css('button.btn-danger[disabled]'));
    expect(deleteButton.nativeElement.disabled).toBe(true);
  });

  it('should enable delete button when deleting all users and team name is confirmed', () => {
    component.deleteAllUsers = true;
    component.confirm.text = mockTeam.name;
    fixture.detectChanges();

    const deleteButton = fixture.debugElement.query(By.css('button.btn-danger'));
    expect(deleteButton.nativeElement.disabled).toBe(false);
  });

  it('should disable delete button when deleting is in progress', () => {
    component.deleting = true;
    component.deleteAllUsers = true;
    component.confirm.text = mockTeam.name;
    fixture.detectChanges();

    const deleteButton = fixture.debugElement.query(By.css('button.btn-danger'));
    expect(deleteButton.nativeElement.disabled).toBe(true);
  });

  describe('cancel', () => {
    it('should close dialog without result', () => {
      component.cancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });
  });

  describe('deleteTeam', () => {
    beforeEach(() => {
      mockTeamsService.deleteTeam.and.returnValue(of({}));
    });

    it('should set deleting to true when starting deletion', () => {
      component.deleteTeam();
      expect(component.deleting).toBe(true);
    });

    it('should call teamsService.deleteTeam with correct team id', () => {
      component.deleteTeam();
      expect(mockTeamsService.deleteTeam).toHaveBeenCalledWith(mockTeam.id.toString());
    });

    it('should close dialog with team when deleteAllUsers is false', () => {
      component.deleteAllUsers = false;
      component.deleteTeam();

      expect(mockDialogRef.close).toHaveBeenCalledWith(mockTeam);
    });

    it('should close dialog with team when deleteAllUsers is true but team name not confirmed', () => {
      component.deleteAllUsers = true;
      component.confirm.text = 'wrong name';
      component.deleteTeam();

      expect(mockDialogRef.close).toHaveBeenCalledWith(mockTeam);
    });

    it('should call deleteUsers when deleteAllUsers is true and team name is confirmed', () => {
      component.deleteAllUsers = true;
      component.confirm.text = mockTeam.name;
      spyOn(component as any, 'deleteUsers');

      component.deleteTeam();

      expect((component as any).deleteUsers).toHaveBeenCalled();
    });

    it('should handle error and reset deleting state', () => {
      const error = new Error('Delete failed');
      mockTeamsService.deleteTeam.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      component.deleteTeam();

      expect(component.deleting).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error deleting team:', error);
    });
  });

  describe('deleteUsers', () => {
    beforeEach(() => {
      mockUserService.deleteUser.and.returnValue(of({}));
    });

    it('should close dialog immediately when no users exist', () => {
      const teamWithoutUsers = { ...mockTeam, users: [] };
      component.team = teamWithoutUsers;

      (component as any).deleteUsers();

      expect(mockDialogRef.close).toHaveBeenCalledWith(teamWithoutUsers);
    });

    it('should close dialog immediately when users is undefined', () => {
      const teamWithoutUsers = { ...mockTeam, users: undefined };
      component.team = teamWithoutUsers;

      (component as any).deleteUsers();

      expect(mockDialogRef.close).toHaveBeenCalledWith(teamWithoutUsers);
    });

    it('should call deleteUser for each user in the team', () => {
      (component as any).deleteUsers();

      expect(mockUserService.deleteUser).toHaveBeenCalledTimes(2);
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(mockTeam.users![0]);
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(mockTeam.users![1]);
    });

    it('should close dialog with team after all users are deleted successfully', () => {
      (component as any).deleteUsers();

      expect(mockDialogRef.close).toHaveBeenCalledWith(mockTeam);
    });

    it('should handle error and still close dialog', () => {
      const error = new Error('User delete failed');
      mockUserService.deleteUser.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      (component as any).deleteUsers();

      expect(console.error).toHaveBeenCalledWith('Error deleting users:', error);
      expect(mockDialogRef.close).toHaveBeenCalledWith(mockTeam);
    });

    it('should handle mixed success and failure of user deletions', () => {
      // First user deletion succeeds, second fails
      mockUserService.deleteUser.and.returnValues(
        of({}),
        throwError(() => new Error('Failed'))
      );
      spyOn(console, 'error');

      (component as any).deleteUsers();

      expect(console.error).toHaveBeenCalledWith('Error deleting users:', jasmine.any(Error));
      expect(mockDialogRef.close).toHaveBeenCalledWith(mockTeam);
    });
  });

  describe('ngOnInit', () => {
    it('should be defined and not throw error', () => {
      expect(() => component.ngOnInit()).not.toThrow();
    });
  });

  describe('Template Integration', () => {
    it('should call cancel when cancel button is clicked', () => {
      spyOn(component, 'cancel');
      const cancelButton = fixture.debugElement.query(By.css('button:not(.btn-danger)'));

      cancelButton.nativeElement.click();

      expect(component.cancel).toHaveBeenCalled();
    });

    it('should call deleteTeam when delete button is clicked', () => {
      spyOn(component, 'deleteTeam');
      const deleteButton = fixture.debugElement.query(By.css('button.btn-danger'));

      deleteButton.nativeElement.click();

      expect(component.deleteTeam).toHaveBeenCalled();
    });

    it('should update deleteAllUsers when checkbox is changed', () => {
      const checkbox = fixture.debugElement.query(By.css('input[type="checkbox"]'));

      checkbox.nativeElement.checked = true;
      checkbox.nativeElement.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(component.deleteAllUsers).toBe(true);
    });

    it('should update confirm.text when input is changed', () => {
      component.deleteAllUsers = true;
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input[type="text"]'));
      input.nativeElement.value = 'test input';
      input.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.confirm.text).toBe('test input');
    });

    it('should show spinner icon when deleting', () => {
      component.deleting = true;
      component.deleteAllUsers = true;
      component.confirm.text = mockTeam.name;
      fixture.detectChanges();

      const spinnerIcon = fixture.debugElement.query(By.css('.fa-spinner.fa-spin'));
      expect(spinnerIcon).toBeTruthy();
    });

    it('should show trash icon when not deleting', () => {
      component.deleting = false;
      component.deleteAllUsers = true;
      component.confirm.text = mockTeam.name;
      fixture.detectChanges();

      const trashIcon = fixture.debugElement.query(By.css('.fa-trash'));
      expect(trashIcon).toBeTruthy();
    });

    it('should show correct placeholder text in confirmation input', () => {
      component.deleteAllUsers = true;
      fixture.detectChanges();

      const input = fixture.debugElement.query(By.css('input[type="text"]'));
      expect(input.nativeElement.placeholder).toBe(mockTeam.name);
    });
  });

  describe('Edge Cases', () => {
    it('should handle team with empty name', () => {
      const teamWithEmptyName = { ...mockTeam, name: '' };
      component.team = teamWithEmptyName;
      component.deleteAllUsers = true;
      component.confirm.text = '';

      expect(component.confirm.text === component.team.name).toBe(true);
    });

    it('should handle team with special characters in name', () => {
      const teamWithSpecialName = { ...mockTeam, name: 'Test-Team_123!@#' };
      component.team = teamWithSpecialName;
      component.deleteAllUsers = true;
      component.confirm.text = 'Test-Team_123!@#';
      fixture.detectChanges();

      const deleteButton = fixture.debugElement.query(By.css('button.btn-danger'));
      expect(deleteButton.nativeElement.disabled).toBe(false);
    });
  });
});
