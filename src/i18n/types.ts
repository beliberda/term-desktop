export type IpcErrorPayload = {
  code: string;
  details?: Record<string, unknown>;
};

export type AppError = IpcErrorPayload;
