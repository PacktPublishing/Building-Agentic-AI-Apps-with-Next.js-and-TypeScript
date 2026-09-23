/**
 * Hook for Orchestration Chat (Supervisor & Swarm patterns)
 *
 * Provides streaming chat functionality for multi-agent orchestration patterns.
 */

import { useState, useCallback, useRef } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { SseDecoder } from '@/lib/orchestration/sse'

export interface AgentEvent {
  node: string
  data: any
  timestamp: string
  activeAgent?: string
}

export interface OrchestrationMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  events: AgentEvent[]
  activeAgent?: string
  timestamp: Date
}

interface UseOrchestrationChatOptions {
  pattern: 'supervisor' | 'swarm'
}

export function useOrchestrationChat({ pattern }: UseOrchestrationChatOptions) {
  const [messages, setMessages] = useState<OrchestrationMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const { session } = useAuth()
  const threadIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return

      setError(null)
      setIsStreaming(true)

      // Add user message
      const userMessage: OrchestrationMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content,
        events: [],
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])

      // Create placeholder for assistant message
      const assistantMessageId = `assistant-${Date.now()}`
      const assistantMessage: OrchestrationMessage = {
        id: assistantMessageId,
        type: 'assistant',
        content: '',
        events: [],
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      try {
        if (!session?.access_token) throw new Error('Sign in to use orchestration')
        const controller = new AbortController()
        abortRef.current = controller
        const response = await fetch(`/api/orchestration/${pattern}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
          body: JSON.stringify({
            message: content,
            ...(threadIdRef.current ? { threadId: threadIdRef.current } : {}),
            stream: true,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new SseDecoder()
        const collectedEvents: AgentEvent[] = []
        let finalContent = ''
        let finished = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          for (const item of decoder.push(value)) {
            if (item.event === 'thread') threadIdRef.current = item.data.threadId
            if (item.event === 'error') throw new Error(item.data.error || 'Conversation failed')
            if (item.event === 'done') finished = true
            if (item.event === 'final') finalContent = item.data.response
            if (item.event === 'progress') {
              const event: AgentEvent = { node: item.data.node, data: {}, timestamp: new Date().toISOString(), activeAgent: item.data.activeAgent }
              collectedEvents.push(event)
              setActiveAgent(item.data.activeAgent || item.data.node)
            }
            setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId
              ? { ...msg, events: [...collectedEvents], content: finalContent, activeAgent: item.event === 'progress' ? item.data.activeAgent : undefined }
              : msg))
          }
        }
        if (!finished || !finalContent) throw new Error('Conversation ended without a final response')
      } catch (err) {
        if (!(err instanceof Error && err.name === 'AbortError')) setError(err instanceof Error ? err.message : 'An error occurred')
        // Remove the empty assistant message on error
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId)
        )
      } finally {
        abortRef.current = null
        setIsStreaming(false)
      }
    },
    [pattern, isStreaming, session?.access_token]
  )

  const clearMessages = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setActiveAgent(null)
    threadIdRef.current = null
  }, [pattern])

  return {
    messages,
    isStreaming,
    error,
    activeAgent,
    threadId: threadIdRef.current,
    sendMessage,
    clearMessages,
  }
}
