import { AppResponse } from '../../app.api/app.api.global';
import * as api from '../../app.api/systemInfo/app.api.systemInfo';
import { EnvironmentService, SystemInfo } from '../../entities/systemInfo/entities.systemInfo';
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
    req: api.ReadSystemInfoRequest,
    // isAuthenticated: boolean
  ): Promise<api.ReadSystemInfoResponse> {

     const hasReadSystemInfoPermission =
       (await permissions.ensureReadSystemInfoPermission(req.context)) === null;;

    // Start with base config
    const apiConfig: Partial<SystemInfo> = {
      disclaimer: (await settingsModule.getSetting('disclaimer')) || {},
      contactInfo: (await settingsModule.getSetting('contactInfo')) || {}
    };

     // Add environment details based on permission
     if (hasReadSystemInfoPermission) {
       apiConfig.environment = await environmentService.readEnvironmentInfo();
     }

     // Apply authentication strategies
     const updatedApiConfig = await appendAuthenticationStrategies(apiConfig, {
       whitelist: true
     });

     return AppResponse.success(updatedApiConfig);
  };
}
