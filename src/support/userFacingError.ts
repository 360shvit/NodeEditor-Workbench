// For local UI only. Diagnostic storage separately excludes raw error text.
export function userFacingError(error: unknown, fallback = 'The operation failed. Try again.'): string {
  try {
    const message = typeof error === 'string' ? error : error instanceof Error ? error.message : undefined;
    return typeof message === 'string' && message.trim() ? message.slice(0, 8000) : fallback;
  } catch {
    return fallback;
  }
}
