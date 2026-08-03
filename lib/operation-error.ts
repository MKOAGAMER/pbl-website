export class LeagueOperationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LeagueOperationError';
  }
}

export function operationErrorResponse(error: unknown) {
  if (error instanceof LeagueOperationError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  console.error('[league-operation]', error instanceof Error ? error.message : error);
  return Response.json(
    { error: 'League operation failed', code: 'operation_failed' },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  );
}
