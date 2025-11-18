// components/chat/chat-history.tsx
import { useState, useEffect } from 'react'
import { Plus, MessageSquare, Trash2, Calendar } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { useAuthApi } from '~/hooks/useAuthApi'

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
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
  const { fetchWithAuth } = useAuthApi()

  const deleteSession = async (sessionId: string) => {
    try {
      await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/api/chat/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      if (currentSessionId === sessionId) {
        onNewChat()
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
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
                
                <Button
                  variant="ghost"
                  size="icon"
                  className={`opacity-0 group-hover:opacity-100 h-6 w-6 ${
                    currentSessionId === session.id
                      ? 'hover:bg-primary-foreground/20'
                      : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSession(session.id)
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}