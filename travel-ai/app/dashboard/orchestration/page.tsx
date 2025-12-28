/**
 * Orchestration Patterns Overview Page
 *
 * Landing page for multi-agent orchestration demos.
 * Explains the patterns and provides navigation to each demo.
 */

'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

const patterns = [
  {
    id: 'supervisor',
    title: 'Supervisor Pattern',
    subtitle: 'Hierarchical Multi-Agent System',
    description:
      'A central supervisor agent receives all requests and delegates to specialized agents (Flight, Hotel, Activity). Results are synthesized before responding to the user.',
    icon: (
      <svg
        className="w-8 h-8"
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
    ),
    color: 'purple',
    agents: ['Supervisor', 'FlightAgent', 'HotelAgent', 'ActivityAgent'],
    pros: [
      'Centralized control and coordination',
      'Better for complex multi-step tasks',
      'Easy to add new specialized agents',
      'Compatible with third-party agents',
    ],
    cons: [
      'Higher token usage (coordination overhead)',
      'Single point of coordination',
    ],
    href: '/dashboard/orchestration/supervisor',
  },
  {
    id: 'swarm',
    title: 'Swarm Pattern',
    subtitle: 'Decentralized Multi-Agent System',
    description:
      'Agents dynamically hand off control to each other based on conversation context. The active agent responds directly to the user without central coordination.',
    icon: (
      <svg
        className="w-8 h-8"
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
    ),
    color: 'cyan',
    agents: ['ResearchAgent', 'BookingAgent', 'PlanningAgent'],
    pros: [
      'More token-efficient',
      'Direct agent-to-user responses',
      'Natural conversational flow',
      'Remembers active agent across turns',
    ],
    cons: [
      'All agents must know each other',
      'Less suitable for third-party agents',
    ],
    href: '/dashboard/orchestration/swarm',
  },
]

export default function OrchestrationPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Multi-Agent Orchestration
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Explore different patterns for coordinating multiple AI agents. Each
          pattern has its strengths and is suited for different use cases in
          travel planning.
        </p>
      </div>

      {/* Architecture Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Pattern Comparison</CardTitle>
          <CardDescription>
            Understanding the differences between orchestration patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Supervisor Diagram */}
            <div className="text-center">
              <h3 className="font-semibold mb-4 text-purple-600">
                Supervisor Pattern
              </h3>
              <div className="bg-muted/50 rounded-lg p-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium">
                    User
                  </div>
                  <div className="w-0.5 h-6 bg-purple-300" />
                  <div className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium">
                    Supervisor
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-0.5 bg-purple-300" />
                    <div className="w-0.5 h-6 bg-purple-300" />
                    <div className="w-12 h-0.5 bg-purple-300" />
                  </div>
                  <div className="flex gap-4">
                    <div className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm">
                      Flight
                    </div>
                    <div className="px-3 py-1.5 bg-green-500 text-white rounded text-sm">
                      Hotel
                    </div>
                    <div className="px-3 py-1.5 bg-orange-500 text-white rounded text-sm">
                      Activity
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                All communication through supervisor
              </p>
            </div>

            {/* Swarm Diagram */}
            <div className="text-center">
              <h3 className="font-semibold mb-4 text-cyan-600">
                Swarm Pattern
              </h3>
              <div className="bg-muted/50 rounded-lg p-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium">
                    User
                  </div>
                  <div className="w-0.5 h-6 bg-cyan-300" />
                  <div className="flex gap-4 items-center">
                    <div className="px-3 py-1.5 bg-cyan-600 text-white rounded text-sm ring-2 ring-cyan-300">
                      Research
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-cyan-400">↔</span>
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-500 text-white rounded text-sm">
                      Booking
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-cyan-400">↔</span>
                    </div>
                    <div className="px-3 py-1.5 bg-amber-500 text-white rounded text-sm">
                      Planning
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Dynamic handoffs between agents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {patterns.map((pattern) => (
          <Card key={pattern.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${pattern.color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-cyan-100 text-cyan-600'}`}
                >
                  {pattern.icon}
                </div>
                <div>
                  <CardTitle>{pattern.title}</CardTitle>
                  <CardDescription>{pattern.subtitle}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground mb-4">
                {pattern.description}
              </p>

              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Agents
                </p>
                <div className="flex flex-wrap gap-2">
                  {pattern.agents.map((agent) => (
                    <span
                      key={agent}
                      className={`px-2 py-1 rounded text-xs font-medium ${pattern.color === 'purple' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'}`}
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs font-medium text-green-600 mb-2">
                    Pros
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {pattern.pros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-green-500 mt-0.5">+</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-red-600 mb-2">Cons</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {pattern.cons.map((con, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-red-500 mt-0.5">-</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-auto">
                <Button
                  asChild
                  className={`w-full ${pattern.color === 'purple' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-cyan-500 hover:bg-cyan-600'}`}
                >
                  <Link href={pattern.href as any}>
                    Try {pattern.title}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
