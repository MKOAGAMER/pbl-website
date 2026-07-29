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

async function attachRobloxHeadshots(users: RobloxDirectoryUser[]) {
  if (!users.length) return users;

  const thumbnailUrl = new URL('https://thumbnails.roblox.com/v1/users/avatar-headshot');
  thumbnailUrl.searchParams.set('userIds', users.map((user) => user.id).join(','));
  thumbnailUrl.searchParams.set('size', '150x150');
  thumbnailUrl.searchParams.set('format', 'Png');
  thumbnailUrl.searchParams.set('isCircular', 'false');
  try {
    const response = await fetch(thumbnailUrl, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return users;
    const payload = (await response.json()) as { data?: Array<{ targetId?: number | string; imageUrl?: string; state?: string }> };
    const byId = new Map(
      (payload.data ?? [])
        .filter((item) => item.state === undefined || item.state === 'Completed')
        .map((item) => [String(item.targetId), item.imageUrl ?? null]),
    );
    return users.map((user) => ({ ...user, avatarUrl: byId.get(user.id) ?? user.avatarUrl }));
  } catch {
    return users;
  }
}

async function findExactRobloxUser(username: string): Promise<RobloxDirectoryUser | null> {
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
  return {
    id: String(match.id),
    username: match.name,
    displayName: match.displayName?.trim() || match.name,
    avatarUrl: null,
    verified: Boolean(match.hasVerifiedBadge),
  };
}

export async function searchRobloxUsers(keyword: string, limit = 8): Promise<RobloxDirectoryUser[]> {
  // Roblox keyword search can return an empty list for a valid exact username.
  // Resolve the exact username in parallel and merge it with fuzzy results.
  const url = new URL('https://users.roblox.com/v1/users/search');
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 10)));
  const [exact, response] = await Promise.all([
    findExactRobloxUser(keyword),
    fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10_000) }),
  ]);
  if (!response.ok) throw new Error(`Roblox user search failed (${response.status}).`);
  const payload = (await response.json()) as SearchPayload;
  const fuzzyUsers = (payload.data ?? []).flatMap((item) => {
    if (!item.id || !item.name) return [];
    return [{
      id: String(item.id),
      username: item.name,
      displayName: item.displayName?.trim() || item.name,
      avatarUrl: null,
      verified: Boolean(item.hasVerifiedBadge),
    }];
  });
  const byId = new Map<string, RobloxDirectoryUser>();
  if (exact) byId.set(exact.id, exact);
  fuzzyUsers.forEach((user) => byId.set(user.id, user));
  return attachRobloxHeadshots([...byId.values()].slice(0, Math.min(Math.max(limit, 1), 10)));
}

export async function getRobloxUserByUsername(username: string) {
  const exact = await findExactRobloxUser(username);
  if (!exact) return null;
  return (await attachRobloxHeadshots([exact]))[0] ?? exact;
}
