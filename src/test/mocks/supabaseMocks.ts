import { http, HttpResponse } from 'msw';

export const TEST_SUPABASE_URL = 'https://test.supabase.co';
export const TEST_SUPABASE_USER_ID = 'test-user-123';

type TableName =
  | 'chains'
  | 'scheduled_sessions'
  | 'active_sessions'
  | 'completion_history';
type JsonRow = Record<string, unknown>;
type RpcName = 'create_rsip_nodes_with_meta' | 'archive_rsip_nodes_and_remove';

export interface SupabaseRpcCall {
  name: RpcName;
  args: Record<string, unknown>;
}

const mockUser = {
  id: TEST_SUPABASE_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@momentum.app',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  confirmed_at: '2026-01-01T00:00:00.000Z',
  last_sign_in_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {},
  identities: [],
};

const tables: Record<TableName, Map<string, JsonRow>> = {
  chains: new Map(),
  scheduled_sessions: new Map(),
  active_sessions: new Map(),
  completion_history: new Map(),
};

let authenticated = false;
let generatedId = 0;
const rpcCalls: SupabaseRpcCall[] = [];
let pendingFailure:
  | {
      method: string;
      table: TableName;
      remaining: number;
    }
  | undefined;
let pendingRpcFailure:
  | {
      name: RpcName;
      remaining: number;
    }
  | undefined;

export function resetSupabaseMockState(): void {
  for (const table of Object.values(tables)) table.clear();
  authenticated = false;
  generatedId = 0;
  rpcCalls.length = 0;
  pendingFailure = undefined;
  pendingRpcFailure = undefined;
}

export function getSupabaseRpcCalls(): SupabaseRpcCall[] {
  return rpcCalls.map((call) => ({
    name: call.name,
    args: structuredClone(call.args),
  }));
}

export function failSupabaseRpcRequests(name: RpcName, count = 1): void {
  pendingRpcFailure = { name, remaining: count };
}

export function failSupabaseTransportRequests(
  method: string,
  table: TableName,
  count = 1,
): void {
  pendingFailure = {
    method: method.toUpperCase(),
    table,
    remaining: count,
  };
}

function takeFailure(method: string, table: TableName): Response | undefined {
  if (
    !pendingFailure ||
    pendingFailure.method !== method ||
    pendingFailure.table !== table ||
    pendingFailure.remaining <= 0
  ) {
    return undefined;
  }
  pendingFailure.remaining -= 1;
  if (pendingFailure.remaining === 0) pendingFailure = undefined;
  return HttpResponse.error();
}

function asRows(body: unknown): JsonRow[] {
  if (Array.isArray(body)) return body as JsonRow[];
  return [body as JsonRow];
}

function tableKey(table: TableName, row: JsonRow): string {
  if (table === 'chains' || table === 'active_sessions') {
    return String(row.id ?? `generated-${generatedId++}`);
  }
  if (table === 'scheduled_sessions') {
    return `${String(row.user_id)}:${String(row.chain_id)}`;
  }
  return `${String(row.user_id)}:${String(row.chain_id)}:${String(
    row.completed_at,
  )}`;
}

function parseInValues(value: string): string[] {
  return value
    .slice(4, -1)
    .split(',')
    .map((item) => item.replace(/^"|"$/g, ''));
}

function matchesFilter(row: JsonRow, column: string, value: string): boolean {
  if (value.startsWith('eq.')) {
    return String(row[column]) === value.slice(3);
  }
  if (value === 'is.null') return row[column] == null;
  if (value === 'not.is.null') return row[column] != null;
  if (value.startsWith('in.(') && value.endsWith(')')) {
    return parseInValues(value).includes(String(row[column]));
  }
  if (value.startsWith('lt.')) {
    return String(row[column]) < value.slice(3);
  }
  return true;
}

function filteredRows(table: TableName, requestUrl: string): JsonRow[] {
  const url = new URL(requestUrl);
  let rows = [...tables[table].values()];
  const ignored = new Set([
    'select',
    'order',
    'limit',
    'offset',
    'on_conflict',
  ]);

  for (const [column, value] of url.searchParams) {
    if (!ignored.has(column)) {
      rows = rows.filter((row) => matchesFilter(row, column, value));
    }
  }

  const order = url.searchParams.get('order');
  if (order) {
    const [column, direction] = order.split('.');
    rows.sort(
      (a, b) =>
        String(a[column]).localeCompare(String(b[column])) *
        (direction === 'desc' ? -1 : 1),
    );
  }

  const limit = Number(url.searchParams.get('limit'));
  return Number.isFinite(limit) && limit > 0 ? rows.slice(0, limit) : rows;
}

function createTableHandlers(table: TableName) {
  const endpoint = `${TEST_SUPABASE_URL}/rest/v1/${table}`;
  return [
    http.get(endpoint, ({ request }) => {
      const failure = takeFailure('GET', table);
      if (failure) return failure;
      return HttpResponse.json(filteredRows(table, request.url));
    }),
    http.post(endpoint, async ({ request }) => {
      const failure = takeFailure('POST', table);
      if (failure) return failure;

      const rows = asRows(await request.json());
      const prefer = request.headers.get('prefer') ?? '';
      const ignoreDuplicates = prefer.includes('resolution=ignore-duplicates');
      const stored: JsonRow[] = [];
      for (const row of rows) {
        const key = tableKey(table, row);
        if (ignoreDuplicates && tables[table].has(key)) continue;
        const next = { ...tables[table].get(key), ...row };
        tables[table].set(key, next);
        stored.push(next);
      }
      return HttpResponse.json(stored, {
        status: 201,
        headers: { 'content-range': `0-${Math.max(0, stored.length - 1)}/*` },
      });
    }),
    http.patch(endpoint, async ({ request }) => {
      const failure = takeFailure('PATCH', table);
      if (failure) return failure;

      const patch = (await request.json()) as JsonRow;
      const matched = filteredRows(table, request.url);
      const updated = matched.map((row) => ({ ...row, ...patch }));
      for (const row of updated) tables[table].set(tableKey(table, row), row);
      return HttpResponse.json(updated);
    }),
    http.delete(endpoint, ({ request }) => {
      const failure = takeFailure('DELETE', table);
      if (failure) return failure;

      const matched = filteredRows(table, request.url);
      for (const row of matched) tables[table].delete(tableKey(table, row));
      return HttpResponse.json(matched);
    }),
  ];
}

function authResponse() {
  return {
    access_token: 'mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-refresh-token',
    user: mockUser,
  };
}

export const supabaseMockHandlers = [
  http.get(`${TEST_SUPABASE_URL}/auth/v1/user`, () => {
    if (!authenticated) {
      return HttpResponse.json(
        { code: 401, msg: 'Invalid JWT' },
        { status: 401 },
      );
    }
    return HttpResponse.json(mockUser);
  }),
  http.post(`${TEST_SUPABASE_URL}/auth/v1/signup`, () => {
    authenticated = true;
    return HttpResponse.json(authResponse());
  }),
  http.post(`${TEST_SUPABASE_URL}/auth/v1/token`, () => {
    authenticated = true;
    return HttpResponse.json(authResponse());
  }),
  http.post(`${TEST_SUPABASE_URL}/auth/v1/logout`, () => {
    authenticated = false;
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(
    `${TEST_SUPABASE_URL}/rest/v1/rpc/:functionName`,
    async ({ params, request }) => {
      const name = String(params.functionName) as RpcName;
      if (
        name !== 'create_rsip_nodes_with_meta' &&
        name !== 'archive_rsip_nodes_and_remove'
      ) {
        return HttpResponse.json(
          {
            code: 'PGRST202',
            message: `Unknown RPC: ${name}`,
            details: null,
            hint: null,
          },
          { status: 404 },
        );
      }

      if (!authenticated) {
        return HttpResponse.json(
          {
            code: '28000',
            message: 'Authentication required',
            details: null,
            hint: null,
          },
          { status: 401 },
        );
      }

      const args = (await request.json()) as Record<string, unknown>;
      rpcCalls.push({ name, args });
      if (pendingRpcFailure?.name === name) {
        pendingRpcFailure.remaining -= 1;
        if (pendingRpcFailure.remaining === 0) pendingRpcFailure = undefined;
        return HttpResponse.error();
      }

      if (name === 'create_rsip_nodes_with_meta') {
        return HttpResponse.json({
          nodes: args.p_nodes,
          meta: args.p_meta,
        });
      }
      return HttpResponse.json({
        removed_node_ids: args.p_node_ids,
        library_entries: [],
      });
    },
  ),
  ...createTableHandlers('chains'),
  ...createTableHandlers('scheduled_sessions'),
  ...createTableHandlers('active_sessions'),
  ...createTableHandlers('completion_history'),
];
