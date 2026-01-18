'use client'

import { useState, useRef, useEffect } from 'react'
import { useStreamChat } from '../../hooks/useStreamChat'
import { MessageRenderer } from '../../components/MessageRenderer'
import { OptimizationStats } from '../../components/OptimizationStats'

export default function AIChatPage() {
  const [input, setInput] = useState('')
  const { messages, isStreaming, error, sendMessage, clearMessages, threadId } =
    useStreamChat()
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

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-background rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl">
              <svg
                className="w-6 h-6 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                AI Travel Assistant
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Context Engineering Active
              </p>
            </div>
          </div>
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
              Clear Chat
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="mb-6 inline-block p-4 bg-muted rounded-2xl">
                <svg
                  className="w-16 h-16 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Welcome to AI Travel Assistant
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Your intelligent travel companion powered by AI. Ask me to find
                activities, hotels, or flights anywhere in the world!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto text-left">
                {/* Flights */}
                <button
                  onClick={() =>
                    sendMessage(
                      'Find me flights from Paris to Tokyo for next month'
                    )
                  }
                  className="group relative overflow-hidden p-5 bg-gradient-to-br from-sky-500/10 to-blue-600/10 hover:from-sky-500/20 hover:to-blue-600/20 rounded-2xl border border-sky-500/20 hover:border-sky-500/40 transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-[1.02]"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 rounded-full blur-2xl transform translate-x-6 -translate-y-6 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">✈️</span>
                      <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                        Flights
                      </span>
                    </div>
                    <p className="text-foreground font-medium text-sm">
                      Find me flights from Paris to Tokyo for next month
                    </p>
                  </div>
                </button>

                {/* Hotels */}
                <button
                  onClick={() =>
                    sendMessage(
                      'Search for luxury hotels in Barcelona with sea view'
                    )
                  }
                  className="group relative overflow-hidden p-5 bg-gradient-to-br from-amber-500/10 to-orange-600/10 hover:from-amber-500/20 hover:to-orange-600/20 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-[1.02]"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl transform translate-x-6 -translate-y-6 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🏨</span>
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        Hotels
                      </span>
                    </div>
                    <p className="text-foreground font-medium text-sm">
                      Search for luxury hotels in Barcelona with sea view
                    </p>
                  </div>
                </button>

                {/* Activities */}
                <button
                  onClick={() =>
                    sendMessage(
                      'What are the best tours and activities in Rome?'
                    )
                  }
                  className="group relative overflow-hidden p-5 bg-gradient-to-br from-emerald-500/10 to-teal-600/10 hover:from-emerald-500/20 hover:to-teal-600/20 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-[1.02]"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl transform translate-x-6 -translate-y-6 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🎭</span>
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        Activities
                      </span>
                    </div>
                    <p className="text-foreground font-medium text-sm">
                      What are the best tours and activities in Rome?
                    </p>
                  </div>
                </button>

                {/* Romantic Trip */}
                <button
                  onClick={() =>
                    sendMessage(
                      'Plan a romantic weekend getaway to Santorini, Greece'
                    )
                  }
                  className="group relative overflow-hidden p-5 bg-gradient-to-br from-pink-500/10 to-rose-600/10 hover:from-pink-500/20 hover:to-rose-600/20 rounded-2xl border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-[1.02]"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/10 rounded-full blur-2xl transform translate-x-6 -translate-y-6 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">💕</span>
                      <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider">
                        Romantic
                      </span>
                    </div>
                    <p className="text-foreground font-medium text-sm">
                      Plan a romantic weekend getaway to Santorini, Greece
                    </p>
                  </div>
                </button>

                {/* Adventure */}
                <button
                  onClick={() =>
                    sendMessage(
                      'Find adventure activities and hiking tours in New Zealand'
                    )
                  }
                  className="group relative overflow-hidden p-5 bg-gradient-to-br from-violet-500/10 to-purple-600/10 hover:from-violet-500/20 hover:to-purple-600/20 rounded-2xl border border-violet-500/20 hover:border-violet-500/40 transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-[1.02]"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl transform translate-x-6 -translate-y-6 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🏔️</span>
                      <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                        Adventure
                      </span>
                    </div>
                    <p className="text-foreground font-medium text-sm">
                      Find adventure activities and hiking tours in New Zealand
                    </p>
                  </div>
                </button>

                {/* Budget */}
                <button
                  onClick={() =>
                    sendMessage(
                      'I have $2000 for a week in Southeast Asia. What do you recommend?'
                    )
                  }
                  className="group relative overflow-hidden p-5 bg-gradient-to-br from-lime-500/10 to-green-600/10 hover:from-lime-500/20 hover:to-green-600/20 rounded-2xl border border-lime-500/20 hover:border-lime-500/40 transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-[1.02]"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-lime-500/10 rounded-full blur-2xl transform translate-x-6 -translate-y-6 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">💰</span>
                      <span className="text-xs font-semibold text-lime-400 uppercase tracking-wider">
                        Budget
                      </span>
                    </div>
                    <p className="text-foreground font-medium text-sm">
                      I have $2000 for a week in Southeast Asia. What do you
                      recommend?
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              } animate-fade-in`}
            >
              <div
                className={`max-w-4xl ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground rounded-2xl px-6 py-4 shadow-lg'
                    : 'w-full'
                }`}
              >
                {message.type === 'user' ? (
                  <p className="text-base leading-relaxed">{message.content}</p>
                ) : (
                  <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
                    {message.events && message.events.length > 0 ? (
                      <MessageRenderer events={message.events} />
                    ) : (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="flex space-x-1">
                          <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></div>
                          <div
                            className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          ></div>
                          <div
                            className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">Thinking...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about travel..."
              disabled={isStreaming}
              className="flex-1 px-6 py-4 bg-background border-2 border-input rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed transition-all text-base text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              {isStreaming ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  <span>Thinking...</span>
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

        {/* Optimization Stats */}
        <OptimizationStats threadId={threadId} messageCount={messages.length} />
      </div>
    </div>
  )
}
