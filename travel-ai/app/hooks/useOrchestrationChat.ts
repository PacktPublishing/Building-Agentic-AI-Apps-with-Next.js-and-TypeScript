/**
 * Hook for Orchestration Chat (Supervisor & Swarm patterns)
 *
 * Provides streaming chat functionality for multi-agent orchestration patterns.
 */

import { useState, useCallback, useRef } from 'react'

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
  const threadIdRef = useRef<string>(`${pattern}-${Date.now()}`)

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
        const response = await fetch(`/api/orchestration/${pattern}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            threadId: threadIdRef.current,
            stream: true,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let buffer = ''
        const collectedEvents: AgentEvent[] = []
        let finalContent = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const event: AgentEvent = JSON.parse(data)
                collectedEvents.push(event)

                // Update active agent
                if (event.activeAgent) {
                  setActiveAgent(event.activeAgent)
                } else if (
                  event.node &&
                  event.node !== 'supervisor' &&
                  event.node !== 'synthesize'
                ) {
                  setActiveAgent(event.node)
                }

                // Extract final response content
                if (event.data?.finalResponse) {
                  finalContent = event.data.finalResponse
                } else if (event.data?.response) {
                  // Swarm pattern returns response directly
                  finalContent = event.data.response
                } else if (event.data?.messages) {
                  const lastMsg =
                    event.data.messages[event.data.messages.length - 1]
                  if (lastMsg?.content) {
                    finalContent =
                      typeof lastMsg.content === 'string'
                        ? lastMsg.content
                        : JSON.stringify(lastMsg.content)
                  }
                }

                // Update message with new events
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          events: [...collectedEvents],
                          content: finalContent,
                          activeAgent: event.activeAgent,
                        }
                      : msg
                  )
                )
              } catch (e) {
                console.error('Failed to parse event:', e)
              }
            }
          }
        }
      } catch (err) {
        console.error('Chat error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
        // Remove the empty assistant message on error
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId)
        )
      } finally {
        setIsStreaming(false)
      }
    },
    [pattern, isStreaming]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    setActiveAgent(null)
    threadIdRef.current = `${pattern}-${Date.now()}`
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
