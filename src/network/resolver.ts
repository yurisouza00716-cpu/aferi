import { lookup } from "node:dns/promises";

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

/** Recebe um nome (ASCII/punycode) e devolve os endereços IP associados. */
export type Resolver = (hostname: string) => Promise<ResolvedAddress[]>;

export type ResolveErrorKind = "not_found" | "timeout" | "failed";

export class ResolveError extends Error {
  readonly kind: ResolveErrorKind;

  constructor(kind: ResolveErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

export const DEFAULT_TIMEOUT_MS = 5000;

/** Resolvedor padrão: usa o DNS configurado no sistema operacional. */
export function createSystemResolver(timeoutMs: number = DEFAULT_TIMEOUT_MS): Resolver {
  return async (hostname) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ResolveError("timeout")), timeoutMs);
    });

    try {
      const result = await Promise.race([lookup(hostname, { all: true, verbatim: true }), timeout]);
      return result.map((r) => ({ address: r.address, family: r.family === 6 ? 6 : 4 }));
    } catch (err) {
      if (err instanceof ResolveError) throw err;
      const code = (err as { code?: string }).code;
      if (code === "ENOTFOUND" || code === "ENODATA") throw new ResolveError("not_found");
      throw new ResolveError("failed");
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };
}