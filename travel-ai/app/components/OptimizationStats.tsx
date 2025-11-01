'use client';

import { useState, useEffect } from 'react';

interface OptimizationStats {
    messageCount: number;
    estimatedTokens: number;
    hasSummary: boolean;
    hasMetadata: boolean;
}

interface OptimizationStatsProps {
    threadId?: string;
    messageCount: number;
}

export function OptimizationStats({ threadId, messageCount }: OptimizationStatsProps) {
    const [stats, setStats] = useState<OptimizationStats | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!threadId || messageCount === 0) return;

        const fetchStats = async () => {
            try {
                const response = await fetch(`/api/chat/stats?threadId=${threadId}`);
                if (response.ok) {
                    const data = await response.json();
                    setStats(data.stats);
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };

        fetchStats();
    }, [threadId, messageCount]);

    if (!stats || messageCount === 0) return null;

    const estimatedSavings = (stats.messageCount * 500) - stats.estimatedTokens;
    const savingsPercent = ((estimatedSavings / (stats.messageCount * 500)) * 100).toFixed(1);

    return (
        <div className="border-t border-border bg-card/50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium">Optimization Stats</span>
                    <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
                        {savingsPercent}% saved
                    </span>
                </div>
                <svg 
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="px-4 pb-4 space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background rounded-lg p-3 border border-border">
                            <div className="text-xs text-muted-foreground mb-1">Messages</div>
                            <div className="text-lg font-semibold text-foreground">{stats.messageCount}</div>
                        </div>
                        <div className="bg-background rounded-lg p-3 border border-border">
                            <div className="text-xs text-muted-foreground mb-1">Tokens</div>
                            <div className="text-lg font-semibold text-foreground">
                                {stats.estimatedTokens.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="bg-background rounded-lg p-3 border border-border">
                        <div className="text-xs text-muted-foreground mb-2">Optimization Features</div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs">Summary Generated</span>
                                {stats.hasSummary ? (
                                    <span className="text-xs text-green-500 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Active
                                    </span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">Pending</span>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs">Metadata Extracted</span>
                                {stats.hasMetadata ? (
                                    <span className="text-xs text-green-500 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Active
                                    </span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">Pending</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                        <div className="text-xs text-green-600 dark:text-green-400 mb-1">Estimated Savings</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                                {estimatedSavings.toLocaleString()}
                            </span>
                            <span className="text-xs text-green-600/70 dark:text-green-400/70">tokens ({savingsPercent}%)</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
