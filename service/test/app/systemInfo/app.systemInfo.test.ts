import { expect } from 'chai';
import {
  EnvironmentInfo,
  SystemInfo
} from '../../../lib/entities/systemInfo/entities.systemInfo';
import { Substitute, Arg } from '@fluffy-spoon/substitute';
import { CreateReadSystemInfo, ApiVersion } from '../../../lib/app.impl/systemInfo/app.impl.systemInfo';
import * as Settings from '../../../lib/models/setting';
import * as AuthenticationConfiguration from '../../../lib/models/authenticationconfiguration';
import * as AuthenticationConfigurationTransformer from '../../../lib/transformers/authenticationconfiguration';
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base';
import { ReadSystemInfo, ReadSystemInfoRequest } from '../../../lib/app.api/systemInfo/app.api.systemInfo';
import { RoleBasedSystemInfoPermissionService } from '../../../lib/permissions/permissions.systemInfo';
import { SystemInfoPermission } from '../../../lib/entities/authorization/entities.permissions';

// Mocked environment info, disclaimer, contactInfo, and API version
const mockNodeVersion = '14.16.1';
const mockMongoDBVersion = '4.2.0';

const mockEnvironmentInfo: EnvironmentInfo = {
  nodeVersion: mockNodeVersion,
  mongodbVersion: mockMongoDBVersion
};
const mockDisclaimer = {};
const mockContactInfo = {};
const mockVersionInfo: ApiVersion = {
  major: 1,
  minor: 2,
  micro: 3
};

// Mocked user with role having READ_SYSTEM_INFO permission
const mockUserWithRole = ({
  _id: 'mockObjectId',
  id: 'testUserId',
  username: 'testUser',
  displayName: 'Test User',
  phones: [],
  active: true,
  enabled: true,
  roleId: {
    id: 'mockRoleId',
    permissions: [SystemInfoPermission.READ_SYSTEM_INFO] // Given the role the necessary permission.
  },
  authenticationId: 'mockAuthId',
  recentEventIds: [],
  createdAt: new Date(),
  lastUpdated: new Date()
} as unknown) as UserWithRole;

// Mocked user without READ_SYSTEM_INFO permission
const mockUserWithoutPermission = ({
  _id: 'mockObjectId2',
  id: 'testUserId2',
  username: 'testUser2',
  displayName: 'Test User 2',
  phones: [],
  active: true,
  enabled: true,
  roleId: {
    id: 'mockNoPermissionRoleId',
    permissions: [] // No permissions.
  },
  authenticationId: 'mockAuthId2',
  recentEventIds: [],
  createdAt: new Date(),
  lastUpdated: new Date()
} as unknown) as UserWithRole;


function requestBy<T extends object>(
  principal: UserWithRole,
  params?: T
): ReadSystemInfoRequest & T {
  if (!params) {
    params = {} as T;
  }
  return {
    ...params,
    context: {
      requestToken: Symbol(),
      requestingPrincipal: () => principal,
      locale() {
        return null;
      }
    }
  };
}



describe('CreateReadSystemInfo', () => {
  let readSystemInfo: ReadSystemInfo

  let mockedSettingsModule = Substitute.for<typeof Settings>();
  let mockedAuthConfigModule = Substitute.for<
    typeof AuthenticationConfiguration
  >();
  let mockedAuthConfigTransformerModule = Substitute.for<
    typeof AuthenticationConfigurationTransformer
  >();

  const mockConfig = {
    api: {
      name: 'test-name',
      nodeVersion: '14.16.1',
      description: 'test-description',
      version: { major: 1, minor: 2, micro: 3 }
    }
  };

  const mockedPermissionsModule = new RoleBasedSystemInfoPermissionService();

  beforeEach(() => {
    mockedSettingsModule = Substitute.for<typeof Settings>();
    mockedAuthConfigModule = Substitute.for<
      typeof AuthenticationConfiguration
    >();
    mockedAuthConfigTransformerModule = Substitute.for<
      typeof AuthenticationConfigurationTransformer
    >();

    mockedSettingsModule
      .getSetting('disclaimer')
      .returns(Promise.resolve(mockDisclaimer as any));
    mockedSettingsModule
      .getSetting('contactinfo')
      .returns(Promise.resolve(mockContactInfo as any));
    mockedAuthConfigModule.getAllConfigurations().returns(Promise.resolve([]));
    mockedAuthConfigTransformerModule.transform(Arg.any()).returns([]);

    readSystemInfo = CreateReadSystemInfo(
      {
        readEnvironmentInfo: () => Promise.resolve(mockEnvironmentInfo),
        readDependencies: () => Promise.resolve({})
      },
      mockVersionInfo,
      mockedSettingsModule,
      mockedAuthConfigModule,
      mockedAuthConfigTransformerModule,
      mockedPermissionsModule
    );
  });

  it('should return a function that produces a ReadSystemInfoResponse with full SystemInfo', async () => {
    const request = requestBy(mockUserWithRole);
    const response = await readSystemInfo(request);

    expect(response).to.exist;
    expect(response.success).to.exist;

    const systemInfo: SystemInfo = response.success as SystemInfo;

    expect(systemInfo.version).to.be.an('object');
    expect(systemInfo.version.major).to.be.a('number');
    expect(systemInfo.version.minor).to.be.a('number');
    expect(systemInfo.version.micro).to.be.a('number');

    expect(systemInfo.environment).to.eql(mockEnvironmentInfo);
    expect(systemInfo.disclaimer).to.eql(mockDisclaimer);
    expect(systemInfo.contactInfo).to.eql(mockContactInfo);
    expect(systemInfo.version).to.eql(mockConfig.api.version);
  });

  it("should format the node version as 'major.minor.patch'", async () => {
    const request = requestBy(mockUserWithRole);
    const response = await readSystemInfo(request);
    const nodeVersion = (response.success as SystemInfo).environment
      .nodeVersion;
    const versionFormat = /^\d+\.\d+\.\d+$/;
    expect(nodeVersion).to.match(versionFormat);
  });

  it('should return a function that produces a ReadSystemInfoResponse without environment info for users without permission', async () => {
    const request = requestBy(mockUserWithoutPermission);
    const response = await readSystemInfo(request);

    expect(response).to.exist;
    expect(response.success).to.exist;

    const systemInfo: SystemInfo = response.success as SystemInfo;

    expect(systemInfo.environment).to.be.undefined; // Asserts that environment info is not present
  });

});
