/**
 * Orchestration Chat Component
 *
 * Reusable chat interface for multi-agent orchestration patterns.
 * Shows agent activity, handoffs, and streaming responses.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useOrchestrationChat, AgentEvent } from '../hooks/useOrchestrationChat'

interface OrchestrationChatProps {
  pattern: 'supervisor' | 'swarm'
  title: string
  description: string
  agentInfo: {
    name: string
    role: string
    color: string
  }[]
}

// Agent colors mapping
const agentColors: Record<string, string> = {
  supervisor: 'bg-purple-500',
  Supervisor: 'bg-purple-500',
  FlightAgent: 'bg-blue-500',
  HotelAgent: 'bg-green-500',
  ActivityAgent: 'bg-orange-500',
  ResearchAgent: 'bg-cyan-500',
  BookingAgent: 'bg-emerald-500',
  PlanningAgent: 'bg-amber-500',
  synthesize: 'bg-indigo-500',
}

function AgentBadge({ name, isActive }: { name: string; isActive?: boolean }) {
  const color = agentColors[name] || 'bg-gray-500'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white ${color} ${isActive ? 'ring-2 ring-offset-2 ring-offset-background' : ''}`}
    >
      {isActive && (
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
      )}
      {name}
    </span>
  )
}

function EventTimeline({ events }: { events: AgentEvent[] }) {
  if (events.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Agent Activity
      </p>
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {events.map((event, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-mono">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <AgentBadge name={event.node} />
            {event.activeAgent && event.activeAgent !== event.node && (
              <>
                <span className="text-muted-foreground">→</span>
                <AgentBadge name={event.activeAgent} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function OrchestrationChat({
  pattern,
  title,
  description,
  agentInfo,
}: OrchestrationChatProps) {
  const [input, setInput] = useState('')
  const {
    messages,
    isStreaming,
    error,
    activeAgent,
    sendMessage,
    clearMessages,
  } = useOrchestrationChat({ pattern })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    const message = input.trim()
    setInput('')
    await sendMessage(message)
  }

  const exampleQueries =
    pattern === 'supervisor'
      ? [
          'Find me flights from Paris to Tokyo and hotels in Shibuya for next week',
          'I need a complete trip plan: flights, hotels, and activities in Barcelona',
          'Search for family-friendly activities in Rome and nearby hotels',
        ]
      : [
          'I want to plan a trip to London. Find me some flights from New York.',
          'Book a hotel in central Paris for 3 nights',
          'Help me create an itinerary for a week in Japan',
        ]

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-background rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${pattern === 'supervisor' ? 'bg-purple-500' : 'bg-cyan-500'}`}
            >
              {pattern === 'supervisor' ? (
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeAgent && isStreaming && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Active:</span>
                <AgentBadge name={activeAgent} isActive />
              </div>
            )}
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Agent Info Bar */}
        <div className="mt-3 flex flex-wrap gap-2">
          {agentInfo.map((agent) => (
            <div
              key={agent.name}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span className={`w-2 h-2 rounded-full ${agent.color}`} />
              <span className="font-medium">{agent.name}:</span>
              <span>{agent.role}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div
                className={`mb-6 inline-block p-4 rounded-2xl ${pattern === 'supervisor' ? 'bg-purple-100' : 'bg-cyan-100'}`}
              >
                {pattern === 'supervisor' ? (
                  <svg
                    className="w-16 h-16 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-16 h-16 text-cyan-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                )}
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                {title}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                {pattern === 'supervisor'
                  ? 'A central supervisor coordinates specialized agents. Watch as tasks are delegated and results are synthesized.'
                  : 'Agents hand off control to each other dynamically. See how the conversation flows between specialists.'}
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Try an example:
                </p>
                <div className="flex flex-col gap-2 max-w-xl mx-auto">
                  {exampleQueries.map((query, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(query)}
                      className="text-left px-4 py-3 bg-card hover:bg-accent rounded-lg border border-border hover:border-primary transition-all text-sm"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl ${message.type === 'user' ? '' : 'w-full'}`}
              >
                {message.type === 'user' ? (
                  <div className="bg-primary text-primary-foreground rounded-2xl px-5 py-3 shadow">
                    <p>{message.content}</p>
                  </div>
                ) : (
                  <div className="bg-card rounded-2xl p-5 shadow border border-border">
                    {message.activeAgent && (
                      <div className="mb-3">
                        <AgentBadge name={message.activeAgent} />
                      </div>
                    )}

                    {message.content ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : message.events.length > 0 ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                        <span className="text-sm">Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                        <span className="text-sm">Thinking...</span>
                      </div>
                    )}

                    <EventTimeline events={message.events} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the agents anything about travel..."
              disabled={isStreaming}
              className="flex-1 px-5 py-3 bg-background border-2 border-input rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed transition-all text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={`px-6 py-3 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2 ${pattern === 'supervisor' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-cyan-500 hover:bg-cyan-600'}`}
            >
              {isStreaming ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Working...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
