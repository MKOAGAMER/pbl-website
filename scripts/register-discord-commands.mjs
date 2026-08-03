const applicationId = (process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID || '').trim();
const botToken = (process.env.DISCORD_BOT_TOKEN || '').trim();
const guildId = (process.env.DISCORD_GUILD_ID || '').trim();

if (!applicationId || !botToken) {
  throw new Error('Set DISCORD_APPLICATION_ID (or DISCORD_CLIENT_ID) and DISCORD_BOT_TOKEN first.');
}

const actionTypeChoices = [
  ['Warning', 'warning'],
  ['Match suspension', 'match_suspension'],
  ['Trade ban', 'trade_ban'],
  ['Account ban', 'account_ban'],
  ['Blacklist', 'blacklist'],
].map(([name, value]) => ({ name, value }));
const statusChoices = ['scheduled', 'live', 'final', 'postponed', 'cancelled'].map((value) => ({ name: value, value }));

const commands = [{
  name: 'pbal', description: 'PBAL league information and operations', dm_permission: false,
  options: [
    { type: 1, name: 'player', description: 'Find a player and public discipline status', options: [
      { type: 3, name: 'query', description: 'Player UUID, name or Roblox username', required: true },
    ] },
    { type: 1, name: 'matches', description: 'Show live and upcoming matches' },
    { type: 1, name: 'standings', description: 'Show current PBAL standings' },
    { type: 1, name: 'trade', description: 'Submit a trade request as a linked Franchise Owner or staff account', options: [
      { type: 3, name: 'player', description: 'Player UUID, name or Roblox username', required: true },
      { type: 3, name: 'team', description: 'Destination team UUID, name or abbreviation', required: true },
      { type: 3, name: 'kind', description: 'Trade request type', required: true, choices: [
        { name: 'Acquire', value: 'acquire' }, { name: 'Release', value: 'release' }, { name: 'Transfer', value: 'transfer' },
      ] },
      { type: 3, name: 'notes', description: 'Optional request note', max_length: 500 },
    ] },
    { type: 1, name: 'punish', description: 'Issue player discipline (PBAL staff only)', options: [
      { type: 3, name: 'player', description: 'Player UUID, name or Roblox username', required: true },
      { type: 3, name: 'type', description: 'Disciplinary action', required: true, choices: actionTypeChoices },
      { type: 3, name: 'reason', description: 'Internal reason', required: true, min_length: 3, max_length: 2000 },
      { type: 4, name: 'duration-hours', description: 'Hours until expiry; omit for indefinite', min_value: 1, max_value: 8760 },
      { type: 3, name: 'public-note', description: 'Safe public notice', max_length: 1000 },
      { type: 5, name: 'public', description: 'Publish on the website blacklist page' },
    ] },
    { type: 1, name: 'revoke', description: 'Revoke active player discipline (PBAL staff only)', options: [
      { type: 3, name: 'action-id', description: 'Disciplinary action UUID', required: true },
      { type: 3, name: 'reason', description: 'Revocation reason', required: true, min_length: 3, max_length: 1000 },
    ] },
    { type: 1, name: 'match-update', description: 'Update match state or score (PBAL staff only)', options: [
      { type: 3, name: 'match-id', description: 'Match UUID', required: true },
      { type: 3, name: 'status', description: 'New match status', required: true, choices: statusChoices },
      { type: 4, name: 'home-score', description: 'Home score', min_value: 0 },
      { type: 4, name: 'away-score', description: 'Away score', min_value: 0 },
      { type: 3, name: 'notes', description: 'Match note', max_length: 2000 },
    ] },
  ],
}];

const path = guildId ? `/applications/${applicationId}/guilds/${guildId}/commands` : `/applications/${applicationId}/commands`;
const response = await fetch(`https://discord.com/api/v10${path}`, {
  method: 'PUT',
  headers: { authorization: `Bot ${botToken}`, 'content-type': 'application/json' },
  body: JSON.stringify(commands),
});
const payload = await response.json();
if (!response.ok) throw new Error(`Discord returned ${response.status}: ${JSON.stringify(payload)}`);
console.log(`Registered ${payload.length} PBAL command${guildId ? ` in guild ${guildId}` : ' globally'}.`);
