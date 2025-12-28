# Frontend Integration for Multi-Agent Systems

## Overview

This section covers how to build React/Next.js frontends that effectively display multi-agent interactions, including agent tracking, handoff visualization, and streaming responses.

## React Hook for Orchestration

### useOrchestrationChat Hook

```typescript
// app/hooks/useOrchestrationChat.ts

import { useState, useCallback, useRef } from 'react';

export interface AgentEvent {
    node: string;
    data: any;
    timestamp: string;
    activeAgent?: string;
}

export interface OrchestrationMessage {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    events: AgentEvent[];
    activeAgent?: string;
    timestamp: Date;
}

interface UseOrchestrationChatOptions {
    pattern: 'supervisor' | 'swarm';
}

export function useOrchestrationChat({ pattern }: UseOrchestrationChatOptions) {
    const [messages, setMessages] = useState<OrchestrationMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeAgent, setActiveAgent] = useState<string | null>(null);
    const threadIdRef = useRef<string>(`${pattern}-${Date.now()}`);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isStreaming) return;

        setError(null);
        setIsStreaming(true);

        // Add user message
        const userMessage: OrchestrationMessage = {
            id: `user-${Date.now()}`,
            type: 'user',
            content,
            events: [],
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);

        // Create placeholder for assistant
        const assistantMessageId = `assistant-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: assistantMessageId,
            type: 'assistant',
            content: '',
            events: [],
            timestamp: new Date(),
        }]);

        try {
            const response = await fetch(`/api/orchestration/${pattern}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: content,
                    threadId: threadIdRef.current,
                    stream: true,
                }),
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            const collectedEvents: AgentEvent[] = [];
            let finalContent = '';

            while (true) {
                const { done, value } = await reader!.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        const event: AgentEvent = JSON.parse(data);
                        collectedEvents.push(event);

                        // Track active agent
                        if (event.activeAgent) {
                            setActiveAgent(event.activeAgent);
                        }

                        // Extract content
                        if (event.data?.finalResponse) {
                            finalContent = event.data.finalResponse;
                        }

                        // Update message
                        setMessages(prev => prev.map(msg =>
                            msg.id === assistantMessageId
                                ? { ...msg, events: [...collectedEvents], content: finalContent }
                                : msg
                        ));
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsStreaming(false);
        }
    }, [pattern, isStreaming]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setActiveAgent(null);
        threadIdRef.current = `${pattern}-${Date.now()}`;
    }, [pattern]);

    return {
        messages,
        isStreaming,
        error,
        activeAgent,
        threadId: threadIdRef.current,
        sendMessage,
        clearMessages,
    };
}
```

## Agent Badge Component

Visualize which agent is active:

```typescript
// app/components/AgentBadge.tsx

const agentColors: Record<string, string> = {
    Supervisor: 'bg-purple-500',
    FlightAgent: 'bg-blue-500',
    HotelAgent: 'bg-green-500',
    ActivityAgent: 'bg-orange-500',
    ResearchAgent: 'bg-cyan-500',
    BookingAgent: 'bg-emerald-500',
    PlanningAgent: 'bg-amber-500',
};

interface AgentBadgeProps {
    name: string;
    isActive?: boolean;
}

export function AgentBadge({ name, isActive }: AgentBadgeProps) {
    const color = agentColors[name] || 'bg-gray-500';
    
    return (
        <span className={`
            inline-flex items-center gap-1.5 
            px-2.5 py-1 rounded-full 
            text-xs font-medium text-white 
            ${color}
            ${isActive ? 'ring-2 ring-offset-2' : ''}
        `}>
            {isActive && (
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            )}
            {name}
        </span>
    );
}
```

## Event Timeline Component

Show agent activity during processing:

```typescript
// app/components/EventTimeline.tsx

interface EventTimelineProps {
    events: AgentEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
    if (events.length === 0) return null;

    return (
        <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">
                Agent Activity
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {events.map((event, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 font-mono">
                            {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        <AgentBadge name={event.node} />
                        {event.activeAgent && event.activeAgent !== event.node && (
                            <>
                                <span className="text-gray-400">→</span>
                                <AgentBadge name={event.activeAgent} />
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
```

## Orchestration Chat Component

Complete chat interface for both patterns:

```typescript
// app/components/OrchestrationChat.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { useOrchestrationChat } from '../hooks/useOrchestrationChat';
import { AgentBadge } from './AgentBadge';
import { EventTimeline } from './EventTimeline';

interface OrchestrationChatProps {
    pattern: 'supervisor' | 'swarm';
    title: string;
    description: string;
    agentInfo: { name: string; role: string; color: string }[];
}

export function OrchestrationChat({ 
    pattern, 
    title, 
    description, 
    agentInfo 
}: OrchestrationChatProps) {
    const [input, setInput] = useState('');
    const { 
        messages, 
        isStreaming, 
        error, 
        activeAgent, 
        sendMessage, 
        clearMessages 
    } = useOrchestrationChat({ pattern });
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;
        const message = input.trim();
        setInput('');
        await sendMessage(message);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">{title}</h1>
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>
                    {activeAgent && isStreaming && (
                        <AgentBadge name={activeAgent} isActive />
                    )}
                </div>
                
                {/* Agent info bar */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {agentInfo.map((agent) => (
                        <div key={agent.name} className="flex items-center gap-1.5 text-xs">
                            <span className={`w-2 h-2 rounded-full ${agent.color}`} />
                            <span className="font-medium">{agent.name}:</span>
                            <span className="text-gray-500">{agent.role}</span>
                        </div>
                    ))}
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`mb-4 ${
                            message.type === 'user' ? 'text-right' : ''
                        }`}
                    >
                        {message.type === 'user' ? (
                            <div className="inline-block bg-blue-500 text-white rounded-lg px-4 py-2">
                                {message.content}
                            </div>
                        ) : (
                            <div className="bg-gray-100 rounded-lg p-4">
                                {message.activeAgent && (
                                    <AgentBadge name={message.activeAgent} />
                                )}
                                
                                {message.content ? (
                                    <p className="mt-2 whitespace-pre-wrap">
                                        {message.content}
                                    </p>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <div className="animate-pulse">Processing...</div>
                                    </div>
                                )}
                                
                                <EventTimeline events={message.events} />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask the agents..."
                        disabled={isStreaming}
                        className="flex-1 px-4 py-2 border rounded-lg"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isStreaming}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
                    >
                        {isStreaming ? 'Working...' : 'Send'}
                    </button>
                </div>
            </form>
        </div>
    );
}
```

## Page Components

### Supervisor Demo Page

```typescript
// app/dashboard/orchestration/supervisor/page.tsx

'use client';

import { OrchestrationChat } from '@/app/components/OrchestrationChat';

const supervisorAgents = [
    { name: 'Supervisor', role: 'Coordinates agents', color: 'bg-purple-500' },
    { name: 'FlightAgent', role: 'Flight searches', color: 'bg-blue-500' },
    { name: 'HotelAgent', role: 'Hotel searches', color: 'bg-green-500' },
    { name: 'ActivityAgent', role: 'Activities', color: 'bg-orange-500' },
];

export default function SupervisorPage() {
    return (
        <OrchestrationChat
            pattern="supervisor"
            title="Supervisor Pattern"
            description="Hierarchical orchestration with central coordination"
            agentInfo={supervisorAgents}
        />
    );
}
```

### Swarm Demo Page

```typescript
// app/dashboard/orchestration/swarm/page.tsx

'use client';

import { OrchestrationChat } from '@/app/components/OrchestrationChat';

const swarmAgents = [
    { name: 'ResearchAgent', role: 'Primary contact', color: 'bg-cyan-500' },
    { name: 'BookingAgent', role: 'Reservations', color: 'bg-emerald-500' },
    { name: 'PlanningAgent', role: 'Itineraries', color: 'bg-amber-500' },
];

export default function SwarmPage() {
    return (
        <OrchestrationChat
            pattern="swarm"
            title="Swarm Pattern"
            description="Decentralized orchestration with dynamic handoffs"
            agentInfo={swarmAgents}
        />
    );
}
```

## Visualizing Handoffs

For the swarm pattern, you can add a visual indicator when handoffs occur:

```typescript
// app/components/HandoffIndicator.tsx

interface HandoffIndicatorProps {
    from: string;
    to: string;
}

export function HandoffIndicator({ from, to }: HandoffIndicatorProps) {
    return (
        <div className="flex items-center justify-center gap-3 py-2 my-2 bg-gray-50 rounded">
            <AgentBadge name={from} />
            <div className="flex items-center gap-1">
                <div className="w-8 h-0.5 bg-gray-300" />
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
            <AgentBadge name={to} isActive />
        </div>
    );
}
```

## Architecture Diagram Component

Interactive diagram showing current state:

```typescript
// app/components/ArchitectureDiagram.tsx

interface ArchitectureDiagramProps {
    pattern: 'supervisor' | 'swarm';
    activeAgent?: string;
}

export function ArchitectureDiagram({ pattern, activeAgent }: ArchitectureDiagramProps) {
    if (pattern === 'supervisor') {
        return (
            <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-col items-center gap-4">
                    <AgentBadge 
                        name="Supervisor" 
                        isActive={activeAgent === 'supervisor'} 
                    />
                    <div className="flex gap-4">
                        <AgentBadge 
                            name="FlightAgent" 
                            isActive={activeAgent === 'FlightAgent'} 
                        />
                        <AgentBadge 
                            name="HotelAgent" 
                            isActive={activeAgent === 'HotelAgent'} 
                        />
                        <AgentBadge 
                            name="ActivityAgent" 
                            isActive={activeAgent === 'ActivityAgent'} 
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Swarm pattern
    return (
        <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-4">
                <AgentBadge 
                    name="ResearchAgent" 
                    isActive={activeAgent === 'ResearchAgent'} 
                />
                <span className="text-gray-400">↔</span>
                <AgentBadge 
                    name="BookingAgent" 
                    isActive={activeAgent === 'BookingAgent'} 
                />
                <span className="text-gray-400">↔</span>
                <AgentBadge 
                    name="PlanningAgent" 
                    isActive={activeAgent === 'PlanningAgent'} 
                />
            </div>
        </div>
    );
}
```

## Summary

Building effective frontends for multi-agent systems requires:

1. **Real-time tracking** of active agents
2. **Event visualization** for transparency
3. **Streaming support** for responsive UX
4. **Clear visual distinction** between agents
5. **Handoff indicators** for context

The components in this section provide a foundation for building rich multi-agent interfaces that help users understand and interact with complex AI systems.
