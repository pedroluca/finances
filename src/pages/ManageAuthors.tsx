import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      showToast(t('authors.loadError'), 'error')
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
      showToast(t('authors.added'), 'success')
    } catch (error) {
      console.error('Erro ao criar autor:', error)
      showToast(t('authors.createError'), 'error')
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
      showToast(t('authors.deleted'), 'success')
    } catch (error) {
      console.error('Erro ao excluir autor:', error)
      showToast(t('authors.deleteError'), 'error')
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
      showToast(response.message || t('authors.linked'), 'success')
    } catch (error) {
      console.error('Erro ao vincular:', error)
      const errorMessage = error instanceof Error ? error.message : t('authors.linkError')
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
      showToast(t('authors.unlinked'), 'success')
    } catch (error) {
      console.error('Erro ao desvincular:', error)
      showToast(t('authors.unlinkError'), 'error')
      setConfirmUnlink({ show: false, author: null })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <StackHeader title={t('screens.manageAuthors')} onBack={() => navigate('/settings')} />

      <StackContent>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <Users size={22} className="text-primary shrink-0" />
              <h2 className="text-lg font-semibold text-foreground truncate">{t('authors.title')}</h2>
            </div>
            <Button label={t('common.new')} icon={Plus} size="sm" onClick={() => setShowAddAuthor(true)} />
          </div>

          {isLoading && authors.length === 0 ? (
            <LoadingState />
          ) : authors.length === 0 ? (
            <p className="p-8 text-center text-muted">{t('authors.empty')}</p>
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
                      {!!author.is_owner && <Badge label={t('common.you')} />}
                    </div>
                    {author.linked_user_email ? (
                      <p className="flex items-center gap-1.5 text-xs text-success min-w-0">
                        <LinkIcon size={12} className="shrink-0" />
                        <span className="truncate">{author.linked_user_email}</span>
                      </p>
                    ) : !author.is_owner && (
                      <p className="text-xs text-muted">{t('authors.notLinked')}</p>
                    )}
                  </div>
                  {!author.is_owner && (
                    <div className="flex items-center">
                      {author.linked_user_email ? (
                        <IconButton icon={Unlink} label={t('authors.unlinkAccount')} size={38} iconSize={17} tone="warning" onClick={() => setConfirmUnlink({ show: true, author })} />
                      ) : (
                        <IconButton
                          icon={UserPlus}
                          label={t('authors.linkAccount')}
                          variant="soft"
                          size={38}
                          iconSize={17}
                          onClick={() => {
                            setSelectedAuthor(author)
                            setShowLinkModal(true)
                          }}
                        />
                      )}
                      <IconButton icon={Trash2} label={t('authors.deletePerson')} size={38} iconSize={17} tone="danger" onClick={() => setConfirmDelete({ show: true, author })} />
                    </div>
                  )}
                </div>
              </Fragment>
            ))
          )}
        </Card>
      </StackContent>

      {/* Nova pessoa */}
      <Sheet open={showAddAuthor} onClose={() => setShowAddAuthor(false)} title={t('authors.newTitle')}>
        <form onSubmit={handleCreateAuthor} className="space-y-4 pb-2">
          <TextField
            label={t('authors.name')}
            value={newAuthorName}
            onChange={(e) => setNewAuthorName(e.target.value)}
            placeholder={t('authors.namePlaceholder')}
            autoFocus
          />
          <div className="flex gap-3">
            <Button label={t('common.cancel')} variant="secondary" onClick={() => setShowAddAuthor(false)} className="flex-1" />
            <Button type="submit" label={t('common.add')} disabled={!newAuthorName.trim()} className="flex-1" />
          </div>
        </form>
      </Sheet>

      {/* Vincular conta */}
      <Sheet
        open={showLinkModal && !!selectedAuthor}
        onClose={() => setShowLinkModal(false)}
        title={t('authors.linkTitle')}
        description={selectedAuthor && (
          <>{t('authors.linkDescriptionBefore')} <strong className="text-foreground">{selectedAuthor.name}</strong> {t('authors.linkDescriptionAfter')}</>
        )}
      >
        <form onSubmit={handleLinkAuthor} className="space-y-4 pb-2">
          <TextField
            type="email"
            label={t('authors.email')}
            value={linkEmail}
            onChange={(e) => setLinkEmail(e.target.value)}
            placeholder={t('authors.emailPlaceholder')}
            autoFocus
          />
          <div className="flex gap-3">
            <Button label={t('common.cancel')} variant="secondary" onClick={() => setShowLinkModal(false)} className="flex-1" />
            <Button type="submit" label={t('authors.link')} disabled={!linkEmail.trim()} className="flex-1" />
          </div>
        </form>
      </Sheet>

      {/* Confirm Modal - Delete */}
      <ConfirmModal
        isOpen={confirmDelete.show}
        onClose={() => setConfirmDelete({ show: false, author: null })}
        onConfirm={handleDeleteAuthor}
        title={t('authors.deleteTitle')}
        message={t('authors.deleteMessage', { name: confirmDelete.author?.name })}
        confirmText={t('common.delete')}
        icon={Trash2}
        isDestructive
      />

      {/* Confirm Modal - Unlink */}
      <ConfirmModal
        isOpen={confirmUnlink.show}
        onClose={() => setConfirmUnlink({ show: false, author: null })}
        onConfirm={handleUnlinkAuthor}
        title={t('authors.unlinkTitle')}
        message={t('authors.unlinkMessage', { email: confirmUnlink.author?.linked_user_email })}
        confirmText={t('authors.unlink')}
        icon={Unlink}
        isDestructive
      />
    </div>
  )
}
