  -- Repeatable development/demo data for the PBL portal.
  -- Run after every migration in supabase/migrations.

  begin;

  insert into public.teams (
    id, name, slug, abbreviation, city, description, logo_url,
    primary_color, secondary_color, home_venue, is_active, wins, losses
  )
  values
    (
      '20000000-0000-4000-8000-000000000001',
      'Bangkok Guardians', 'bangkok-guardians', 'BKK', 'Bangkok',
      'A fast-paced Bangkok basketball club.', null,
      '#0f172a', '#f59e0b', 'PBL Arena Bangkok', true, 1, 1
    ),
    (
      '20000000-0000-4000-8000-000000000002',
      'Chiang Mai Falcons', 'chiang-mai-falcons', 'CMF', 'Chiang Mai',
      'Northern Thailand representatives known for disciplined defense.', null,
      '#7c2d12', '#fed7aa', 'Chiang Mai Sports Hall', true, 0, 1
    ),
    (
      '20000000-0000-4000-8000-000000000003',
      'Phuket Waves', 'phuket-waves', 'PKT', 'Phuket',
      'An energetic coastal club built around transition offense.', null,
      '#075985', '#67e8f9', 'Phuket Municipal Gym', true, 2, 0
    ),
    (
      '20000000-0000-4000-8000-000000000004',
      'Khon Kaen Thunder', 'khon-kaen-thunder', 'KKT', 'Khon Kaen',
      'A physical northeastern club with a strong local academy.', null,
      '#4c1d95', '#c4b5fd', 'Khon Kaen Convention Hall', true, 0, 1
    )
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    abbreviation = excluded.abbreviation,
    city = excluded.city,
    description = excluded.description,
    logo_url = excluded.logo_url,
    primary_color = excluded.primary_color,
    secondary_color = excluded.secondary_color,
    home_venue = excluded.home_venue,
    is_active = excluded.is_active,
    wins = excluded.wins,
    losses = excluded.losses;

  insert into public.seasons (
    id, name, slug, league_name, starts_on, ends_on, status, is_public
  )
  values (
    '10000000-0000-4000-8000-000000000001',
    'PBL 2026', 'pbl-2026', 'PBL', '2026-01-15', '2026-10-31', 'active', true
  )
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    league_name = excluded.league_name,
    starts_on = excluded.starts_on,
    ends_on = excluded.ends_on,
    status = excluded.status,
    is_public = excluded.is_public;

  insert into public.season_teams (
    id, season_id, team_id, conference, division, seed, is_active
  )
  values
    (
      '21000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001', 'Central', 'A', 1, true
    ),
    (
      '21000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002', 'North', 'A', 2, true
    ),
    (
      '21000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000003', 'South', 'B', 1, true
    ),
    (
      '21000000-0000-4000-8000-000000000004',
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000004', 'Northeast', 'B', 2, true
    )
  on conflict (id) do update set
    season_id = excluded.season_id,
    team_id = excluded.team_id,
    conference = excluded.conference,
    division = excluded.division,
    seed = excluded.seed,
    is_active = excluded.is_active;

  insert into public.players (
    id, name, first_name, last_name, slug, roblox_username, position, team_id, birth_date,
    height_cm, weight_kg, nationality, hometown, college, avatar_url, is_active
  )
  values
    (
      '30000000-0000-4000-8000-000000000001',
      'Narin Srisuk', 'Narin', 'Srisuk', 'narin-srisuk', 'NarinBuckets', 'PG',
      '20000000-0000-4000-8000-000000000001', '1998-02-14',
      184, 78, 'Thailand', 'Bangkok', 'Chulalongkorn University', null, true
    ),
    (
      '30000000-0000-4000-8000-000000000002',
      'Kiet Wattanakul', 'Kiet', 'Wattanakul', 'kiet-wattanakul', 'KietBoards', 'PF',
      '20000000-0000-4000-8000-000000000001', '1996-09-08',
      198, 96, 'Thailand', 'Nonthaburi', 'Kasetsart University', null, true
    ),
    (
      '30000000-0000-4000-8000-000000000003',
      'Thanawat Jaiyen', 'Thanawat', 'Jaiyen', 'thanawat-jaiyen', 'ThanawatThree', 'SG',
      '20000000-0000-4000-8000-000000000002', '1999-06-21',
      188, 82, 'Thailand', 'Chiang Mai', 'Chiang Mai University', null, true
    ),
    (
      '30000000-0000-4000-8000-000000000004',
      'Anucha Khamdee', 'Anucha', 'Khamdee', 'anucha-khamdee', 'AnuchaPaint', 'C',
      '20000000-0000-4000-8000-000000000002', '1995-12-02',
      203, 104, 'Thailand', 'Lamphun', 'Maejo University', null, true
    ),
    (
      '30000000-0000-4000-8000-000000000005',
      'Kittipong Saelim', 'Kittipong', 'Saelim', 'kittipong-saelim', 'KittipongWave', 'SF',
      '20000000-0000-4000-8000-000000000003', '1997-04-17',
      193, 88, 'Thailand', 'Phuket', 'Prince of Songkla University', null, true
    ),
    (
      '30000000-0000-4000-8000-000000000006',
      'Chaiwat Rattanapong', 'Chaiwat', 'Rattanapong', 'chaiwat-rattanapong', 'ChaiwatHandles', 'PG',
      '20000000-0000-4000-8000-000000000003', '2000-01-29',
      181, 76, 'Thailand', 'Phang Nga', 'Thammasat University', null, true
    ),
    (
      '30000000-0000-4000-8000-000000000007',
      'Pakorn Boonmee', 'Pakorn', 'Boonmee', 'pakorn-boonmee', 'PakornThunder', 'SG',
      '20000000-0000-4000-8000-000000000004', '1998-08-11',
      187, 83, 'Thailand', 'Khon Kaen', 'Khon Kaen University', null, true
    ),
    (
      '30000000-0000-4000-8000-000000000008',
      'Teerapat Pholsena', 'Teerapat', 'Pholsena', 'teerapat-pholsena', 'TeerapatRim', 'C',
      '20000000-0000-4000-8000-000000000004', '1996-03-05',
      205, 108, 'Thailand', 'Udon Thani', 'Mahasarakham University', null, true
    )
  on conflict (id) do update set
    name = excluded.name,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    slug = excluded.slug,
    roblox_username = excluded.roblox_username,
    position = excluded.position,
    team_id = excluded.team_id,
    birth_date = excluded.birth_date,
    height_cm = excluded.height_cm,
    weight_kg = excluded.weight_kg,
    nationality = excluded.nationality,
    hometown = excluded.hometown,
    college = excluded.college,
    avatar_url = excluded.avatar_url,
    is_active = excluded.is_active;

  insert into public.rosters (
    id, season_id, team_id, player_id, jersey_number, position,
    status, is_captain, joined_on
  )
  values
    ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 4,  'PG', 'active', true,  '2026-01-05'),
    ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 23, 'PF', 'active', false, '2026-01-05'),
    ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 11, 'SG', 'active', true,  '2026-01-06'),
    ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', 34, 'C',  'active', false, '2026-01-06'),
    ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005', 8,  'SF', 'active', true,  '2026-01-07'),
    ('40000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000006', 2,  'PG', 'active', false, '2026-01-07'),
    ('40000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000007', 7,  'SG', 'active', true,  '2026-01-08'),
    ('40000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000008', 15, 'C',  'active', false, '2026-01-08')
  on conflict (id) do update set
    season_id = excluded.season_id,
    team_id = excluded.team_id,
    player_id = excluded.player_id,
    jersey_number = excluded.jersey_number,
    position = excluded.position,
    status = excluded.status,
    is_captain = excluded.is_captain,
    joined_on = excluded.joined_on,
    left_on = null;

  insert into public.games (
    id, season_id, game_number, round_number, scheduled_at, venue, status,
    home_team_id, away_team_id, home_score, away_score,
    home_period_scores, away_period_scores, broadcast_name, stream_url, highlights_url
  )
  values
    (
      '50000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001', 1, 1,
      '2026-07-01 19:00:00+07', 'PBL Arena Bangkok', 'final',
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002', 82, 76,
      array[20,21,18,23]::smallint[], array[18,20,17,21]::smallint[],
      'PBL Live', null, null
    ),
    (
      '50000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001', 2, 1,
      '2026-07-08 19:00:00+07', 'Phuket Municipal Gym', 'final',
      '20000000-0000-4000-8000-000000000003',
      '20000000-0000-4000-8000-000000000004', 91, 88,
      array[22,25,21,23]::smallint[], array[20,24,22,22]::smallint[],
      'PBL Live', null, null
    ),
    (
      '50000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000001', 3, 2,
      '2026-07-15 19:00:00+07', 'PBL Arena Bangkok', 'final',
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000003', 79, 84,
      array[19,20,18,22]::smallint[], array[21,20,22,21]::smallint[],
      'PBL Live', null, null
    ),
    (
      '50000000-0000-4000-8000-000000000004',
      '10000000-0000-4000-8000-000000000001', 4, 2,
      '2026-08-02 18:00:00+07', 'Chiang Mai Sports Hall', 'scheduled',
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000004', null, null,
      null, null, 'PBL Live', null, null
    ),
    (
      '50000000-0000-4000-8000-000000000005',
      '10000000-0000-4000-8000-000000000001', 5, 3,
      '2026-08-09 18:00:00+07', 'Phuket Municipal Gym', 'scheduled',
      '20000000-0000-4000-8000-000000000003',
      '20000000-0000-4000-8000-000000000002', null, null,
      null, null, 'PBL Live', null, null
    )
  on conflict (id) do update set
    season_id = excluded.season_id,
    game_number = excluded.game_number,
    round_number = excluded.round_number,
    scheduled_at = excluded.scheduled_at,
    venue = excluded.venue,
    status = excluded.status,
    home_team_id = excluded.home_team_id,
    away_team_id = excluded.away_team_id,
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    home_period_scores = excluded.home_period_scores,
    away_period_scores = excluded.away_period_scores,
    broadcast_name = excluded.broadcast_name,
    stream_url = excluded.stream_url,
    highlights_url = excluded.highlights_url;

  -- Every points total below adds up exactly to its game's team score. Shooting,
  -- rebound and roster relationships also satisfy the migration constraints.
  insert into public.player_game_stats (
    id, game_id, player_id, team_id, is_starter, did_play, minutes,
    points, rebounds, offensive_rebounds, defensive_rebounds, assists,
    steals, blocks, turnovers, personal_fouls,
    field_goals_made, field_goals_attempted,
    three_pointers_made, three_pointers_attempted,
    free_throws_made, free_throws_attempted, plus_minus
  )
  values
    -- Game 1: Bangkok 82, Chiang Mai 76
    ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', true, true, 40, 44, 7, 2, 5, 8, 2, 0, 3, 2, 15, 26, 6, 11, 8, 9,  8),
    ('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', true, true, 40, 38,10, 4, 6, 3, 1, 2, 2, 3, 14, 24, 4,  8, 6, 8,  4),
    ('60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', true, true, 40, 40, 6, 1, 5, 6, 2, 0, 4, 2, 14, 25, 5, 10, 7, 8, -5),
    ('60000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', true, true, 40, 36,12, 5, 7, 2, 0, 3, 2, 4, 13, 22, 3,  6, 7, 9, -7),
    -- Game 2: Phuket 91, Khon Kaen 88
    ('60000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', true, true, 40, 48, 8, 2, 6, 7, 3, 1, 2, 2, 17, 28, 6, 11, 8,10,  6),
    ('60000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', true, true, 40, 43, 5, 1, 4,10, 2, 0, 3, 3, 15, 27, 5, 10, 8, 9,  2),
    ('60000000-0000-4000-8000-000000000007', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000004', true, true, 40, 46, 7, 2, 5, 5, 2, 0, 3, 2, 16, 27, 5, 10, 9,11, -2),
    ('60000000-0000-4000-8000-000000000008', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000004', true, true, 40, 42,13, 5, 8, 4, 1, 4, 2, 4, 15, 25, 4,  8, 8,10, -4),
    -- Game 3: Bangkok 79, Phuket 84
    ('60000000-0000-4000-8000-000000000009', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', true, true, 40, 39, 6, 1, 5, 9, 2, 0, 4, 3, 13, 25, 5, 10, 8,10, -3),
    ('60000000-0000-4000-8000-000000000010', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', true, true, 40, 40,11, 4, 7, 4, 1, 2, 3, 3, 15, 26, 4,  9, 6, 8, -7),
    ('60000000-0000-4000-8000-000000000011', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', true, true, 40, 45, 9, 3, 6, 6, 1, 1, 3, 2, 16, 27, 5, 10, 8,10,  7),
    ('60000000-0000-4000-8000-000000000012', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', true, true, 40, 39, 4, 1, 3,11, 3, 0, 2, 2, 14, 24, 4,  8, 7, 8,  3)
  on conflict (id) do update set
    game_id = excluded.game_id,
    player_id = excluded.player_id,
    team_id = excluded.team_id,
    is_starter = excluded.is_starter,
    did_play = excluded.did_play,
    minutes = excluded.minutes,
    points = excluded.points,
    rebounds = excluded.rebounds,
    offensive_rebounds = excluded.offensive_rebounds,
    defensive_rebounds = excluded.defensive_rebounds,
    assists = excluded.assists,
    steals = excluded.steals,
    blocks = excluded.blocks,
    turnovers = excluded.turnovers,
    personal_fouls = excluded.personal_fouls,
    field_goals_made = excluded.field_goals_made,
    field_goals_attempted = excluded.field_goals_attempted,
    three_pointers_made = excluded.three_pointers_made,
    three_pointers_attempted = excluded.three_pointers_attempted,
    free_throws_made = excluded.free_throws_made,
    free_throws_attempted = excluded.free_throws_attempted,
    plus_minus = excluded.plus_minus;

  insert into public.news_posts (
    id, title, slug, excerpt, content, category, tags,
    cover_image_url, author_id, status, is_featured, published_at
  )
  values
    (
      '70000000-0000-4000-8000-000000000001',
      'เปิดฤดูกาล PBL 2026 อย่างเป็นทางการ',
      'pbl-2026-season-tipoff',
      'สี่สโมสรพร้อมลงแข่งขันตลอดฤดูกาล 2026',
      'PBL ประกาศโปรแกรมฤดูกาล 2026 พร้อมการแข่งขัน เหย้า–เยือน ข่าวสาร และสถิติอย่างเป็นทางการบนเว็บไซต์ลีก',
      'League', array['PBL','Season 2026'], null, null,
      'published', true, '2026-06-25 10:00:00+07'
    ),
    (
      '70000000-0000-4000-8000-000000000002',
      'Phuket Waves ขึ้นนำตารางหลังผ่านสองเกม',
      'phuket-waves-lead-after-two-games',
      'เกมรุกที่สมดุลพาทีมจากภูเก็ตเก็บชัยชนะสองนัดติดต่อกัน',
      'Phuket Waves เก็บชัยชนะเหนือ Khon Kaen Thunder และ Bangkok Guardians พร้อมขึ้นนำตารางคะแนน PBL 2026',
      'Match Report', array['Phuket Waves','Standings'], null, null,
      'published', false, '2026-07-16 09:00:00+07'
    ),
    (
      '70000000-0000-4000-8000-000000000003',
      'โปรแกรมสัปดาห์ถัดไป: Falcons พบ Thunder',
      'falcons-vs-thunder-preview',
      'สองทีมเตรียมลุ้นชัยชนะนัดแรกของฤดูกาล',
      'Chiang Mai Falcons จะเปิดบ้านรับ Khon Kaen Thunder ในเกมหมายเลข 4 วันที่ 2 สิงหาคม 2026',
      'Preview', array['Chiang Mai Falcons','Khon Kaen Thunder'], null, null,
      'published', false, '2026-07-27 12:00:00+07'
    )
  on conflict (id) do update set
    title = excluded.title,
    slug = excluded.slug,
    excerpt = excluded.excerpt,
    content = excluded.content,
    category = excluded.category,
    tags = excluded.tags,
    cover_image_url = excluded.cover_image_url,
    author_id = excluded.author_id,
    status = excluded.status,
    is_featured = excluded.is_featured,
    published_at = excluded.published_at;

  insert into public.accolades (
    id, season_id, player_id, team_id, title, category,
    description, awarded_on, sort_order, is_public
  )
  values
    (
      '80000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000005',
      '20000000-0000-4000-8000-000000000003',
      'Player of the Week', 'Weekly Award',
      'Kittipong Saelim averaged 46.5 points across two wins.',
      '2026-07-20', 1, true
    ),
    (
      '80000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      'Bangkok Assist Leader – July', 'Monthly Leader',
      'Narin Srisuk led Bangkok Guardians in assists per game during July.',
      '2026-07-27', 2, true
    )
  on conflict (id) do update set
    season_id = excluded.season_id,
    player_id = excluded.player_id,
    team_id = excluded.team_id,
    title = excluded.title,
    category = excluded.category,
    description = excluded.description,
    awarded_on = excluded.awarded_on,
    sort_order = excluded.sort_order,
    is_public = excluded.is_public;

  -- Replace example.com URLs with the league's verified production accounts.
  insert into public.league_links (
    id, label, url, kind, description, icon, sort_order, is_active, opens_in_new_tab
  )
  values
    (
      '90000000-0000-4000-8000-000000000001',
      'Watch PBL Live', 'https://example.com/pbl/live', 'stream',
      'Live games and replays', 'play', 1, true, true
    ),
    (
      '90000000-0000-4000-8000-000000000002',
      'League Facebook', 'https://example.com/pbl/facebook', 'social',
      'Official announcements and community updates', 'facebook', 2, true, true
    ),
    (
      '90000000-0000-4000-8000-000000000003',
      'Competition Rules', 'https://example.com/pbl/rules.pdf', 'document',
      'PBL 2026 competition regulations', 'file-text', 3, true, true
    ),
    (
      '90000000-0000-4000-8000-000000000004',
      'Contact the League', 'https://example.com/pbl/contact', 'contact',
      'General and media enquiries', 'mail', 4, true, false
    )
  on conflict (id) do update set
    label = excluded.label,
    url = excluded.url,
    kind = excluded.kind,
    description = excluded.description,
    icon = excluded.icon,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    opens_in_new_tab = excluded.opens_in_new_tab;

  -- Fictional directory entries for local/demo use. Replace names and usernames
  -- before production launch; auth profiles and public staff entries are separate.
  insert into public.staff_members (
    id, display_name, role, department, roblox_username,
    avatar_url, sort_order, is_active
  )
  values
    (
      'a0000000-0000-4000-8000-000000000001',
      'Alex Chantarat', 'League Commissioner', 'League Office',
      'AlexPBL', null, 1, true
    ),
    (
      'a0000000-0000-4000-8000-000000000002',
      'Maya Rattanakorn', 'Competition Director', 'Basketball Operations',
      'MayaHoops', null, 2, true
    ),
    (
      'a0000000-0000-4000-8000-000000000003',
      'Korn Phisut', 'Head Statistician', 'Statistics',
      'KornStats', null, 3, true
    ),
    (
      'a0000000-0000-4000-8000-000000000004',
      'Nina Viroj', 'Media Manager', 'Communications',
      'NinaPBL', null, 4, true
    )
  on conflict (id) do update set
    display_name = excluded.display_name,
    role = excluded.role,
    department = excluded.department,
    roblox_username = excluded.roblox_username,
    avatar_url = excluded.avatar_url,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

  commit;
