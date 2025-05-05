import { expect } from 'chai';
import { RoleBasedSystemInfoPermissionService } from '../../lib/permissions/permissions.systemInfo';
import { AppRequestContext } from '../../lib/app.api/app.api.global';
import {
  allPermissions,
  SystemInfoPermission
} from '../../lib/entities/authorization/entities.permissions';
import { ErrPermissionDenied } from '../../lib/app.api/app.api.errors';
import { UserWithRole } from '../../lib/permissions/permissions.role-based.base';

describe('system info role-based permission service', function() {
  let permissions: RoleBasedSystemInfoPermissionService;

  beforeEach(function() {
    permissions = new RoleBasedSystemInfoPermissionService();
  });

  it('denies read permission if user does not have read system info permission', async function() {
    const ctx: AppRequestContext<UserWithRole> = {
      requestToken: Symbol(),
      requestingPrincipal() {
        return ({
          username: 'neverever',
          roleId: {
            permissions: [allPermissions.READ_OBSERVATION_ALL]
          }
        } as unknown) as UserWithRole;
      },
      locale() {
        return null;
      }
    };

    const denied = await permissions.ensureReadSystemInfoPermission(ctx);

    expect(denied?.code).to.equal(ErrPermissionDenied);
    expect(denied?.data.subject).to.equal('neverever');
    expect(denied?.data.permission).to.equal(
      SystemInfoPermission.READ_SYSTEM_INFO
    );
    expect(denied?.data.object).to.be.null; // Expecting no object in the denied data as per the static icon example.
  });

  it('allows read permission if user has read system info permission', async function() {
    const ctx: AppRequestContext<UserWithRole> = {
      requestToken: Symbol(),
      requestingPrincipal() {
        return ({
          username: 'canread',
          roleId: {
            permissions: [SystemInfoPermission.READ_SYSTEM_INFO]
          }
        } as unknown) as UserWithRole;
      },
      locale() {
        return null;
      }
    };

    const denied = await permissions.ensureReadSystemInfoPermission(ctx);

    expect(denied).to.be.null; // No permission denied error should be returned.
  });

  // If there's any other special permission behavior specific to SystemInfo,
  // you can model another test case here similar to the static icon's "allows get permission always".
});

