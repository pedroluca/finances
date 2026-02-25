import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { useAppStore } from '../../store/app.store'
import { useAuthStore } from '../../store/auth.store'
import { phpApiRequest } from '../../lib/api'
import { useToast } from '../../components/Toast'
import type { Category } from '../../types/database'

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

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

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
      setDeleteConfirmId(null)
      showToast('Categoria excluída.', 'success')
    } catch {
      showToast('Erro ao excluir categoria.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/settings')}
              className="cursor-pointer p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categorias</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Minhas categorias */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Minhas categorias</h2>
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nova
              </button>
            )}
          </div>

          {isCreating && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-3 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da categoria"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="🎯"
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  className="w-16 px-3 py-2 text-sm text-center border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="w-7 h-7 rounded-full border-2 transition cursor-pointer"
                    style={{ backgroundColor: c, borderColor: newColor === c ? 'white' : 'transparent', outline: newColor === c ? `2px solid ${c}` : 'none' }}
                  />
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition cursor-pointer">
                  Cancelar
                </button>
                <button onClick={handleCreate} disabled={isSavingNew || !newName.trim()} className="flex items-center gap-1 px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition disabled:opacity-50 cursor-pointer">
                  <Check className="w-4 h-4" /> {isSavingNew ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {personalCats.length === 0 && !isCreating ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Você ainda não criou nenhuma categoria.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personalCats.map((cat) => (
                <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3">
                  {editState?.id === cat.id ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editState.name}
                          onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editState.icon}
                          onChange={(e) => setEditState({ ...editState, icon: e.target.value })}
                          className="w-16 px-3 py-2 text-sm text-center border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditState({ ...editState, color: c })}
                            className="w-7 h-7 rounded-full border-2 transition cursor-pointer"
                            style={{ backgroundColor: c, borderColor: editState.color === c ? 'white' : 'transparent', outline: editState.color === c ? `2px solid ${c}` : 'none' }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditState(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition cursor-pointer"><X className="w-4 h-4" /></button>
                        <button onClick={handleEdit} disabled={isSavingEdit} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50 cursor-pointer">
                          <Check className="w-4 h-4" /> {isSavingEdit ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-lg">{cat.icon}</span>
                      <span className="flex-1 font-medium text-gray-900 dark:text-white text-sm">{cat.name}</span>
                      <button onClick={() => setEditState({ id: cat.id, name: cat.name, color: cat.color, icon: cat.icon })} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition cursor-pointer">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleteConfirmId === cat.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-500 font-medium whitespace-nowrap">Excluir?</span>
                          <button onClick={() => handleDelete(cat)} className="px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition cursor-pointer">Sim</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition cursor-pointer">Não</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Categorias padrão */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Categorias padrão</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Disponíveis para todos os usuários. Não podem ser editadas.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {defaultCats.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 opacity-75">
                <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-lg">{cat.icon}</span>
                <span className="flex-1 font-medium text-gray-900 dark:text-white text-sm">{cat.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Padrão</span>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}
