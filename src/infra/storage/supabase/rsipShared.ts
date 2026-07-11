import type { SupabaseStorageContext } from './types';
import {
  isSchemaMissing,
  type SupabaseLikeError,
} from './rsipNodeCapabilities';

type OrderedRowsClient = {
  from: (tableName: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => Promise<{
          data: Record<string, unknown>[] | null;
          error: SupabaseLikeError | null;
        }>;
      };
    };
  };
};

export async function replaceUserScopedRows(
  ctx: SupabaseStorageContext,
  table: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  const user = await ctx.getCurrentUser();
  if (!user) return;

  const client = ctx.getClient() as unknown as {
    from: (tableName: string) => {
      delete: () => {
        eq: (
          column: string,
          value: string,
        ) => Promise<{ error: SupabaseLikeError | null }>;
      };
      insert: (
        payload: Record<string, unknown>[],
      ) => Promise<{ error: SupabaseLikeError | null }>;
    };
  };

  const { error: deleteError } = await client
    .from(table)
    .delete()
    .eq('user_id', user.id);
  if (deleteError) {
    if (isSchemaMissing(deleteError)) return;
    throw new Error(`Failed to clear ${table}: ${deleteError.message}`);
  }
  if (rows.length === 0) return;

  const { error: insertError } = await client.from(table).insert(rows);
  if (insertError) {
    if (isSchemaMissing(insertError)) return;
    throw new Error(`Failed to save ${table}: ${insertError.message}`);
  }
}

export async function getUserScopedOrderedRows(
  ctx: SupabaseStorageContext,
  options: {
    table: string;
    orderBy: string;
    ascending: boolean;
    errorLabel: string;
  },
): Promise<{ userId: string | null; rows: Record<string, unknown>[] }> {
  const user = await ctx.getCurrentUser();
  if (!user) return { userId: null, rows: [] };

  const client = ctx.getClient() as unknown as OrderedRowsClient;
  const { data, error } = await client
    .from(options.table)
    .select('*')
    .eq('user_id', user.id)
    .order(options.orderBy, { ascending: options.ascending });

  if (error) {
    if (isSchemaMissing(error)) return { userId: user.id, rows: [] };
    throw new Error(`Failed to load ${options.errorLabel}: ${error.message}`);
  }
  return { userId: user.id, rows: data ?? [] };
}
