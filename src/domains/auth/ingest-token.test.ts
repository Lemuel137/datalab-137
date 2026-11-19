import { describe, expect, it } from "vitest";
import { checkIngestToken } from "./ingest-token";

const KEY = "k".repeat(40);

describe("checkIngestToken", () => {
  it("aceita a chave certa", () => {
    expect(checkIngestToken(`Bearer ${KEY}`, KEY)).toBe("ok");
  });
  it("recusa chave errada, de outro tamanho, sem Bearer ou ausente", () => {
    expect(checkIngestToken(`Bearer ${"x".repeat(40)}`, KEY)).toBe("negado");
    expect(checkIngestToken("Bearer curta", KEY)).toBe("negado");
    expect(checkIngestToken(KEY, KEY)).toBe("negado");
    expect(checkIngestToken(null, KEY)).toBe("negado");
  });
  it("sem chave configurada, ou curta demais, a porta fica desligada", () => {
    expect(checkIngestToken(`Bearer ${KEY}`, undefined)).toBe("desligada");
    expect(checkIngestToken("Bearer abc", "abc")).toBe("desligada");
  });
});
