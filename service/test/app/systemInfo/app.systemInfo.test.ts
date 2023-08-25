import { expect } from 'chai';
import {
  EnvironmentInfo,
  SystemInfo
} from '../../../lib/entities/systemInfo/entities.systemInfo';
import{ Substitute } from '@fluffy-spoon/substitute';
import { CreateReadSystemInfo } from '../../../lib/app.impl/systemInfo/app.impl.systemInfo';
import {
  AppRequest,
  AppRequestContext
} from '../../../lib/app.api/app.api.global';
import AuthenticationConfiguration from '../../../lib/models/authenticationconfiguration';
import AuthenticationConfigurationTransformer from '../../../lib/transformers/authenticationconfiguration';
import * as Settings from '../../../lib/models/setting';

const mockNodeVersion = '14.16.1';
const mockMongoDBVersion = '4.2.0';

const mockEnvironmentInfo: EnvironmentInfo = {
  nodeVersion: mockNodeVersion,
  monogdbVersion: mockMongoDBVersion
};
const mockDisclaimer = {};
const mockContactInfo = {};

// Mocking AuthenticationConfiguration.getAllConfigurations and AuthenticationConfigurationTransformer.transform
AuthenticationConfiguration.getAllConfigurations = async () => [];
AuthenticationConfigurationTransformer.transform = (
  configurations: any,
  options: any
) => [];

// Test utility function
function requestBy<T extends object>(
  principal: string,
  params?: T
): AppRequest<string> & T {
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
  let readSystemInfo: (
    arg0: AppRequest<string, AppRequestContext<string>> & object
  ) => any;
  let mockedSettingsModule = Substitute.for<typeof Settings>();
  const mockConfig = {
    api: {
      name: 'test-name',
      nodeVersion: '14.16.1',
      description: 'test-description',
      version: { major: 1, minor: 2, micro: 3 }
    }
  };

  beforeEach(() => {
    mockedSettingsModule
      .getSetting('disclaimer')
      .returns(Promise.resolve(mockDisclaimer as any));

    mockedSettingsModule
      .getSetting('contactInfo') // Ensure correct casing here
      .returns(Promise.resolve(mockDisclaimer as any));
    readSystemInfo = CreateReadSystemInfo(
      {
        readEnvironmentInfo: () => Promise.resolve(mockEnvironmentInfo),
        readDependencies: () => Promise.resolve({})
      },
      mockConfig
    );
  });

  afterEach(() => {
    mockedSettingsModule = Substitute.for<typeof Settings>();
  });


  it('should return a function that produces a ReadSystemInfoResponse with full SystemInfo', async () => {
    const request = requestBy('test-principal');
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
    const request = requestBy('test-principal');
    const response = await readSystemInfo(request);
    const nodeVersion = (response.success as SystemInfo).environment
      .nodeVersion;
    const versionFormat = /^\d+\.\d+\.\d+$/;
    expect(nodeVersion).to.match(versionFormat);
  });
});
