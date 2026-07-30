// Zero-dependency — deliberately does not import lib/data.ts (which pulls
// in the Supabase client). Safe for client bundles that only need the
// provider display name (e.g. the ticker search dropdown) without dragging
// in query functions or creating a redundant Supabase client instance.
const PROVIDER_LABEL: Record<string, string> = {
  yieldmax: "YieldMax",
  roundhill: "Roundhill",
  defiance: "Defiance",
};

export function providerLabel(providerId: string) {
  return PROVIDER_LABEL[providerId] ?? providerId;
}
