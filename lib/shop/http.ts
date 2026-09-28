import { z } from "zod";
import type { ErrorCode, ErrorResponse } from "./schemas/common";

export function jsonError(code: ErrorCode, status: number, message: string) {
  return Response.json({ code, message } satisfies ErrorResponse, { status });
}

export function validationError(error: z.ZodError) {
  return jsonError("VALIDATION_ERROR", 400, z.prettifyError(error));
}
