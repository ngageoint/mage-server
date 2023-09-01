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
    expect(denied?.data.permission).to.equal(SystemInfoPermission.READ_SYSTEM_INFO);
    expect(denied?.data.object).to.equal('SystemInfo');
  });

  it('allows read permission if user has read system info permission', async function() {
    const ctx: AppRequestContext<UserWithRole> = {
      requestToken: Symbol(),
      requestingPrincipal() {
        return ({
          username: 'haspermission',
          roleId: {
            permissions: [ SystemInfoPermission.READ_SYSTEM_INFO ]
          }
        } as unknown) as UserWithRole;
      },
      locale() {
        return null;
      }
    };

    const denied = await permissions.ensureReadSystemInfoPermission(ctx);

    expect(denied).to.be.null;
  });
});
