export const DEMO_BANNER_KEY = 'sh_demo_ack';

export function shouldShowDemoBanner(storageValue: string | null): boolean {
  return storageValue == null;
}
