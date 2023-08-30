import { AppResponse } from '../../app.api/app.api.global';
import * as api from '../../app.api/systemInfo/app.api.systemInfo';
import { EnvironmentService } from '../../entities/systemInfo/entities.systemInfo';
import * as Settings from '../../models/setting';
import * as AuthenticationConfiguration from '../../models/authenticationconfiguration';
import AuthenticationConfigurationTransformer from '../../transformers/authenticationconfiguration';
import { RoleBasedSystemInfoPermissionService } from '../../permissions/permissions.systemInfo';
import { permissionDenied } from '../../app.api/app.api.errors';
import { SystemInfoPermission } from '../../entities/authorization/entities.permissions';
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
  permissions: RoleBasedSystemInfoPermissionService
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

  const permissionError = await permissions.ensureReadSystemInfoPermission(
    req.context
  );
  if (permissionError) {
    throw permissionError;
  }


    // TODO: will need a permission check to determine what level of system
    // information the requesting principal is allowed to see
    const environment = await environmentService.readEnvironmentInfo();
    const disclaimer = (await settingsModule.getSetting('disclaimer')) || {};
    const contactInfo = (await settingsModule.getSetting('contactInfo')) || {};

    const apiConfig = Object.assign({}, config.api, {
      environment: environment,
      disclaimer: disclaimer,
      contactInfo: contactInfo
    });

    const updatedApiConfig = await appendAuthenticationStrategies(apiConfig, {
      whitelist: true
    });

    return AppResponse.success(updatedApiConfig as any);
  };
}