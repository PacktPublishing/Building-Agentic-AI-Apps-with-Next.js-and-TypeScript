export function lastAnswer(result: { messages?: Array<{ content?: unknown; _getType?: () => string }> }): string {
  const last = [...(result.messages ?? [])].reverse().find((item) => item._getType?.() === 'ai');
  return typeof last?.content === 'string' ? last.content : '';
}
