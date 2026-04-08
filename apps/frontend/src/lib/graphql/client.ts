import { GRAPHQL_BFF_URL } from '@/lib/config';

interface GraphqlErrorPayload {
  message: string;
}

interface GraphqlResponse<TData> {
  data?: TData;
  errors?: GraphqlErrorPayload[];
}

export class GraphqlRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphqlRequestError';
  }
}

export async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  query: string,
  variables?: TVariables,
  token?: string | null,
): Promise<TData> {
  const response = await fetch(
    GRAPHQL_BFF_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      cache: 'no-store',
    },
  );

  const payload = (await response.json()) as GraphqlResponse<TData>;

  if (!response.ok) {
    const message = payload.errors?.[0]?.message ?? 'GraphQL request failed';

    throw new GraphqlRequestError(message);
  }

  if (payload.errors?.length) {
    throw new GraphqlRequestError(payload.errors[0].message);
  }

  if (!payload.data) {
    throw new GraphqlRequestError('GraphQL response does not contain data');
  }

  return payload.data;
}
