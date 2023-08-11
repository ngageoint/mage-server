import { AppResponse } from '../../app.api/app.api.global'
import * as api from '../../app.api/systemInfo/app.api.systemInfo'
import { EnvironmentService } from '../../entities/systemInfo/entities.systemInfo'
import * as Settings from '../../models/setting'
import AuthenticationApiAppender  from '../../utilities/authenticationApiAppender'
import config from '../../config'
/**
 * This factory function creates the implementation of the {@link api.ReadSystemInfo}
 * application layer interface.
 */
export function CreateReadSystemInfo(EnvironmentService: EnvironmentService): api.ReadSystemInfo {
  return async function readSystemInfo(req: api.ReadSystemInfoRequest): Promise<api.ReadSystemInfoResponse> {
    // TODO: will need a permission check to determine what level of system
    // information the requesting principal is allowed to see
    const environment = await EnvironmentService.readEnvironmentInfo()
    const disclaimer = await Settings.getSetting('disclaimer') || {}
    const contactInfo = await Settings.getSetting('contactinfo') || {}


    const api = Object.assign({}, config.api, {
      environment: environment,
      disclaimer: disclaimer,
      contactinfo: contactInfo
    });
    
    const authApiAppender =  await AuthenticationApiAppender.append(api, { whitelist: true })
    
    return AppResponse.success(authApiAppender as any)
  }
}