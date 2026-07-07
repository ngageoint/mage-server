import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { DeleteTeamComponent } from './delete-team.component';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { Team } from '../team';
import { UserService } from '../../../user/user.service';

describe('DeleteTeamComponent', () => {
  let component: DeleteTeamComponent;
  let fixture: ComponentFixture<DeleteTeamComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DeleteTeamComponent>>;
  let mockTeamsService: jasmine.SpyObj<AdminTeamsService>;
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
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockTeamsService = jasmine.createSpyObj('TeamsService', ['deleteTeam']);
    mockUserService = jasmine.createSpyObj('UserService', ['deleteUser']);

    await TestBed.configureTestingModule({
      declarations: [DeleteTeamComponent],
      imports: [
        FormsModule,
        MatIconModule,
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatInputModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { team: mockTeam } },
        { provide: AdminTeamsService, useValue: mockTeamsService },
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
    expect(component.error).toBeNull();
  });

  it('should display team name in the title', () => {
    const title = fixture.debugElement.query(By.css('[mat-dialog-title]'));
    expect(title.nativeElement.textContent).toContain(mockTeam.name);
  });

  it('should show danger zone when deleteAllUsers is true', () => {
    component.deleteAllUsers = true;
    fixture.detectChanges();

    const dangerZone = fixture.debugElement.query(By.css('[data-testid="danger-zone"]'));
    expect(dangerZone).toBeTruthy();
  });

  it('should hide danger zone when deleteAllUsers is false', () => {
    component.deleteAllUsers = false;
    fixture.detectChanges();

    const dangerZone = fixture.debugElement.query(By.css('[data-testid="danger-zone"]'));
    expect(dangerZone).toBeFalsy();
  });

  it('should enable delete button when not deleting all users', () => {
    component.deleteAllUsers = false;
    fixture.detectChanges();

    const deleteButton = fixture.debugElement.query(By.css('[data-testid="delete-button"]'));
    expect(deleteButton.nativeElement.disabled).toBe(false);
  });

  it('should enable delete button when deleting all users (no typed confirmation required)', () => {
    component.deleteAllUsers = true;
    fixture.detectChanges();

    const deleteButton = fixture.debugElement.query(By.css('[data-testid="delete-button"]'));
    expect(deleteButton.nativeElement.disabled).toBe(false);
  });

  it('should disable delete button when deleting is in progress', () => {
    component.deleting = true;
    component.deleteAllUsers = true;
    fixture.detectChanges();

    const deleteButton = fixture.debugElement.query(By.css('[data-testid="delete-button"]'));
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

    it('should call deleteUsers when deleteAllUsers is true', () => {
      component.deleteAllUsers = true;
      spyOn(component as any, 'deleteUsers');

      component.deleteTeam();

      expect((component as any).deleteUsers).toHaveBeenCalled();
    });

    it('should handle error, reset deleting state, and set error message', () => {
      const error = new Error('Delete failed');
      mockTeamsService.deleteTeam.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      component.deleteTeam();

      expect(component.deleting).toBe(false);
      expect(component.error).toBe('Delete failed');
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
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(mockTeam.users![0].id);
      expect(mockUserService.deleteUser).toHaveBeenCalledWith(mockTeam.users![1].id);
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
      const cancelButton = fixture.debugElement.query(By.css('[data-testid="cancel-button"]'));

      cancelButton.nativeElement.click();

      expect(component.cancel).toHaveBeenCalled();
    });

    it('should call deleteTeam when delete button is clicked', () => {
      spyOn(component, 'deleteTeam');
      const deleteButton = fixture.debugElement.query(By.css('[data-testid="delete-button"]'));

      deleteButton.nativeElement.click();

      expect(component.deleteTeam).toHaveBeenCalled();
    });

    it('should update deleteAllUsers when checkbox is changed', () => {
      const checkbox = fixture.debugElement.query(By.css('[data-testid="delete-users-checkbox"] input[type="checkbox"]'));

      checkbox.nativeElement.click();
      fixture.detectChanges();

      expect(component.deleteAllUsers).toBe(true);
    });

    it('should show progress icon when deleting', () => {
      component.deleting = true;
      component.deleteAllUsers = true;
      fixture.detectChanges();

      const deleteButton = fixture.debugElement.query(By.css('[data-testid="delete-button"]'));
      expect(deleteButton.nativeElement.textContent).toContain('progress_activity');
    });

    it('should show delete icon when not deleting', () => {
      component.deleting = false;
      component.deleteAllUsers = true;
      fixture.detectChanges();

      const deleteButton = fixture.debugElement.query(By.css('[data-testid="delete-button"]'));
      expect(deleteButton.nativeElement.textContent).toContain('delete');
    });

    it('should warn that all users will be deleted in the danger zone', () => {
      component.deleteAllUsers = true;
      fixture.detectChanges();

      const dangerZone = fixture.debugElement.query(By.css('[data-testid="danger-zone"]'));
      expect(dangerZone.nativeElement.textContent).toContain('all users');
    });
  });

  describe('Edge Cases', () => {
    it('should handle team with special characters in name', () => {
      const teamWithSpecialName = { ...mockTeam, name: 'Test-Team_123!@#' };
      component.team = teamWithSpecialName;
      fixture.detectChanges();

      const title = fixture.debugElement.query(By.css('[mat-dialog-title]'));
      expect(title.nativeElement.textContent).toContain('Test-Team_123!@#');
    });
  });
});
