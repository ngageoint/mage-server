import { AppResponse } from '../../app.api/app.api.global'
import * as api from '../../app.api/systemInfo/app.api.systemInfo'
import { EnvironmentService } from '../../entities/systemInfo/entities.systemInfo'
import * as Settings from '../../models/setting'
import * as Users from '../../models/user'
import * as AuthenticationConfiguration from '../../models/authenticationconfiguration'
import AuthenticationConfigurationTransformer from '../../transformers/authenticationconfiguration'
import { ExoPrivilegedSystemInfo, ExoRedactedSystemInfo, ExoSystemInfo, SystemInfoPermissionService } from '../../app.api/systemInfo/app.api.systemInfo'

/**
 * This factory function creates the implementation of the {@link api.ReadSystemInfo}
 * application layer interface.
 */
export function CreateReadSystemInfo(
  environmentService: EnvironmentService,
  version: api.ApiVersion,
  serverVersion: string,
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
    }
    const authenticationConfigurations = await authConfigModule.getAllConfigurations()
    const transformedConfigurations = authConfigTransformerModule.transform(
      authenticationConfigurations.filter(config => config.enabled || options.includeDisabled),
      options
    )
    transformedConfigurations.forEach(
      (configuration: { name: string | number }) => {
        apiCopy.authenticationStrategies[configuration.name] = {
          ...configuration
        }
      }
    )
    return apiCopy
  }

  return async function readSystemInfo(req: api.ReadSystemInfoRequest): Promise<api.ReadSystemInfoResponse> {

	  // FIXME: Replace this with Robert's first-run secret implementation when available
    const legacyUsers = Users as any   
    const userCount = await new Promise(resolve => {
      legacyUsers.count({}, (err:any, count:any) => {
        resolve(count)
      })
    })

    // Initialize with base system info
    let systemInfoResponse: ExoRedactedSystemInfo = {
      version: version,
      serverVersion: serverVersion,
      initial: userCount == 0,
      disclaimer: (await settingsModule.getSetting('disclaimer'))?.settings || {},
      contactInfo: (await settingsModule.getSetting('contactinfo'))?.settings || {}
    }

    // Add environment details for authenticated users with permission
    const hasReadSystemInfoPermission =  await permissions.ensureReadSystemInfoPermission(req.context)
    if (hasReadSystemInfoPermission === null) {
      const environmentInfo = await environmentService.readEnvironmentInfo()
      systemInfoResponse = {
        ...systemInfoResponse,
        environment: environmentInfo
      } as ExoPrivilegedSystemInfo
    }

    // Apply authentication strategies to the system info response
    const updatedApiConfig = await appendAuthenticationStrategies(systemInfoResponse, {
        whitelist: true
    })

    return AppResponse.success(updatedApiConfig as ExoSystemInfo) // Cast to ExoSystemInfo
  }
}
