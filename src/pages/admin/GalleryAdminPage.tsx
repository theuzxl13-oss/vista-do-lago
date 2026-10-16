import { useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { Button, Checkbox, ConfirmDialog, EmptyState, ErrorBox, Field, Input, Modal, Select, Spinner } from '@/components/ui'
import { PageHeader } from '@/components/admin/common'
import { MediaBadge } from '@/components/site/Gallery'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { backend, toAppError } from '@/services/backend'
import { MEDIA_CATEGORY_LABEL } from '@/lib/constants'
import { assetUrl } from '@/lib/format'
import type { MediaCategory, MediaItem } from '@/types'

export default function GalleryAdminPage() {
  const toast = useToast()
  const media = useAsync(() => backend.list('media', { order: { column: 'sort_order' } }))
  const items = (media.data ?? []).filter((m) => !m.lot_id)
  const [edit, setEdit] = useState<MediaItem | null>(null)
  const [remove, setRemove] = useState<MediaItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      let order = items.reduce((a, m) => Math.max(a, m.sort_order), 0)
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: tamanho máximo de 10 MB.`)
        const { url, path } = await backend.uploadFile(file, 'gallery')
        await backend.insert('media', {
          url, storage_path: path || null, title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
          category: 'landscape', is_illustrative: false, published: false, sort_order: ++order,
        })
      }
      toast('Imagens enviadas como rascunho. Revise título e categoria e publique.')
      await media.reload()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const patch = async (m: MediaItem, p: Partial<MediaItem>) => {
    try {
      await backend.update('media', m.id, p)
      await media.reload()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    }
  }

  const move = async (index: number, dir: -1 | 1) => {
    const a = items[index], b = items[index + dir]
    if (!a || !b) return
    try {
      await Promise.all([
        backend.update('media', a.id, { sort_order: b.sort_order === a.sort_order ? a.sort_order + dir : b.sort_order }),
        backend.update('media', b.id, { sort_order: a.sort_order }),
      ])
      await media.reload()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    }
  }

  const doRemove = async () => {
    if (!remove) return
    setBusy(true)
    try {
      await backend.remove('media', remove.id)
      if (remove.storage_path) await backend.deleteFile(remove.storage_path).catch(() => undefined)
      toast('Imagem excluída.')
      setRemove(null)
      await media.reload()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Galeria" description="Adicione, organize e publique as imagens do site. Identifique sempre se a imagem é real ou ilustrativa."
        actions={
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-600">
            <ImagePlus className="h-4 w-4" /> {uploading ? 'Enviando…' : 'Enviar imagens'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" disabled={uploading} onChange={(e) => void upload(e.target.files)} />
          </label>
        } />
      {media.error && <ErrorBox message={media.error} onRetry={media.reload} />}
      {media.loading && !media.data ? <Spinner /> : items.length === 0 ? <EmptyState title="Nenhuma imagem" description="Envie fotos aéreas, do lago, dos acessos e perspectivas." /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((m, i) => (
            <div key={m.id} className="overflow-hidden rounded-xl border border-sand-300/70 bg-white shadow-card">
              <div className="relative aspect-[4/3] bg-sand">
                <img src={assetUrl(m.url)} alt={m.title} loading="lazy" className={`h-full w-full object-cover ${m.published ? '' : 'opacity-50 grayscale'}`} />
                <MediaBadge item={m} className="absolute left-2 top-2" />
                {!m.published && <span className="absolute right-2 top-2 rounded-full bg-graphite/80 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Rascunho</span>}
              </div>
              <div className="p-3">
                <p className="truncate font-semibold text-forest">{m.title}</p>
                <p className="text-xs text-graphite-400">{MEDIA_CATEGORY_LABEL[m.category]} · posição {i + 1}</p>
                <div className="mt-2 flex items-center gap-1">
                  <IconBtn label="Mover para cima" onClick={() => void move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Mover para baixo" onClick={() => void move(i, 1)} disabled={i === items.length - 1}><ArrowDown className="h-4 w-4" /></IconBtn>
                  <IconBtn label={m.published ? 'Ocultar do site' : 'Publicar'} onClick={() => void patch(m, { published: !m.published })}>{m.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</IconBtn>
                  <IconBtn label="Editar" onClick={() => setEdit(m)}><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Excluir" onClick={() => setRemove(m)} danger><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <MediaModal item={edit} onClose={() => setEdit(null)} onSave={async (p) => { if (edit) { await patch(edit, p); setEdit(null) } }} />
      <ConfirmDialog open={!!remove} danger loading={busy} title="Excluir imagem" confirmLabel="Excluir" message="A imagem será removida da galeria e do armazenamento." onConfirm={() => void doRemove()} onClose={() => setRemove(null)} />
    </>
  )
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} aria-label={label}
      className={`rounded-md p-1.5 text-graphite-400 hover:bg-sand disabled:opacity-30 ${danger ? 'hover:text-red-600' : 'hover:text-forest'}`}>{children}</button>
  )
}

function MediaModal({ item, onClose, onSave }: { item: MediaItem | null; onClose: () => void; onSave: (p: Partial<MediaItem>) => Promise<void> }) {
  const [f, setF] = useState({ title: '', caption: '', category: 'landscape' as MediaCategory, is_illustrative: false, published: true })
  const [key, setKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (item && item.id !== key) {
    setKey(item.id)
    setF({ title: item.title, caption: item.caption ?? '', category: item.category, is_illustrative: item.is_illustrative, published: item.published })
  }
  if (!item && key) setKey(null)
  return (
    <Modal open={!!item} onClose={onClose} title="Editar imagem"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button loading={busy} disabled={!f.title.trim()} onClick={async () => { setBusy(true); await onSave({ ...f, title: f.title.trim(), caption: f.caption.trim() || null }); setBusy(false) }}>Salvar</Button></>}>
      <div className="space-y-4">
        <Field label="Título" required><Input value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Legenda"><Input value={f.caption} maxLength={600} onChange={(e) => setF({ ...f, caption: e.target.value })} /></Field>
        <Field label="Categoria">
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as MediaCategory })}>
            {(Object.keys(MEDIA_CATEGORY_LABEL) as MediaCategory[]).map((c) => <option key={c} value={c}>{MEDIA_CATEGORY_LABEL[c]}</option>)}
          </Select>
        </Field>
        <Checkbox checked={f.is_illustrative} onChange={(e) => setF({ ...f, is_illustrative: e.target.checked })} label="Imagem ilustrativa (renderização, montagem ou imagem conceitual — não é foto real do local)" />
        <Checkbox checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} label="Publicada no site" />
      </div>
    </Modal>
  )
}
