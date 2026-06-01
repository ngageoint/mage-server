export type User = {
  iconUrl?: string;
  avatarUrl?: string;
  lastUpdated?: string;
};

export function userIconUrl(user: User | null | undefined, token: string | null | undefined): string | null {
  if (!user?.iconUrl) return null;
  return authenticatedUserUrl(user.iconUrl, token, user.lastUpdated);
}

export function userAvatarUrl(user: User | null | undefined, token: string | null | undefined): string | null {
  if (!user?.avatarUrl) return null;
  return authenticatedUserUrl(user.avatarUrl, token, user.lastUpdated);
}

function authenticatedUserUrl(
  url: string | null | undefined,
  token: string | null | undefined,
  lastUpdated?: string
): string {
  if (!url) return '';
  if (!token) return url;

  const sep = url.includes('?') ? '&' : '?';
  const dc = lastUpdated ? `&_dc=${lastUpdated}` : '';

  return `${url}${sep}access_token=${token}${dc}`;
}