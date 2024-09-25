import * as api from '../../app.api/users/app.api.users'
import { UserRepository } from '../../entities/users/entities.users'
import { withPermission, KnownErrorsOf } from '../../app.api/app.api.global'
import { PageOf } from '../../entities/entities.global'
import { IdentityProviderRepository } from '../../ingress/ingress.entities'


export function CreateUserOperation(userRepo: UserRepository, idpRepo: IdentityProviderRepository): api.CreateUserOperation {
  return async function createUser(req: api.CreateUserRequest): ReturnType<api.CreateUserOperation> {
    const reqUser = req.user
    const baseUser = {
      ...reqUser,
      active: false,
      enabled: true,
    }
    const localIdp = await idpRepo.findIdpByName('local')
    if (!localIdp) {
      throw new Error('local identity provider does not exist')
    }
    const created = await userRepo.create(baseUser)
    const enrollmentPolicy = localIdp.userEnrollmentPolicy
    if (Array.isArray(enrollmentPolicy.assignToEvents) && enrollmentPolicy.assignToEvents.length > 0) {
    }
    if (Array.isArray(enrollmentPolicy.assignToTeams) && enrollmentPolicy.assignToTeams.length > 0) {
    }

    let defaultTeams;
    let defaultEvents
    if (authenticationConfig) {
      baseUser.authentication.authenticationConfigurationId = authenticationConfig._id;
      const requireAdminActivation = authenticationConfig.settings.usersReqAdmin || { enabled: true };
      if (requireAdminActivation) {
        baseUser.active = baseUser.active || !requireAdminActivation.enabled;
      }

      defaultTeams = authenticationConfig.settings.newUserTeams;
      defaultEvents = authenticationConfig.settings.newUserEvents;
    } else {
      throw new Error('No configuration defined for ' + baseUser.authentication.type);
    }

    const created = await userRepo.create(baseUser)

    if (options.avatar) {
      try {
        const avatar = avatarPath(newUser._id, newUser, options.avatar);
        await fs.move(options.avatar.path, avatar.absolutePath);

        newUser.avatar = {
          relativePath: avatar.relativePath,
          contentType: options.avatar.mimetype,
          size: options.avatar.size
        };

        await newUser.save();
      } catch { }
    }

    if (options.icon && (options.icon.type === 'create' || options.icon.type === 'upload')) {
      try {
        const icon = iconPath(newUser._id, newUser, options.icon);
        await fs.move(options.icon.path, icon.absolutePath);

        newUser.icon.type = options.icon.type;
        newUser.icon.relativePath = icon.relativePath;
        newUser.icon.contentType = options.icon.mimetype;
        newUser.icon.size = options.icon.size;
        newUser.icon.text = options.icon.text;
        newUser.icon.color = options.icon.color;

        await newUser.save();
      } catch { }
    }

    if (defaultTeams && Array.isArray(defaultTeams)) {
      const addUserToTeam = util.promisify(TeamModel.addUser);
      for (let i = 0; i < defaultTeams.length; i++) {
        try {
          await addUserToTeam({ _id: defaultTeams[i] }, newUser);
        } catch { }
      }
    }

    if (defaultEvents && Array.isArray(defaultEvents)) {
      const addUserToTeam = util.promisify(TeamModel.addUser);

      for (let i = 0; i < defaultEvents.length; i++) {
        const team = await TeamModel.getTeamForEvent({ _id: defaultEvents[i] });
        if (team) {
          try {
            await addUserToTeam(team, newUser);
          } catch { }
        }
      }
    }

    return newUser;
  }
}

export function AdmitUserFromIdentityProvider(): api.AdminUserFromIdentityProvider {

}

// export function UpdateUserOperation(): api.UpdateUserOperation {
//   return async function updateUser(req: api.UpdateUserRequest): ReturnType<api.UpdateUserOperation> {

//   }
// }

export function SearchUsers(userRepo: UserRepository,permissions: api.UsersPermissionService): api.SearchUsers {
  return async function searchUsers(req: api.UserSearchRequest): ReturnType<api.SearchUsers> {
    return await withPermission<
      PageOf<api.UserSearchResult>,
      KnownErrorsOf<api.SearchUsers>
    >(
      permissions.ensureReadUsersPermission(req.context),
      async (): Promise<PageOf<api.UserSearchResult>> => {
        const page = await userRepo.find<api.UserSearchResult>(
          req.userSearch,
          x => {
            return {
              id: x.id,
              username: x.username,
              displayName: x.displayName,
              email: x.email,
              active: x.active,
              enabled: x.enabled,
              allPhones: x.phones.reduce((allPhones, phone, index) => {
                return index === 0
                  ? `${phone.number}`
                  : `${allPhones}; ${phone.number}`
              }, '')
            };
          }
        );
        return page
      }
    )
  }
}