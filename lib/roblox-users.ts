import 'server-only';

export type RobloxDirectoryUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
};

type SearchPayload = {
  data?: Array<{ id?: number | string; name?: string; displayName?: string; hasVerifiedBadge?: boolean }>;
};

export async function searchRobloxUsers(keyword: string, limit = 8): Promise<RobloxDirectoryUser[]> {
  const url = new URL('https://users.roblox.com/v1/users/search');
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 10)));
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Roblox user search failed (${response.status}).`);
  const payload = (await response.json()) as SearchPayload;
  const users = (payload.data ?? []).flatMap((item) => {
    if (!item.id || !item.name) return [];
    return [{
      id: String(item.id),
      username: item.name,
      displayName: item.displayName?.trim() || item.name,
      avatarUrl: null,
      verified: Boolean(item.hasVerifiedBadge),
    }];
  });
  if (!users.length) return [];

  const thumbnailUrl = new URL('https://thumbnails.roblox.com/v1/users/avatar-headshot');
  thumbnailUrl.searchParams.set('userIds', users.map((user) => user.id).join(','));
  thumbnailUrl.searchParams.set('size', '150x150');
  thumbnailUrl.searchParams.set('format', 'Png');
  thumbnailUrl.searchParams.set('isCircular', 'false');
  try {
    const thumbnailResponse = await fetch(thumbnailUrl, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    if (!thumbnailResponse.ok) return users;
    const thumbnails = (await thumbnailResponse.json()) as { data?: Array<{ targetId?: number | string; imageUrl?: string }> };
    const byId = new Map((thumbnails.data ?? []).map((item) => [String(item.targetId), item.imageUrl ?? null]));
    return users.map((user) => ({ ...user, avatarUrl: byId.get(user.id) ?? null }));
  } catch {
    return users;
  }
}

export async function getRobloxUserByUsername(username: string) {
  const response = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Roblox username lookup failed (${response.status}).`);
  const payload = (await response.json()) as SearchPayload;
  const match = payload.data?.[0];
  if (!match?.id || !match.name) return null;
  const results = await searchRobloxUsers(match.name, 10);
  const result = results.find((item) => item.id === String(match.id));
  if (result) return result;
  return {
    id: String(match.id),
    username: match.name,
    displayName: match.displayName?.trim() || match.name,
    avatarUrl: null,
    verified: Boolean(match.hasVerifiedBadge),
  } satisfies RobloxDirectoryUser;
}
