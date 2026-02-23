declare module "pacote" {
  export function packument(name: string, opts?: Record<string, unknown>): Promise<unknown>;
}
