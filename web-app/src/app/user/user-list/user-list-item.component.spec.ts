import { UserListItemComponent } from './user-list-item.component';
import { MapService } from '../../map/map.service';
import { SessionService } from '../../http/session.service';
import { SidebarService } from '../../sidebar/sidebar.service';
import { UserWithLocation } from '../../entities/user/entities.user-location';

describe('UserListItemComponent', () => {
  let component: UserListItemComponent;
  let sidebarService: jasmine.SpyObj<SidebarService>;
  let mapService: jasmine.SpyObj<MapService>;

  const userWithLocation: UserWithLocation = {
    id: 'user1',
    userId: 'user1',
    user: {
      id: 'user1',
      displayName: 'User One',
      avatarUrl: '/api/users/user1/avatar'
    },
    location: {
      id: 'user1',
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { timestamp: '2026-01-01T00:00:00Z' }
    }
  };

  beforeEach(() => {
    sidebarService = jasmine.createSpyObj<SidebarService>('SidebarService', ['viewUser']);
    mapService = jasmine.createSpyObj<MapService>('MapService', ['zoomToFeatureInLayer', 'followFeatureInLayer'], { followedFeature: { id: 'user2', layer: 'people' } });
    const sessionService = jasmine.createSpyObj<SessionService>('SessionService', { getToken: 'token' });

    component = new UserListItemComponent(sidebarService, mapService, sessionService);
    component.userWithLocation = userWithLocation;
    component.ngOnChanges();
  });

  it('should set the user and location from the user with location', () => {
    expect(component.user).toBe(userWithLocation.user);
    expect(component.location).toBe(userWithLocation.location);
  });

  it('should view the user with location in the sidebar', () => {
    component.viewUser();

    expect(sidebarService.viewUser).toHaveBeenCalledWith(userWithLocation);
    expect(mapService.zoomToFeatureInLayer).toHaveBeenCalledWith(userWithLocation, 'people');
  });

  it('should follow the user without viewing the user', () => {
    const event = jasmine.createSpyObj<MouseEvent>('MouseEvent', ['stopPropagation']);

    component.followUser(event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(mapService.followFeatureInLayer).toHaveBeenCalledWith(userWithLocation, 'people');
    expect(sidebarService.viewUser).not.toHaveBeenCalled();
  });
});
