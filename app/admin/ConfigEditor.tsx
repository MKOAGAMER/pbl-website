'use client';

import { useState } from 'react';
import { Link2, Palette, Plus, Settings2, Trash2, Users } from 'lucide-react';
import type { LinkConfigItem, SiteConfig, StaffConfigItem } from '@/lib/pbal-types';
import { updateSiteConfig } from './actions';
import { SubmitButton } from './SubmitButton';

export function ConfigEditor({ config }: { config: SiteConfig }) {
  const [staff, setStaff] = useState<StaffConfigItem[]>(config.staff);
  const [links, setLinks] = useState<LinkConfigItem[]>(config.links);
  const [addonsText, setAddonsText] = useState(JSON.stringify(config.addons, null, 2));
  const [addonsError, setAddonsError] = useState('');

  function normalizeAddons() {
    try {
      const parsed = JSON.parse(addonsText) as unknown;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error();
      setAddonsError('');
      return JSON.stringify(parsed);
    } catch {
      setAddonsError('Addons must be a valid JSON object.');
      return null;
    }
  }

  return (
    <form
      action={updateSiteConfig}
      onSubmit={(event) => {
        const normalized = normalizeAddons();
        if (!normalized) event.preventDefault();
        else {
          const field = event.currentTarget.elements.namedItem('addons_json') as HTMLInputElement;
          field.value = normalized;
        }
      }}
      className="space-y-7"
    >
      <input type="hidden" name="staff_json" value={JSON.stringify(staff)} />
      <input type="hidden" name="links_json" value={JSON.stringify(links)} />
      <input type="hidden" name="addons_json" value={JSON.stringify(config.addons)} />

      <Panel icon={Palette} title="Theme" description="These colors become global CSS variables on every open page.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Mode">
            <select name="theme_mode" defaultValue={config.theme.mode} className="admin-input">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </Field>
          <ColorField name="theme_primary" label="Primary" value={config.theme.primary} />
          <ColorField name="theme_secondary" label="Secondary" value={config.theme.secondary} />
          <ColorField name="theme_background" label="Background" value={config.theme.background} />
          <ColorField name="theme_surface" label="Surface" value={config.theme.surface} />
          <ColorField name="theme_foreground" label="Foreground" value={config.theme.foreground} />
        </div>
      </Panel>

      <Panel icon={Users} title="Staff list" description="Public staff data managed independently from login permissions.">
        <div className="space-y-3">
          {staff.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3 md:grid-cols-2">
              <input aria-label="Staff name" placeholder="Name" value={item.name} onChange={(e) => setStaffValue(setStaff, index, 'name', e.target.value)} className="admin-input" />
              <input aria-label="Staff title" placeholder="Role / title" value={item.title} onChange={(e) => setStaffValue(setStaff, index, 'title', e.target.value)} className="admin-input" />
              <input aria-label="Roblox username" placeholder="Roblox username" value={item.robloxUsername ?? ''} onChange={(e) => setStaffValue(setStaff, index, 'robloxUsername', e.target.value)} className="admin-input" />
              <div className="flex gap-2">
                <input aria-label="Staff avatar URL" type="url" placeholder="Avatar URL" value={item.avatarUrl ?? ''} onChange={(e) => setStaffValue(setStaff, index, 'avatarUrl', e.target.value)} className="admin-input" />
                <RemoveButton onClick={() => setStaff((items) => items.filter((_, itemIndex) => itemIndex !== index))} label="Remove staff member" />
              </div>
            </div>
          ))}
          <AddButton onClick={() => setStaff((items) => [...items, { name: '', title: '' }])}>Add staff member</AddButton>
        </div>
      </Panel>

      <Panel icon={Link2} title="Links" description="Community, Discord, Roblox and broadcast destinations.">
        <div className="space-y-3">
          {links.map((item, index) => (
            <div key={index} className="flex gap-2 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3">
              <input aria-label="Link label" placeholder="Label" value={item.label} onChange={(e) => setLinkValue(setLinks, index, 'label', e.target.value)} className="admin-input max-w-48" />
              <input aria-label="Link URL" type="url" placeholder="https://..." value={item.url} onChange={(e) => setLinkValue(setLinks, index, 'url', e.target.value)} className="admin-input" />
              <RemoveButton onClick={() => setLinks((items) => items.filter((_, itemIndex) => itemIndex !== index))} label="Remove link" />
            </div>
          ))}
          <AddButton onClick={() => setLinks((items) => [...items, { label: '', url: '' }])}>Add link</AddButton>
        </div>
      </Panel>

      <Panel icon={Settings2} title="Addons" description="Feature flags and small addon settings as a JSON object.">
        <textarea
          value={addonsText}
          onChange={(event) => setAddonsText(event.target.value)}
          rows={7}
          spellCheck={false}
          className="admin-input py-3 font-mono text-xs"
        />
        {addonsError && <p role="alert" className="mt-2 text-sm text-red-300">{addonsError}</p>}
      </Panel>

      <div className="sticky bottom-4 flex justify-end rounded-2xl border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] p-3 shadow-[var(--shadow)] backdrop-blur-xl">
        <SubmitButton>Save & publish</SubmitButton>
      </div>
    </form>
  );
}

function Panel({ icon: Icon, title, description, children }: { icon: typeof Palette; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="mb-5 flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--orange-soft)]" />
        <div><h2 className="font-black">{title}</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">{description}</p></div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block text-xs font-bold text-[var(--ink-soft)]">{label}</span>{children}</label>;
}

function ColorField({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <Field label={label}>
      <span className="flex items-center gap-2">
        <input type="color" name={name} defaultValue={value} className="h-11 w-14 cursor-pointer rounded-lg border border-[var(--line)] bg-transparent p-1" />
        <span className="font-mono text-xs text-[var(--ink-faint)]">{value}</span>
      </span>
    </Field>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-xs font-black"><Plus className="h-4 w-4" />{children}</button>;
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} aria-label={label} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-red-400/20 text-red-300"><Trash2 className="h-4 w-4" /></button>;
}

function setStaffValue(setter: React.Dispatch<React.SetStateAction<StaffConfigItem[]>>, index: number, key: keyof StaffConfigItem, value: string) {
  setter((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value || undefined } : item));
}

function setLinkValue(setter: React.Dispatch<React.SetStateAction<LinkConfigItem[]>>, index: number, key: keyof LinkConfigItem, value: string) {
  setter((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
}

