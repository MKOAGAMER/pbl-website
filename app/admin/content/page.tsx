import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Link2, Newspaper, Users } from 'lucide-react';
import { requireAdminPermission } from '@/lib/admin-auth';
import { ConfirmSubmitButton } from '../ConfirmSubmitButton';
import { ImageUploadField } from '../ImageUploadField';
import { SubmitButton } from '../SubmitButton';
import { deleteLeagueLink, deleteNewsPost, deleteStaffMember, saveLeagueLink, saveNewsPost, saveStaffMember } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Content Studio', robots: { index: false, follow: false } };

type Row = Record<string, unknown>;
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };
const value = (input: unknown) => typeof input === 'string' ? input : '';
const bool = (input: unknown) => input === true;
const numberValue = (input: unknown) => typeof input === 'number' ? input : Number(input ?? 0);

export default async function ContentStudioPage({ searchParams }: Props) {
  const [{ supabase }, params] = await Promise.all([requireAdminPermission('editor'), searchParams]);
  const [newsResult, staffResult, linksResult] = await Promise.all([
    supabase.from('news_posts').select('id, title, excerpt, content, category, cover_image_url, status, is_featured, published_at').order('updated_at', { ascending: false }),
    supabase.from('staff_members').select('id, display_name, role, department, roblox_username, avatar_url, sort_order, is_active').order('sort_order'),
    supabase.from('league_links').select('id, label, url, kind, description, sort_order, is_active').order('sort_order'),
  ]);
  const news = (newsResult.data ?? []) as Row[];
  const staff = (staffResult.data ?? []) as Row[];
  const links = (linksResult.data ?? []) as Row[];

  return <main className="site-shell py-10 sm:py-14">
    <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)] hover:text-[var(--orange-soft)]"><ArrowLeft className="h-4 w-4" /> Staff Control</Link>
    <div className="mt-7 border-b border-[var(--line)] pb-7"><p className="eyebrow">Publishing desk</p><h1 className="display-type mt-4 text-5xl sm:text-6xl">Content Studio</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">Publish news, maintain the public league staff directory and control every external link without editing code.</p></div>
    {params.saved && <p role="status" className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">Content saved and published pages refreshed.</p>}
    {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">Unable to save. Check the fields and try again.</p>}

    <div className="mt-8 space-y-8">
      <StudioSection icon={Newspaper} title="Newsroom" description="Draft, publish, feature, archive or delete league stories.">
        <Record title="Create story" meta="New draft">
          <NewsForm />
        </Record>
        {news.map((item) => <Record key={value(item.id)} title={value(item.title)} meta={`${value(item.status)}${bool(item.is_featured) ? ' · Featured' : ''}`}>
          <NewsForm item={item} />
          <DeleteForm action={deleteNewsPost} id={value(item.id)} message={`Delete “${value(item.title)}” permanently?`} label="Delete story" />
        </Record>)}
      </StudioSection>

      <StudioSection icon={Users} title="Public staff directory" description="Manage names, roles, departments, Roblox usernames and real profile images.">
        <Record title="Add staff member" meta="New public profile"><StaffForm /></Record>
        {staff.map((item) => <Record key={value(item.id)} title={value(item.display_name)} meta={`${value(item.department) || 'League Office'} · ${bool(item.is_active) ? 'Published' : 'Hidden'}`}>
          <StaffForm item={item} />
          <DeleteForm action={deleteStaffMember} id={value(item.id)} message={`Delete ${value(item.display_name)} from the public directory?`} label="Delete staff member" />
        </Record>)}
      </StudioSection>

      <StudioSection icon={Link2} title="League links" description="Control Discord, Roblox, broadcasts, sponsors, documents and contact destinations.">
        <Record title="Add league link" meta="New destination"><LinkForm /></Record>
        {links.map((item) => <Record key={value(item.id)} title={value(item.label)} meta={`${value(item.kind)} · ${bool(item.is_active) ? 'Visible' : 'Hidden'}`}>
          <LinkForm item={item} />
          <DeleteForm action={deleteLeagueLink} id={value(item.id)} message={`Delete the ${value(item.label)} link?`} label="Delete link" />
        </Record>)}
      </StudioSection>
    </div>
  </main>;
}

function NewsForm({ item }: { item?: Row }) { return <form action={saveNewsPost} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="id" value={value(item?.id)} /><Input name="title" label="Headline" defaultValue={value(item?.title)} required wide /><Input name="category" label="Category" defaultValue={value(item?.category) || 'League'} required /><Select name="status" label="Status" defaultValue={value(item?.status) || 'draft'}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></Select><Textarea name="excerpt" label="Summary" defaultValue={value(item?.excerpt)} wide /><Textarea name="content" label="Story content" defaultValue={value(item?.content)} rows={10} required wide /><ImageUploadField name="cover_url" label="Cover image" initialValue={value(item?.cover_image_url)} /><Checkbox name="is_featured" label="Feature this story" defaultChecked={bool(item?.is_featured)} /><div className="sm:col-span-2"><SubmitButton>{item ? 'Save story' : 'Create story'}</SubmitButton></div></form>; }
function StaffForm({ item }: { item?: Row }) { return <form action={saveStaffMember} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="id" value={value(item?.id)} /><Input name="display_name" label="Display name" defaultValue={value(item?.display_name)} required /><Input name="role" label="Role / title" defaultValue={value(item?.role)} required /><Input name="department" label="Department" defaultValue={value(item?.department)} /><Input name="roblox_username" label="Roblox username" defaultValue={value(item?.roblox_username)} /><Input name="sort_order" label="Display order" type="number" min="0" defaultValue={numberValue(item?.sort_order)} /><Checkbox name="is_active" label="Publish profile" defaultChecked={item ? bool(item.is_active) : true} /><ImageUploadField name="avatar_url" label="Profile image" initialValue={value(item?.avatar_url)} /><div className="sm:col-span-2"><SubmitButton>{item ? 'Save staff member' : 'Add staff member'}</SubmitButton></div></form>; }
function LinkForm({ item }: { item?: Row }) { return <form action={saveLeagueLink} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="id" value={value(item?.id)} /><Input name="label" label="Label" defaultValue={value(item?.label)} required /><Input name="url" label="URL" type="url" defaultValue={value(item?.url)} required /><Select name="kind" label="Type" defaultValue={value(item?.kind) || 'other'}><option value="social">Social</option><option value="stream">Stream</option><option value="sponsor">Sponsor</option><option value="document">Document</option><option value="contact">Contact</option><option value="other">Other</option></Select><Input name="sort_order" label="Display order" type="number" min="0" defaultValue={numberValue(item?.sort_order)} /><Textarea name="description" label="Description" defaultValue={value(item?.description)} wide /><Checkbox name="is_active" label="Show link" defaultChecked={item ? bool(item.is_active) : true} /><div className="sm:col-span-2"><SubmitButton>{item ? 'Save link' : 'Add link'}</SubmitButton></div></form>; }
function StudioSection({ icon: Icon, title, description, children }: { icon: typeof Newspaper; title: string; description: string; children: React.ReactNode }) { return <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><div className="mb-5 flex gap-3"><Icon className="mt-0.5 h-5 w-5 text-[var(--orange-soft)]" /><div><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">{description}</p></div></div><div className="space-y-3">{children}</div></section>; }
function Record({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) { return <details className="admin-record"><summary>{title}<span className="ml-2 text-xs font-medium text-[var(--ink-faint)]">{meta}</span></summary><div className="mt-4 space-y-3">{children}</div></details>; }
function DeleteForm({ action, id, message, label }: { action: (formData: FormData) => Promise<void>; id: string; message: string; label: string }) { return <form action={action}><input type="hidden" name="id" value={id} /><ConfirmSubmitButton message={message}>{label}</ConfirmSubmitButton></form>; }
function Input({ label, wide, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span><input {...props} className="admin-input" /></label>; }
function Textarea({ label, wide, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span><textarea {...props} className="admin-input py-3" /></label>; }
function Select({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) { return <label><span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span><select {...props} className="admin-input">{children}</select></label>; }
function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-[var(--ink-soft)]"><input {...props} type="checkbox" /> {label}</label>; }
