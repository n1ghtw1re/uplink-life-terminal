import type { QueryClient } from '@tanstack/react-query';

const APP_QUERY_KEYS = [
  ['operator'],
  ['stats'],
  ['skills'],
  ['tools'],
  ['augments'],
  ['media'],
  ['media-library'],
  ['courses'],
  ['courses-all'],
  ['projects'],
  ['project-obj-counts'],
  ['tool-progress'],
  ['augment-progress'],
  ['class'],
  ['xp-recent'],
  ['quick-log-templates'],
  ['tool-session-counts'],
  ['tool-last-session'],
  ['skill-session-counts'],
  ['skill-last-session'],
  ['augment-session-counts'],
  ['augment-last-session'],
  ['checkins-heatmap'],
  ['checkin-today'],
  ['habits'],
  ['habit-logs-today'],
  ['arsenal-counts'],
  ['sessions-all'],
  ['notes'],
];

export async function refreshAppData(queryClient: QueryClient) {
  await Promise.all(
    APP_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  );

  await queryClient.refetchQueries({ type: 'active' });
}
