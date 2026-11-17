import { describe, expect, it } from "vitest";
import { outreachFormSchema } from "./outreach";

describe("outreachFormSchema", () => {
  it("aceita canal válido e lote positivo", () => {
    expect(outreachFormSchema.safeParse({ channel: "instagram", requested: "5" }).success).toBe(
      true,
    );
  });

  it("converte o lote de texto para número", () => {
    const r = outreachFormSchema.safeParse({ channel: "whatsapp", requested: "12" });
    expect(r.success && r.data.requested).toBe(12);
  });

  it("recusa lote zero", () => {
    expect(outreachFormSchema.safeParse({ channel: "instagram", requested: 0 }).success).toBe(
      false,
    );
  });

  it("recusa lote negativo", () => {
    expect(outreachFormSchema.safeParse({ channel: "instagram", requested: -3 }).success).toBe(
      false,
    );
  });

  it("recusa canal fora do catálogo", () => {
    expect(outreachFormSchema.safeParse({ channel: "telegram", requested: 1 }).success).toBe(false);
  });
});
