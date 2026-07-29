export type UserRole = 'guest' | 'player' | 'staff' | 'admin';
export type AdminPermission = 'editor' | 'staff' | 'super_admin';

export type PbalUser = {
  id: string;
  robloxId: string;
  username: string;
  avatarUrl: string | null;
  role: UserRole;
  groupMember: boolean;
  adminPermission: AdminPermission | null;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatarUrl: string | null;
};

export type ThemeConfig = {
  mode: 'dark' | 'light' | 'system';
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  foreground: string;
};

export type StaffConfigItem = {
  name: string;
  title: string;
  robloxUsername?: string;
  avatarUrl?: string;
};

export type LinkConfigItem = {
  label: string;
  url: string;
};

export type SiteConfig = {
  id: 'main';
  theme: ThemeConfig;
  staff: StaffConfigItem[];
  links: LinkConfigItem[];
  addons: Record<string, boolean | string | number>;
  updatedAt?: string;
};

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  id: 'main',
  theme: {
    mode: 'dark',
    primary: '#ff6b22',
    secondary: '#5277ff',
    background: '#0b0f16',
    surface: '#111722',
    foreground: '#f6f2e9',
  },
  staff: [],
  links: [],
  addons: {},
};
