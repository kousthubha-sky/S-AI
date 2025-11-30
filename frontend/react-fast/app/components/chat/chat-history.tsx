// components/chat/chat-history.tsx
import { useState, useEffect } from 'react'
import { Plus, MessageSquare, Trash2, Calendar, MoreVertical, Star, Edit2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { useAuthApi } from '~/hooks/useAuthApi'
import { useToast } from '~/components/ui/toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '~/components/ui/dropdown-menu'
import * as Dialog from '@radix-ui/react-dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
  starred?: boolean
}

interface ChatHistoryProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSessionSelect: (sessionId: string) => Promise<void>
  onNewChat: () => Promise<void>
  isLoading?: boolean
}

export function ChatHistory({ sessions, currentSessionId, onSessionSelect, onNewChat, isLoading = false }: ChatHistoryProps) {
  const [loading, setLoading] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renamingSession, setRenamingSession] = useState<ChatSession | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const { fetchWithAuth } = useAuthApi()
  const { showToast } = useToast()

  const deleteSession = async (sessionId: string) => {
    try {
      await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/chat/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      if (currentSessionId === sessionId) {
        onNewChat()
      }
      showToast('Chat deleted', 'success', 1500)
    } catch (error) {
      console.error('Failed to delete session:', error)
      showToast('Failed to delete chat', 'error')
    }
  }

  const toggleStarSession = async (session: ChatSession) => {
    try {
      const newStarred = !session.starred
      await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/chat/sessions/${session.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ starred: newStarred })
      })
      showToast(newStarred ? 'Chat starred' : 'Chat unstarred', 'success', 1500)
      // The parent component should refetch sessions to update the UI
    } catch (error) {
      console.error('Failed to toggle star:', error)
      showToast('Failed to update chat', 'error')
    }
  }

  const openRenameDialog = (session: ChatSession) => {
    setRenamingSession(session)
    setNewTitle(session.title)
    setRenameDialogOpen(true)
  }

  const renameSession = async () => {
    if (!renamingSession || !newTitle.trim()) return

    try {
      await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/chat/sessions/${renamingSession.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle.trim() })
      })
      setRenameDialogOpen(false)
      setRenamingSession(null)
      setNewTitle('')
      showToast('Chat renamed', 'success', 1500)
      // The parent component should refetch sessions to update the UI
    } catch (error) {
      console.error('Failed to rename session:', error)
      showToast('Failed to rename chat', 'error')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="w-64 bg-muted/30 h-full flex flex-col">
      <div className="p-4 border-b">
        <Button onClick={onNewChat} className="w-full" variant="default">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 flex-1 rounded" />
                </div>
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No chat history</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer group ${
                  currentSessionId === session.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-sm font-medium">
                      {session.title}
                    </span>
                    {session.starred && (
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className={`text-xs mt-1 flex items-center gap-1 ${
                    currentSessionId === session.id
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground'
                  }`}>
                    <Calendar className="w-3 h-3" />
                    {formatDate(session.updated_at)}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`opacity-0 group-hover:opacity-100 h-6 w-6 ${
                        currentSessionId === session.id
                          ? 'hover:bg-primary-foreground/20'
                          : ''
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        openRenameDialog(session)
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStarSession(session)
                      }}
                    >
                      <Star className={`w-4 h-4 mr-2 ${session.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      {session.starred ? 'Unstar' : 'Star'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(session.id)
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog.Root open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-96 max-w-[90vw] z-50">
            <Dialog.Title className="text-lg font-semibold mb-4">
              Rename Chat
            </Dialog.Title>
            <div className="space-y-4">
              <div>
                <Label htmlFor="chat-title">Chat Title</Label>
                <Input
                  id="chat-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter new chat title"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameSession()
                    } else if (e.key === 'Escape') {
                      setRenameDialogOpen(false)
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setRenameDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={renameSession}
                  disabled={!newTitle.trim() || newTitle.trim() === renamingSession?.title}
                >
                  Rename
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}