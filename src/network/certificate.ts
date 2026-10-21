type NameField = string | string[] | undefined;

/** Parte do certificado que o Aferi usa (formato devolvido pelo Node.js). */
export interface RawCertificate {
  issuer?: Record<string, NameField>;
  subjectaltname?: string;
  valid_from?: string;
  valid_to?: string;
}

export interface CertificateInfo {
  issuer: string | null;
  /** Data ISO (UTC) ou null se não foi possível ler. */
  validFrom: string | null;
  validTo: string | null;
  altNameCount: number;
}

const MAX_TEXT = 60;
const UNSAFE_CHARS = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/**
 * Texto de certificado é controlado por quem opera o site (pode ser hostil).
 * Remove caracteres de controle e de direção de texto e limita o tamanho.
 */
export function sanitizeText(text: string): string {
  const clean = text.replace(UNSAFE_CHARS, " ").replace(/\s+/g, " ").trim();
  return clean.length > MAX_TEXT ? clean.slice(0, MAX_TEXT - 1) + "\u2026" : clean;
}

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Lê datas no formato do Node.js, ex.: "Jan  1 00:00:00 2026 GMT". */
function parseCertDate(text: string | undefined): string | null {
  if (!text) return null;
  const m = /^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{4})\s+GMT$/.exec(text.trim());
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (month === undefined) return null;
  const d = new Date(
    Date.UTC(Number(m[6]), month, Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])),
  );
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function first(value: NameField): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function toCertificateInfo(cert: RawCertificate | null | undefined): CertificateInfo | null {
  if (!cert || Object.keys(cert).length === 0) return null;

  const issuerRaw = first(cert.issuer?.O) ?? first(cert.issuer?.CN);
  const issuer = issuerRaw ? sanitizeText(issuerRaw) : "";
  const san = typeof cert.subjectaltname === "string" ? cert.subjectaltname : "";

  return {
    issuer: issuer === "" ? null : issuer,
    validFrom: parseCertDate(cert.valid_from),
    validTo: parseCertDate(cert.valid_to),
    altNameCount: (san.match(/DNS:/g) ?? []).length,
  };
}