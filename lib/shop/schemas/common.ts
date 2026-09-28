import { z } from "zod";

export const ErrorCode = z
  .enum(["VALIDATION_ERROR", "UPSTREAM_ERROR"])
  .meta({ id: "ErrorCode" });
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorResponse = z
  .object({
    code: ErrorCode,
    message: z.string(),
  })
  .meta({ id: "ErrorResponse" });
export type ErrorResponse = z.infer<typeof ErrorResponse>;
