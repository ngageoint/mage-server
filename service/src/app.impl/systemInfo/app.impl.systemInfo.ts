import { AppResponse } from '../../app.api/app.api.global';
import * as api from '../../app.api/systemInfo/app.api.systemInfo';
import { EnvironmentService } from '../../entities/systemInfo/entities.systemInfo';
import * as Settings from '../../models/setting';
import * as AuthenticationConfiguration from '../../models/authenticationconfiguration';
import AuthenticationConfigurationTransformer from '../../transformers/authenticationconfiguration';

import { SystemInfoPermissionService } from '../../app.api/systemInfo/app.api.systemInfo';
/**
 * This factory function creates the implementation of the {@link api.ReadSystemInfo}
 * application layer interface.
 */
export function CreateReadSystemInfo(
  environmentService: EnvironmentService,
  config: any,
  settingsModule: typeof Settings = Settings,
  authConfigModule: typeof AuthenticationConfiguration = AuthenticationConfiguration,
  authConfigTransformerModule: typeof AuthenticationConfigurationTransformer = AuthenticationConfigurationTransformer,
  permissions: SystemInfoPermissionService
): api.ReadSystemInfo {
  // appending the authentication strategies to the api
  async function appendAuthenticationStrategies(
    api: any,
    options: any = {}
  ): Promise<any> {
    const apiCopy = {
      ...api,
      authenticationStrategies: {}
    };
    const authenticationConfigurations = await authConfigModule.getAllConfigurations();
    const transformedConfigurations = authConfigTransformerModule.transform(
      authenticationConfigurations.filter(
        config => config.enabled || options.includeDisabled
      ),
      options
    );
    transformedConfigurations.forEach(
      (configuration: { name: string | number }) => {
        apiCopy.authenticationStrategies[configuration.name] = {
          ...configuration
        };
      }
    );
    return apiCopy;
  }

  return async function readSystemInfo(
    req: api.ReadSystemInfoRequest
  ): Promise<api.ReadSystemInfoResponse> {
    const hasReadSystemInfoPermission =
      (await permissions.ensureReadSystemInfoPermission(req.context)) === null;

    let environment;
    if (hasReadSystemInfoPermission) {
      environment = await environmentService.readEnvironmentInfo();
    }

    const disclaimer = (await settingsModule.getSetting('disclaimer')) || {};
    const contactInfo = (await settingsModule.getSetting('contactInfo')) || {};

    const apiConfig = Object.assign({}, config.api, {
      environment: environment,
      disclaimer: disclaimer,
      contactInfo: contactInfo
    });

    // Ensure the environment is removed if the user doesn't have permission
    if (!hasReadSystemInfoPermission) {
      delete apiConfig.environment;
    }

    const updatedApiConfig = await appendAuthenticationStrategies(apiConfig, {
      whitelist: true
    });

    return AppResponse.success(updatedApiConfig as any);
  };
}