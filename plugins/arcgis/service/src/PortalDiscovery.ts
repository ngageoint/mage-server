import { ArcGISIdentityManager, ArcGISRequestError, request } from "@esri/arcgis-rest-request";
import { searchItems } from "@esri/arcgis-rest-portal";

export const describeArcGISError = (err: unknown): string => {
  if (err instanceof ArcGISRequestError) {
    return `${err.message}${err.response?.error?.message ? ` (${err.response.error.message})` : ''}`;
  }
  return err instanceof Error ? err.message : String(err);
};

// produces a user-facing message for an auth/communication failure against a given ArcGIS endpoint
export const describeAuthFailure = (label: string, err: unknown): string => {
  if (err instanceof ArcGISRequestError && String(err.code ?? '').includes('404')) {
    return `Could not find an ArcGIS endpoint at the ${label} URL. Check the URL and try again.`;
  }
  return `Invalid credentials provided to communicate with ${label}: ${describeArcGISError(err)}`;
};

// derives an ordered, de-duplicated list of portal "sharing/rest" URLs to try
export const portalUrlCandidates = (input: string | undefined): string[] => {
  const trimmed = (input || '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    return [];
  }

  const sharingMatch = trimmed.match(/^(.*\/sharing\/rest)\b/i);
  const serverRoot = sharingMatch
    ? sharingMatch[1].replace(/\/sharing\/rest$/i, '')
    : trimmed.replace(/\/rest\/services\/.*$/i, '').replace(/\/rest\/?$/i, '');

  const bareOrigin = /^https?:\/\/[^/]+$/i.test(serverRoot);
  const roots = bareOrigin ? [serverRoot, `${serverRoot}/arcgis`] : [serverRoot];
  return Array.from(new Set(roots.map(root => `${root}/sharing/rest`)));
};

// tries to sign in with username/password against each candidate portal url derived from the
// user's input, in order, until one succeeds - returns the identity manager along with whichever
// portal url actually worked so the caller can report it back / persist the corrected value
export const signInWithPortalCandidates = async (
  username: string,
  password: string,
  portalUrlInput: string | undefined,
  console: Console
): Promise<{ identityManager: ArcGISIdentityManager, portalUrl: string }> => {
  const candidates = portalUrlCandidates(portalUrlInput);
  if (candidates.length === 0) {
    throw new Error('portalUrl is required');
  }

  let lastErr: unknown;
  for (const candidatePortalUrl of candidates) {
    try {
      const identityManager = await ArcGISIdentityManager.signIn({ username, password, portal: candidatePortalUrl });
      console.log(`Signed in to portal ${candidatePortalUrl} as ${username}`);
      return { identityManager, portalUrl: candidatePortalUrl };
    } catch (err) {
      console.debug(`Could not sign in to portal ${candidatePortalUrl}: ${describeArcGISError(err)}`);
      lastErr = err;
    }
  }
  throw lastErr;
};

// checks whether the authenticated user's ArcGIS privileges include features:user:edit, required
// to write observations to feature layers
export const checkEditPrivilege = async (portalUrl: string, identityManager: ArcGISIdentityManager, console: Console): Promise<boolean | undefined> => {
  try {
    const self = await request(`${portalUrl}/community/self`, { authentication: identityManager });
    const privileges: string[] = self?.privileges ?? [];
    console.debug(`ArcGIS user ${self?.username} has privileges: ${privileges.join(', ')}`);
    return !privileges.includes('features:user:edit');
  } catch (err) {
    console.error(`Could not check ArcGIS user privileges: ${describeArcGISError(err)}`);
    return undefined;
  }
};

export type DiscoveredFeatureService = {
  id: string
  title: string
  url: string
  owner: string
  // undefined if the service's own definition couldn't be fetched, meaning read-only status is unknown
  capabilities?: string
  permission: string
}

export type DiscoveredFeatureServicesPage = {
  services: DiscoveredFeatureService[]
  total: number
  start: number
  num: number
}

/**
 * Search a portal for feature services accessible to the given identity, sorted alphabetically by title.
 * @param identityManager authenticated identity to search the portal with
 * @param console used to log messages
 * @param start 1-based index of the first result to return, per the ArcGIS REST paging convention
 * @param num number of results to return
 * @param titleFilter if provided, restricts results to services whose title starts with this text
 * @returns a page of feature services available to that identity, and the total count across all pages
 */
export const discoverFeatureServices = async (identityManager: ArcGISIdentityManager, console: Console, start = 1, num = 20, titleFilter?: string): Promise<DiscoveredFeatureServicesPage> => {
  const sanitizedFilter = titleFilter?.replace(/["*:]/g, '').trim();
  // a trailing-only wildcard (prefix match) is used because leading wildcards are not reliably
  // supported by the portal's search index and can cause the filter clause to be silently ignored
  const q = sanitizedFilter ? `type:"Feature Service" AND title:${sanitizedFilter}*` : 'type:"Feature Service"';
  const result = await searchItems({
    q,
    authentication: identityManager,
    sortField: 'title',
    sortOrder: 'asc',
    start,
    num
  });
  const services = await Promise.all(result.results
    .filter((item): item is typeof item & { url: string } => !!item.url)
    .map(async (item) => {
      // the portal search result doesn't include capabilities, so fetch each service's own
      // definition to find out whether it allows editing before the user selects it
      let capabilities: string | undefined;
      try {
        const response = await request(item.url, { authentication: identityManager });
        capabilities = response.capabilities;
      } catch (err) {
        console.error(`Could not get capabilities for discovered feature service ${item.url}: ${describeArcGISError(err)}`);
      }

      const serviceHasEditCapability = !!capabilities?.split(',').some(c => ['Create', 'Update', 'Delete', 'Editing'].includes(c));

      return {
        id: item.id,
        title: item.title,
        url: item.url,
        owner: item.owner,
        capabilities,
        permission: serviceHasEditCapability ? '' : 'Read only'
      };
    }));
  return { services, total: result.total, start, num };
};

// tries a full "authenticate + search" attempt against each candidate portal url in order
export const discoverWithPortalCandidates = async (
  portalUrlInput: string | undefined,
  buildIdentity: (candidatePortalUrl: string) => Promise<ArcGISIdentityManager>,
  start: number | undefined,
  num: number | undefined,
  filter: string | undefined,
  console: Console
): Promise<{ identityManager: ArcGISIdentityManager, portalUrl: string, mayLackEditPrivilege?: boolean, page: DiscoveredFeatureServicesPage }> => {
  const candidates = portalUrlCandidates(portalUrlInput);
  if (candidates.length === 0) {
    throw new Error('portalUrl is required');
  }

  let lastErr: unknown;
  for (const candidatePortalUrl of candidates) {
    try {
      const identityManager = await buildIdentity(candidatePortalUrl);
      const page = await discoverFeatureServices(identityManager, console, start, num, filter);
      const mayLackEditPrivilege = await checkEditPrivilege(candidatePortalUrl, identityManager, console);
      console.log(`Successfully browsed portal ${candidatePortalUrl} as ${identityManager.username}`);
      return { identityManager, portalUrl: candidatePortalUrl, mayLackEditPrivilege, page };
    } catch (err) {
      console.debug(`Could not browse portal ${candidatePortalUrl}: ${describeArcGISError(err)}`);
      lastErr = err;
    }
  }
  throw lastErr;
};
