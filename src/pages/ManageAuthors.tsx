import { Fragment, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Trash2, Link as LinkIcon, Unlink, UserPlus } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { phpApiRequest } from '../lib/api'
import { Author } from '../types/database'
import { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'
import { StackContent, StackHeader } from '../components/app-header'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { IconButton } from '../components/ui/icon-button'
import { Badge, LoadingState } from '../components/ui/misc'
import { TextField } from '../components/ui/field'
import { Sheet } from '../components/ui/sheet'
import { accents } from '../lib/colors'

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
      const data: Author[] = await phpApiRequest(`authors.php?user_id=${user.id}`)
      setAuthors([...data].sort((a, b) => Number(b.is_owner) - Number(a.is_owner)))
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
    } catch (error) {
      console.error('Erro ao vincular:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao vincular. Verifique o email e tente novamente.'
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
    <div className="min-h-screen bg-background">
      <StackHeader title="Gerenciar Pessoas" onBack={() => navigate('/settings')} />

      <StackContent>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <Users size={22} className="text-primary shrink-0" />
              <h2 className="text-lg font-semibold text-foreground truncate">Pessoas Cadastradas</h2>
            </div>
            <Button label="Nova" icon={Plus} size="sm" onClick={() => setShowAddAuthor(true)} />
          </div>

          {isLoading && authors.length === 0 ? (
            <LoadingState />
          ) : authors.length === 0 ? (
            <p className="p-8 text-center text-muted">Nenhuma pessoa cadastrada.</p>
          ) : (
            authors.map((author, index) => (
              <Fragment key={author.id}>
                {index > 0 && <div className="h-px bg-border ml-[68px]" />}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-semibold" style={{ backgroundColor: `${accents.violet}26`, color: accents.violet }}>
                    {author.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium text-foreground truncate">{author.name}</p>
                      {!!author.is_owner && <Badge label="Você" />}
                    </div>
                    {author.linked_user_email ? (
                      <p className="flex items-center gap-1.5 text-xs text-success min-w-0">
                        <LinkIcon size={12} className="shrink-0" />
                        <span className="truncate">{author.linked_user_email}</span>
                      </p>
                    ) : !author.is_owner && (
                      <p className="text-xs text-muted">Não vinculado</p>
                    )}
                  </div>
                  {!author.is_owner && (
                    <div className="flex items-center">
                      {author.linked_user_email ? (
                        <IconButton icon={Unlink} label="Desvincular conta" size={38} iconSize={17} tone="warning" onClick={() => setConfirmUnlink({ show: true, author })} />
                      ) : (
                        <IconButton
                          icon={UserPlus}
                          label="Vincular conta"
                          variant="soft"
                          size={38}
                          iconSize={17}
                          onClick={() => {
                            setSelectedAuthor(author)
                            setShowLinkModal(true)
                          }}
                        />
                      )}
                      <IconButton icon={Trash2} label="Excluir pessoa" size={38} iconSize={17} tone="danger" onClick={() => setConfirmDelete({ show: true, author })} />
                    </div>
                  )}
                </div>
              </Fragment>
            ))
          )}
        </Card>
      </StackContent>

      {/* Nova pessoa */}
      <Sheet open={showAddAuthor} onClose={() => setShowAddAuthor(false)} title="Nova Pessoa">
        <form onSubmit={handleCreateAuthor} className="space-y-4 pb-2">
          <TextField
            label="Nome"
            value={newAuthorName}
            onChange={(e) => setNewAuthorName(e.target.value)}
            placeholder="Ex: Mãe, João..."
            autoFocus
          />
          <div className="flex gap-3">
            <Button label="Cancelar" variant="secondary" onClick={() => setShowAddAuthor(false)} className="flex-1" />
            <Button type="submit" label="Adicionar" disabled={!newAuthorName.trim()} className="flex-1" />
          </div>
        </form>
      </Sheet>

      {/* Vincular conta */}
      <Sheet
        open={showLinkModal && !!selectedAuthor}
        onClose={() => setShowLinkModal(false)}
        title="Vincular Conta"
        description={selectedAuthor && (
          <>Vincule <strong className="text-foreground">{selectedAuthor.name}</strong> a uma conta de usuário existente. Essa pessoa poderá visualizar os cartões onde ela é autora.</>
        )}
      >
        <form onSubmit={handleLinkAuthor} className="space-y-4 pb-2">
          <TextField
            type="email"
            label="Email da conta"
            value={linkEmail}
            onChange={(e) => setLinkEmail(e.target.value)}
            placeholder="email@exemplo.com"
            autoFocus
          />
          <div className="flex gap-3">
            <Button label="Cancelar" variant="secondary" onClick={() => setShowLinkModal(false)} className="flex-1" />
            <Button type="submit" label="Vincular" disabled={!linkEmail.trim()} className="flex-1" />
          </div>
        </form>
      </Sheet>

      {/* Confirm Modal - Delete */}
      <ConfirmModal
        isOpen={confirmDelete.show}
        onClose={() => setConfirmDelete({ show: false, author: null })}
        onConfirm={handleDeleteAuthor}
        title="Excluir Pessoa"
        message={`Tem certeza que deseja excluir ${confirmDelete.author?.name}?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        icon={Trash2}
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
        icon={Unlink}
        isDestructive
      />
    </div>
  )
}
