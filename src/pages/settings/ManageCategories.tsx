import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import { useAppStore } from '../../store/app.store'
import { useAuthStore } from '../../store/auth.store'
import { phpApiRequest } from '../../lib/api'
import { useToast } from '../../components/Toast'
import type { Category } from '../../types/database'
import ConfirmModal from '../../components/ConfirmModal'
import { StackContent, StackHeader } from '../../components/app-header'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { IconButton } from '../../components/ui/icon-button'
import { Badge } from '../../components/ui/misc'
import { fieldClass } from '../../lib/formStyles'
import { cn } from '../../lib/cn'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  '#14b8a6', '#64748b',
]

interface EditState {
  id: number
  name: string
  color: string
  icon: string
}

export default function ManageCategories() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { categories, setCategories, addCategory, updateCategory, removeCategory } = useAppStore()
  const { showToast } = useToast()

  useEffect(() => {
    if (categories.length === 0 && user?.id) {
      phpApiRequest(`categories.php?user_id=${user.id}`, { method: 'GET' })
        .then(setCategories)
        .catch(() => showToast('Erro ao carregar categorias.', 'error'))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const defaultCats = categories.filter((c) => c.is_default)
  const personalCats = categories.filter((c) => !c.is_default)

  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📦')
  const [newColor, setNewColor] = useState('#6366f1')
  const [isSavingNew, setIsSavingNew] = useState(false)

  const [editState, setEditState] = useState<EditState | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [deletingCat, setDeletingCat] = useState<Category | null>(null)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsSavingNew(true)
    try {
      const created: Category = await phpApiRequest('categories.php', {
        method: 'POST',
        body: JSON.stringify({ user_id: user?.id, name: newName.trim(), color: newColor, icon: newIcon }),
      })
      addCategory(created)
      setNewName('')
      setNewIcon('📦')
      setNewColor('#6366f1')
      setIsCreating(false)
      showToast('Categoria criada!', 'success')
    } catch {
      showToast('Erro ao criar categoria.', 'error')
    } finally {
      setIsSavingNew(false)
    }
  }

  const handleEdit = async () => {
    if (!editState || !editState.name.trim()) return
    setIsSavingEdit(true)
    try {
      const updated: Category = await phpApiRequest('categories.php', {
        method: 'PUT',
        body: JSON.stringify({
          id: editState.id,
          user_id: user?.id,
          name: editState.name.trim(),
          color: editState.color,
          icon: editState.icon,
        }),
      })
      updateCategory(editState.id, updated)
      setEditState(null)
      showToast('Categoria atualizada!', 'success')
    } catch {
      showToast('Erro ao atualizar categoria.', 'error')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async (cat: Category) => {
    try {
      await phpApiRequest(`categories.php?id=${cat.id}&user_id=${user?.id}`, { method: 'DELETE' })
      removeCategory(cat.id)
      showToast('Categoria excluída.', 'success')
    } catch {
      showToast('Erro ao excluir categoria.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <StackHeader title="Categorias" onBack={() => navigate('/settings')} />

      <StackContent className="space-y-8">
        {/* Minhas categorias */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1 min-h-9">
            <h2 className="text-lg font-semibold text-foreground">Minhas categorias</h2>
            {!isCreating && <Button label="Nova" icon={Plus} size="sm" onClick={() => setIsCreating(true)} />}
          </div>

          {isCreating && (
            <Card className="p-4">
              <CategoryEditor
                name={newName}
                icon={newIcon}
                color={newColor}
                onChange={(draft) => {
                  setNewName(draft.name)
                  setNewIcon(draft.icon)
                  setNewColor(draft.color)
                }}
                saving={isSavingNew}
                onCancel={() => setIsCreating(false)}
                onSave={handleCreate}
              />
            </Card>
          )}

          {personalCats.length === 0 && !isCreating ? (
            <p className="text-sm text-subtle px-1">Você ainda não criou nenhuma categoria.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {personalCats.map((cat) => (
                <Card key={cat.id} className={cn('p-3', editState?.id === cat.id && 'md:col-span-2')}>
                  {editState?.id === cat.id ? (
                    <CategoryEditor
                      name={editState.name}
                      icon={editState.icon}
                      color={editState.color}
                      onChange={(draft) => setEditState({ ...editState, ...draft })}
                      saving={isSavingEdit}
                      onCancel={() => setEditState(null)}
                      onSave={handleEdit}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-lg">{cat.icon}</span>
                      <span className="flex-1 min-w-0 font-medium text-foreground truncate">{cat.name}</span>
                      <IconButton icon={Pencil} label="Editar categoria" size={36} iconSize={17} tone="muted" onClick={() => setEditState({ id: cat.id, name: cat.name, color: cat.color, icon: cat.icon })} />
                      <IconButton icon={Trash2} label="Excluir categoria" size={36} iconSize={17} tone="muted" onClick={() => setDeletingCat(cat)} />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Categorias padrão */}
        <section className="space-y-3">
          <div className="px-1 space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Categorias padrão</h2>
            <p className="text-sm text-muted">Disponíveis para todos os usuários. Não podem ser editadas.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {defaultCats.map((cat) => (
              <Card key={cat.id} className="p-3 flex items-center gap-3">
                <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-lg">{cat.icon}</span>
                <span className="flex-1 min-w-0 font-medium text-foreground truncate">{cat.name}</span>
                <Badge label="Padrão" />
              </Card>
            ))}
          </div>
        </section>
      </StackContent>

      <ConfirmModal
        isOpen={!!deletingCat}
        onClose={() => setDeletingCat(null)}
        onConfirm={() => (deletingCat ? handleDelete(deletingCat) : undefined)}
        title="Excluir categoria?"
        message={`Excluir a categoria "${deletingCat?.name ?? ''}"?`}
        confirmText="Excluir"
        icon={Trash2}
        isDestructive
      />
    </div>
  )
}

type Draft = { name: string; icon: string; color: string }

/** Nome + emoji + cor: usado para criar e para editar */
function CategoryEditor({ name, icon, color, onChange, saving, onCancel, onSave }: Draft & {
  onChange: (draft: Draft) => void
  saving: boolean
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nome da categoria"
          value={name}
          onChange={(e) => onChange({ name: e.target.value, icon, color })}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
          className={cn(fieldClass, 'flex-1 min-w-0')}
          autoFocus
        />
        <input
          type="text"
          placeholder="🎯"
          value={icon}
          aria-label="Ícone (emoji)"
          onChange={(e) => onChange({ name, icon: e.target.value, color })}
          className="w-16 h-12 rounded-xl bg-surface-2 border border-transparent focus:border-primary outline-none text-center text-xl text-foreground"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
            onClick={() => onChange({ name, icon, color: c })}
            className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors"
            style={{ borderColor: color === c ? c : 'transparent' }}
          >
            <span className="w-7 h-7 rounded-full" style={{ backgroundColor: c }} />
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button label="Cancelar" variant="ghost" size="sm" onClick={onCancel} />
        <Button label={saving ? 'Salvando...' : 'Salvar'} icon={Check} size="sm" loading={saving} disabled={!name.trim()} onClick={onSave} />
      </div>
    </div>
  )
}
