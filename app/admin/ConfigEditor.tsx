'use client';

import { useState } from 'react';
import { Palette, Settings2 } from 'lucide-react';
import type { SiteConfig } from '@/lib/pbal-types';
import { updateSiteConfig } from './actions';
import { SubmitButton } from './SubmitButton';

export function ConfigEditor({ config }: { config: SiteConfig }) {
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
      <input type="hidden" name="staff_json" value={JSON.stringify(config.staff)} />
      <input type="hidden" name="links_json" value={JSON.stringify(config.links)} />
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

