import { expect } from 'chai';
import {
  EnvironmentInfo,
  SystemInfo
} from '../../../src/entities/systemInfo/entities.systemInfo';
import Substitute, { Substitute as Sub } from '@fluffy-spoon/substitute';
import { CreateReadSystemInfo } from '../../../src/app.impl/systemInfo/app.impl.systemInfo';
import {
  AppRequest,
  AppRequestContext
} from '../../../src/app.api/app.api.global';
import AuthenticationConfiguration from '../../../src/models/authenticationconfiguration';
import AuthenticationConfigurationTransformer from '../../../src/transformers/authenticationconfiguration';
import * as Settings from '../../../src/models/setting';

const mockNodeVersion = '14.16.1';
const mockMongoDBVersion = '4.2.0';

const mockEnvironmentInfo: EnvironmentInfo = {
  nodeVersion: mockNodeVersion,
  monogdbVersion: mockMongoDBVersion
};

const mockDisclaimer = {
  type: 'disclaimer',
  settings: { text: 'Sample disclaimer' }
};
const mockContactInfo = {
  type: 'contactinfo',
  settings: { email: 'contact@example.com' }
};

const mockVersion = '1.2.3';

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
  const mockedSettings = Substitute.for<typeof Settings>();
  const mockConfig = {
    api: {
      name: 'test',
      nodeVersion: '14.16.1',
      description: 'test-description',
      version: { major: 1, minor: 2, micro: 3 }
    }
  };

  beforeEach(() => {
    mockedSettings
      .getSetting('disclaimer')
      .returns(Promise.resolve(mockDisclaimer as any));
    mockedSettings
      .getSetting('contactinfo')
      .returns(Promise.resolve(mockContactInfo as any));
    readSystemInfo = CreateReadSystemInfo(
      {
        readEnvironmentInfo: () => Promise.resolve(mockEnvironmentInfo),
        readDependencies: () => Promise.resolve({})
      },
      mockConfig
    );
  });

  it('should return a function that produces a ReadSystemInfoResponse with full SystemInfo', async () => {
    const request = requestBy('test-principal');
    const response = await readSystemInfo(request);

    expect(response).to.exist;
    expect(response.success).to.exist;

    const systemInfo: SystemInfo = response.success as SystemInfo;
    console.log(`systemInfo TACOS!!! ${JSON.stringify(systemInfo)}`);

    // Asserting properties of SystemInfo
    expect(systemInfo.version).to.exist;
    expect(systemInfo.version).to.be.a('string');
    expect(systemInfo.mageVersion).to.be.a('string');
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
