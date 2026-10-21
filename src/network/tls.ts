import { connect } from "node:tls";
import { classifyAddress } from "./ipGuard";
import { toCertificateInfo, type CertificateInfo, type RawCertificate } from "./certificate";

export interface TlsTarget {
  /** IP já validado como público. */
  ip: string;
  port: number;
  /** Nome do site (SNI e verificação do nome no certificado). */
  servername: string;
  timeoutMs: number;
}

export interface TlsProbeResult {
  authorized: boolean;
  /** Código do problema de verificação (ex.: CERT_HAS_EXPIRED) ou null. */
  authorizationError: string | null;
  certificate: CertificateInfo | null;
}

export type TlsProbe = (target: TlsTarget) => Promise<TlsProbeResult>;

export type TlsProbeErrorKind = "timeout" | "refused" | "failed" | "blocked";

export class TlsProbeError extends Error {
  readonly kind: TlsProbeErrorKind;

  constructor(kind: TlsProbeErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

export const DEFAULT_TLS_TIMEOUT_MS = 5000;

function errorCodeOf(raw: unknown): string | null {
  if (typeof raw === "string" && raw !== "") return raw;
  if (typeof raw === "object" && raw !== null) {
    const code = (raw as { code?: unknown }).code;
    if (typeof code === "string" && code !== "") return code;
  }
  return null;
}

/**
 * Sonda real: faz o handshake TLS e lê o certificado. Não envia requisição HTTP.
 * Defesa em profundidade: recusa qualquer IP que não seja público, mesmo que
 * quem chama tenha falhado em validar.
 */
export function createSystemTlsProbe(): TlsProbe {
  return (target) =>
    new Promise<TlsProbeResult>((resolve, reject) => {
      if (classifyAddress(target.ip) !== "public") {
        reject(new TlsProbeError("blocked"));
        return;
      }

      let settled = false;
      let socket: ReturnType<typeof connect>;
      try {
        socket = connect({
          host: target.ip,
          port: target.port,
          servername: target.servername,
          // Queremos LER o certificado mesmo quando ele é inválido.
          // O resultado da verificação vem em socket.authorized/authorizationError.
          rejectUnauthorized: false,
          minVersion: "TLSv1.2",
        });
      } catch {
        reject(new TlsProbeError("failed"));
        return;
      }

      const timer = setTimeout(
        () => finish(() => reject(new TlsProbeError("timeout"))),
        target.timeoutMs,
      );

      function finish(action: () => void): void {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.destroy();
        action();
      }

      socket.once("secureConnect", () => {
        try {
          const cert = socket.getPeerCertificate() as unknown as RawCertificate;
          const result: TlsProbeResult = {
            authorized: socket.authorized,
            authorizationError: errorCodeOf(socket.authorizationError as unknown),
            certificate: toCertificateInfo(cert),
          };
          finish(() => resolve(result));
        } catch {
          finish(() => reject(new TlsProbeError("failed")));
        }
      });

      socket.on("error", (err: NodeJS.ErrnoException) => {
        const kind: TlsProbeErrorKind =
          err.code === "ECONNREFUSED" ? "refused" : err.code === "ETIMEDOUT" ? "timeout" : "failed";
        finish(() => reject(new TlsProbeError(kind)));
      });
    });
}