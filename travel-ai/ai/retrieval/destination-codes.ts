/** Explicit, deterministic country/city aliases for payloads stored as IATA codes. */
export const DESTINATION_CODE_ALIASES: Record<string, string[]> = {
  france: ['CDG', 'ORY', 'NCE', 'LYS', 'MRS'],
  paris: ['CDG', 'ORY'],
  spain: ['BCN', 'MAD', 'AGP', 'SVQ', 'PMI'],
  italy: ['FCO', 'MXP', 'VCE', 'FLR', 'NAP'],
  germany: ['FRA', 'MUC', 'BER', 'HAM'],
  portugal: ['LIS', 'OPO', 'FAO'],
  unitedkingdom: ['LHR', 'LGW', 'STN', 'MAN', 'EDI'],
};

export function normalizeDestination(value: string): string | string[] {
  const key = value.trim().toLowerCase().replace(/[\s_-]+/g, '');
  return DESTINATION_CODE_ALIASES[key] ?? value.trim().toUpperCase();
}
