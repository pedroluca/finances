import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Plus, Trash2, Link as LinkIcon, Unlink, UserPlus, X } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { phpApiRequest } from '../lib/api'
import { Author } from '../types/database'
import { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

export default function ManageAuthors() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { showToast } = useToast()
  const [authors, setAuthors] = useState<Author[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Modals state
  const [showAddAuthor, setShowAddAuthor] = useState(false)
  const [newAuthorName, setNewAuthorName] = useState('')
  
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkEmail, setLinkEmail] = useState('')
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null)
  
  // Confirm modals
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; author: Author | null }>({
    show: false,
    author: null
  })
  const [confirmUnlink, setConfirmUnlink] = useState<{ show: boolean; author: Author | null }>({
    show: false,
    author: null
  })

  useEffect(() => {
    loadAuthors()
  }, [user])

  const loadAuthors = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const data = await phpApiRequest(`authors.php?user_id=${user.id}`)
      setAuthors(data)
    } catch (error) {
      console.error('Erro ao carregar autores:', error)
      showToast('Erro ao carregar pessoas', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAuthor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newAuthorName.trim()) return

    try {
      await phpApiRequest('authors.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: newAuthorName,
          is_owner: false
        })
      })
      setNewAuthorName('')
      setShowAddAuthor(false)
      loadAuthors()
      showToast('Pessoa adicionada com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao criar autor:', error)
      showToast('Erro ao criar pessoa. Tente novamente.', 'error')
    }
  }

  const handleDeleteAuthor = async () => {
    if (!confirmDelete.author) return
    try {
      await phpApiRequest(`authors.php?action=delete&id=${confirmDelete.author.id}`, {
        method: 'DELETE'
      })
      setConfirmDelete({ show: false, author: null })
      loadAuthors()
      showToast('Pessoa excluída com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao excluir autor:', error)
      showToast('Erro ao excluir pessoa', 'error')
      setConfirmDelete({ show: false, author: null })
    }
  }

  const handleLinkAuthor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAuthor || !linkEmail.trim()) return

    try {
      const response = await phpApiRequest(`authors.php?action=link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_id: selectedAuthor.id,
          email: linkEmail
        })
      })
      // Só fecha em caso de sucesso
      setLinkEmail('')
      setShowLinkModal(false)
      setSelectedAuthor(null)
      loadAuthors()
      showToast(response.message || 'Vínculo realizado com sucesso!', 'success')
    } catch (error: any) {
      console.error('Erro ao vincular:', error)
      const errorMessage = error?.message || 'Erro ao vincular. Verifique o email e tente novamente.'
      showToast(errorMessage, 'error')
      // NÃO fecha o modal em caso de erro para facilitar correção
    }
  }

  const handleUnlinkAuthor = async () => {
    if (!confirmUnlink.author) return

    try {
      await phpApiRequest(`authors.php?action=unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_id: confirmUnlink.author.id
        })
      })
      setConfirmUnlink({ show: false, author: null })
      loadAuthors()
      showToast('Vínculo removido com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao desvincular:', error)
      showToast('Erro ao desvincular', 'error')
      setConfirmUnlink({ show: false, author: null })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/settings')}
              className="cursor-pointer p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gerenciar Pessoas
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Pessoas Cadastradas
              </h2>
            </div>
            <button
              onClick={() => setShowAddAuthor(true)}
              className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Pessoa</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
             {authors.map(author => (
               <div key={author.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="flex items-start gap-4">
                   <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-purple-700 dark:text-purple-300">
                        {author.name.charAt(0).toUpperCase()}
                      </span>
                   </div>
                   <div>
                     <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                       {author.name}
                       {author.is_owner ? (
                         <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                           Você
                         </span>
                       ) : ''}
                     </h4>
                     {author.linked_user_email ? (
                       <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 mt-1">
                         <LinkIcon className="w-3 h-3" />
                         Vinculado a: {author.linked_user_email}
                       </div>
                     ) : !author.is_owner && (
                       <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                         Não vinculado a nenhuma conta
                       </p>
                     )}
                   </div>
                 </div>

                 {!author.is_owner && (
                   <div className="flex items-center gap-2 self-end sm:self-auto">
                     {author.linked_user_email ? (
                       <button
                         onClick={() => setConfirmUnlink({ show: true, author })}
                         className="cursor-pointer p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition"
                         title="Desvincular conta"
                       >
                         <Unlink className="w-4 h-4" />
                       </button>
                     ) : (
                       <button
                         onClick={() => {
                           setSelectedAuthor(author)
                           setShowLinkModal(true)
                         }}
                         className="cursor-pointer flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition border border-purple-200 dark:border-purple-800"
                       >
                         <UserPlus className="w-4 h-4" />
                         Vincular Conta
                       </button>
                     )}
                     <button
                       onClick={() => setConfirmDelete({ show: true, author })}
                       className="cursor-pointer p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                       title="Excluir pessoa"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 )}
               </div>
             ))}
             {authors.length === 0 && !isLoading && (
               <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                 Nenhuma pessoa cadastrada.
               </div>
             )}
          </div>
        </div>
      </main>

      {/* Modal Adicionar Autor */}
      {showAddAuthor && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nova Pessoa</h3>
                <button onClick={() => setShowAddAuthor(false)} className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
             </div>
             <form onSubmit={handleCreateAuthor}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={newAuthorName}
                  onChange={(e) => setNewAuthorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition"
                  placeholder="Ex: Mãe, João..."
                  autoFocus
                />
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddAuthor(false)}
                    className="cursor-pointer flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    Adicionar
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal Vincular Conta */}
      {showLinkModal && selectedAuthor && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vincular Conta</h3>
                <button onClick={() => setShowLinkModal(false)} className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
             </div>
             <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
               Vincule <strong>{selectedAuthor.name}</strong> a uma conta de usuário existente. Essa pessoa poderá visualizar os cartões onde ela é autora.
             </p>
             <form onSubmit={handleLinkAuthor}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email da conta
                </label>
                <input
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition"
                  placeholder="email@exemplo.com"
                  autoFocus
                />
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="cursor-pointer flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    Vincular
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Confirm Modal - Delete */}
      <ConfirmModal
        isOpen={confirmDelete.show}
        onClose={() => setConfirmDelete({ show: false, author: null })}
        onConfirm={handleDeleteAuthor}
        title="Excluir Pessoa"
        message={`Tem certeza que deseja excluir ${confirmDelete.author?.name}?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        isDestructive
      />

      {/* Confirm Modal - Unlink */}
      <ConfirmModal
        isOpen={confirmUnlink.show}
        onClose={() => setConfirmUnlink({ show: false, author: null })}
        onConfirm={handleUnlinkAuthor}
        title="Desvincular Conta"
        message={`Desvincular a conta de ${confirmUnlink.author?.linked_user_email} deste autor?`}
        confirmText="Desvincular"
        cancelText="Cancelar"
        isDestructive
      />
    </div>
  )
}
