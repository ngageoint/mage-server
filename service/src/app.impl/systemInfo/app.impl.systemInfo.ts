import * as api from '../../app.api/systemInfo/app.api.systemInfo'
import { SystemInfoService } from '../../entities/systemInfo/entities.systemInfo'

/**
 * This factory function creates the implementation of the {@link api.ReadSystemInfo}
 * application layer interface.
 */
export function ReadSystemInfo(systemInfoService: SystemInfoService): api.ReadSystemInfo {
  return async function readSystemInfo(req: api.ReadSystemInfoRequest): Promise<api.ReadSystemInfoResponse> {
    // TODO: will need a permission check to determine what level of system
    // information the requesting principal is allowed to see
    throw new Error('todo')
  }
}