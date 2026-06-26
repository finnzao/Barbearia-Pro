export interface ClienteAutenticado {
  id: string;
  barbeariaId: string;
}

export interface ClienteRequest {
  cliente?: ClienteAutenticado;
  headers: Record<string, string | string[] | undefined>;
}
