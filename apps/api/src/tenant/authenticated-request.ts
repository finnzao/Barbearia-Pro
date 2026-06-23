export interface AuthenticatedUser {
  id: string;
  barbeariaId: string;
  papel: string;
  profissionalId?: string | null;
}

export interface TenantRequest {
  user?: AuthenticatedUser;
  tenantId?: string;
  requestId?: string;
  method: string;
  originalUrl: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface HttpResponse {
  statusCode: number;
  status(code: number): HttpResponse;
  json(body: unknown): unknown;
  setHeader(name: string, value: string): void;
  on(event: string, listener: () => void): void;
}
