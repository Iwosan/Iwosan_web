import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnchorDirection, AnchorInteraction } from '@/services/anchor.service';

const MAX_ENTRIES = 20;

export interface AnchorActivity {
  id: string;
  direction: AnchorDirection;
  status: string;
  url: string;
  account: string;
  amount: string | null;
  assetCode: string;
  startedAt: string;
}

interface AnchorState {
  activity: AnchorActivity[];
  record: (
    interaction: AnchorInteraction,
    details: { account: string; amount: string | null; assetCode: string },
  ) => void;
  clear: () => void;
}

/** Cash-in and cash-out requests started from this browser, newest first. */
export const useAnchorStore = create<AnchorState>()(
  persist(
    (set) => ({
      activity: [],
      record: (interaction, details) =>
        set((state) => ({
          activity: [
            {
              id: interaction.id,
              direction: interaction.direction,
              status: interaction.status,
              url: interaction.url,
              ...details,
              startedAt: new Date().toISOString(),
            },
            ...state.activity.filter((entry) => entry.id !== interaction.id),
          ].slice(0, MAX_ENTRIES),
        })),
      clear: () => set({ activity: [] }),
    }),
    { name: 'iwosan-anchor-activity' },
  ),
);
