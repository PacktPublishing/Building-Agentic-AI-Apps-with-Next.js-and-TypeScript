export interface UsageEntry {
  transport: "http";
  kind: "tool" | "prompt";
  name: string;
  success: boolean;
  startedAt: string;
  durationMs: number;
  totalDurationMs: number;
  inputChars?: number;
  outputChars?: number;
  errorMessage?: string;
}

export async function persistUsage(entry: UsageEntry): Promise<void> {
  // Log to console for development
  console.log(`[${entry.kind.toUpperCase()}] ${entry.name}`, {
    success: entry.success,
    duration: `${entry.durationMs}ms`,
    ...(entry.errorMessage && { error: entry.errorMessage }),
  });

  // In a real implementation, you might want to persist to a database
  // For now, we'll just log to console
}
