import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import type { PlannerEntry, PlannerOccurrence, PlannerOccurrenceException } from '@/types';
import {
  parsePlannerDate,
  buildFutureSeriesInput,
  comparePlannerOccurrences,
  generateOccurrencesForRange,
  sanitizePlannerEntryInput,
  toDateString,
  type PlannerEntryInput,
  type PlannerOccurrencePatch,
} from '@/services/plannerService';

type EditScope = 'THIS_OCCURRENCE' | 'ALL_FUTURE';
type DeleteScope = 'THIS_OCCURRENCE' | 'ALL_FUTURE';

async function getPlannerEntries(): Promise<PlannerEntry[]> {
  const db = await getDB();
  const res = await db.query(`SELECT * FROM planner_entries ORDER BY date ASC, time ASC NULLS LAST, created_at ASC`);
  return res.rows as unknown as PlannerEntry[];
}

async function getPlannerExceptions(): Promise<PlannerOccurrenceException[]> {
  const db = await getDB();
  const res = await db.query(`SELECT * FROM planner_exceptions ORDER BY occurrence_date ASC`);
  return res.rows as unknown as PlannerOccurrenceException[];
}

function plannerKeys(range?: { start: string; end: string }) {
  return range ? ['planner', range.start, range.end] : ['planner'];
}

export function usePlannerData() {
  const entriesQuery = useQuery({
    queryKey: ['planner-entries'],
    queryFn: getPlannerEntries,
  });

  const exceptionsQuery = useQuery({
    queryKey: ['planner-exceptions'],
    queryFn: getPlannerExceptions,
  });

  return {
    entries: entriesQuery.data ?? [],
    exceptions: exceptionsQuery.data ?? [],
    isLoading: entriesQuery.isLoading || exceptionsQuery.isLoading,
  };
}

export function usePlannerRange(start: string, end: string) {
  const { entries, exceptions, isLoading } = usePlannerData();
  if (!start || !end) return { occurrences: [] as PlannerOccurrence[], isLoading };
  const occurrences = generateOccurrencesForRange(entries, exceptions, start, end);
  return { occurrences, isLoading };
}

export function usePlannerDay(date: string) {
  const { occurrences, isLoading } = usePlannerRange(date, date);
  return { occurrences: occurrences.sort(comparePlannerOccurrences), isLoading };
}

export function usePlannerToday() {
  const today = toDateString(new Date());
  return usePlannerDay(today);
}

export function usePlannerUpcoming() {
  const today = toDateString(new Date());
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  return usePlannerRange(today, toDateString(thirtyDaysLater));
}

export function usePlannerActions() {
  const queryClient = useQueryClient();

  const invalidatePlanner = () => {
    queryClient.invalidateQueries({ queryKey: ['planner-entries'] });
    queryClient.invalidateQueries({ queryKey: ['planner-exceptions'] });
    queryClient.invalidateQueries({ queryKey: ['planner'] });
  };

  const createEntry = useMutation({
    mutationFn: async (input: PlannerEntryInput) => {
      const db = await getDB();
      const sanitized = sanitizePlannerEntryInput(input);
      await db.query(`
        INSERT INTO planner_entries (
          title, date, time, completed,
          recurrence_type, recurrence_interval, recurrence_days_of_week,
          recurrence_end_type, recurrence_end_date, recurrence_count,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, NOW())
      `, [
        sanitized.title,
        sanitized.date,
        sanitized.time,
        sanitized.completed,
        sanitized.recurrence_type,
        sanitized.recurrence_interval,
        sanitized.recurrence_days_of_week ? JSON.stringify(sanitized.recurrence_days_of_week) : null,
        sanitized.recurrence_end_type,
        sanitized.recurrence_end_date,
        sanitized.recurrence_count,
      ]);
    },
    onSuccess: invalidatePlanner,
  });

  const updateBaseEntry = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PlannerEntryInput }) => {
      const db = await getDB();
      const sanitized = sanitizePlannerEntryInput(input);
      await db.query(`
        UPDATE planner_entries
        SET title=$1, date=$2, time=$3, completed=$4,
            recurrence_type=$5, recurrence_interval=$6, recurrence_days_of_week=$7::jsonb,
            recurrence_end_type=$8, recurrence_end_date=$9, recurrence_count=$10,
            updated_at=NOW()
        WHERE id=$11
      `, [
        sanitized.title,
        sanitized.date,
        sanitized.time,
        sanitized.completed,
        sanitized.recurrence_type,
        sanitized.recurrence_interval,
        sanitized.recurrence_days_of_week ? JSON.stringify(sanitized.recurrence_days_of_week) : null,
        sanitized.recurrence_end_type,
        sanitized.recurrence_end_date,
        sanitized.recurrence_count,
        id,
      ]);
    },
    onSuccess: invalidatePlanner,
  });

  const upsertException = async (
    db: Awaited<ReturnType<typeof getDB>>,
    occurrence: PlannerOccurrence,
    patch: PlannerOccurrencePatch,
  ) => {
    await db.query(`
      INSERT INTO planner_exceptions (entry_id, occurrence_date, title, date, time, completed, is_deleted)
      VALUES ($1, $2, $3, $4, $5, $6, FALSE)
      ON CONFLICT (entry_id, occurrence_date)
      DO UPDATE SET
        title = EXCLUDED.title,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        completed = EXCLUDED.completed,
        is_deleted = FALSE
    `, [
      occurrence.entry_id,
      occurrence.occurrence_date,
      patch.title ?? occurrence.exception?.title ?? null,
      patch.date ?? occurrence.exception?.date ?? null,
      patch.time === undefined ? (occurrence.exception?.time ?? null) : patch.time,
      patch.completed ?? occurrence.exception?.completed ?? null,
    ]);
  };

  const updateOccurrence = useMutation({
    mutationFn: async ({
      occurrence,
      patch,
      scope,
      futureInput,
    }: {
      occurrence: PlannerOccurrence;
      patch: PlannerOccurrencePatch;
      scope: EditScope;
      futureInput?: PlannerEntryInput;
    }) => {
      const db = await getDB();
      if (!occurrence.isRecurring) {
        await db.query(`
          UPDATE planner_entries
          SET title=$1, date=$2, time=$3, completed=$4, updated_at=NOW()
          WHERE id=$5
        `, [
          patch.title ?? occurrence.title,
          patch.date ?? occurrence.date,
          patch.time === undefined ? occurrence.time : patch.time,
          patch.completed ?? occurrence.completed,
          occurrence.entry_id,
        ]);
        return;
      }

      if (scope === 'THIS_OCCURRENCE') {
        await upsertException(db, occurrence, patch);
        return;
      }

      const splitDate = parsePlannerDate(occurrence.occurrence_date);
      splitDate.setDate(splitDate.getDate() - 1);
      const splitEndDate = toDateString(splitDate);
      await db.query(`
        UPDATE planner_entries
        SET recurrence_end_type='ON_DATE', recurrence_end_date=$1, updated_at=NOW()
        WHERE id=$2
      `, [splitEndDate, occurrence.entry_id]);

      const newSeries = futureInput ? sanitizePlannerEntryInput(futureInput) : buildFutureSeriesInput(occurrence, patch);
      await db.query(`
        INSERT INTO planner_entries (
          title, date, time, completed,
          recurrence_type, recurrence_interval, recurrence_days_of_week,
          recurrence_end_type, recurrence_end_date, recurrence_count,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, NOW())
      `, [
        newSeries.title,
        newSeries.date,
        newSeries.time,
        newSeries.completed,
        newSeries.recurrence_type,
        newSeries.recurrence_interval,
        newSeries.recurrence_days_of_week ? JSON.stringify(newSeries.recurrence_days_of_week) : null,
        newSeries.recurrence_end_type,
        newSeries.recurrence_end_date,
        newSeries.recurrence_count,
      ]);
    },
    onSuccess: invalidatePlanner,
  });

  const toggleOccurrence = useMutation({
    mutationFn: async ({ occurrence, completed }: { occurrence: PlannerOccurrence; completed: boolean }) => {
      const db = await getDB();
      if (!occurrence.isRecurring) {
        await db.query(`UPDATE planner_entries SET completed=$1, updated_at=NOW() WHERE id=$2`, [completed, occurrence.entry_id]);
        return;
      }
      await upsertException(db, occurrence, { completed });
    },
    onSuccess: invalidatePlanner,
  });

  const deleteOccurrence = useMutation({
    mutationFn: async ({
      occurrence,
      scope,
    }: {
      occurrence: PlannerOccurrence;
      scope: DeleteScope;
    }) => {
      const db = await getDB();
      if (!occurrence.isRecurring) {
        await db.query(`DELETE FROM planner_entries WHERE id=$1`, [occurrence.entry_id]);
        return;
      }

      if (scope === 'THIS_OCCURRENCE') {
        await db.query(`
          INSERT INTO planner_exceptions (entry_id, occurrence_date, is_deleted)
          VALUES ($1, $2, TRUE)
          ON CONFLICT (entry_id, occurrence_date)
          DO UPDATE SET is_deleted = TRUE
        `, [occurrence.entry_id, occurrence.occurrence_date]);
        return;
      }

      const splitDate = parsePlannerDate(occurrence.occurrence_date);
      splitDate.setDate(splitDate.getDate() - 1);
      const splitEndDate = toDateString(splitDate);
      await db.query(`
        UPDATE planner_entries
        SET recurrence_end_type='ON_DATE', recurrence_end_date=$1, updated_at=NOW()
        WHERE id=$2
      `, [splitEndDate, occurrence.entry_id]);
    },
    onSuccess: invalidatePlanner,
  });

  return {
    createEntry: createEntry.mutateAsync,
    updateBaseEntry: updateBaseEntry.mutateAsync,
    updateOccurrence: updateOccurrence.mutateAsync,
    toggleOccurrence: toggleOccurrence.mutateAsync,
    deleteOccurrence: deleteOccurrence.mutateAsync,
  };
}
