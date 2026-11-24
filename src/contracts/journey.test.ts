import { describe, expect, it } from "vitest";
import { noteSchema, replyFormSchema } from "./journey";
import { FINDING_KINDS } from "./finding";
import { replyGuide } from "./reply-guide";

const id = "3f2b8c1e-6c1a-4b7e-9a51-0d2f4e6a8b10";

describe("observação do lead", () => {
  it("guarda o texto aparado", () => {
    const r = noteSchema.parse({ leadId: id, note: "  número é robô; ligar no fixo  " });
    expect(r.note).toBe("número é robô; ligar no fixo");
  });
  it("texto vazio apaga a observação", () => {
    expect(noteSchema.parse({ leadId: id, note: "   " }).note).toBeNull();
  });
  it("recusa texto longo demais e lead inválido", () => {
    expect(noteSchema.safeParse({ leadId: id, note: "x".repeat(2001) }).success).toBe(false);
    expect(noteSchema.safeParse({ leadId: "abc", note: "ok" }).success).toBe(false);
  });
});

describe("resposta do lead", () => {
  it("guarda o que a pessoa escreveu, e aceita sem texto", () => {
    const com = replyFormSchema.parse({
      contactId: id,
      replyKind: "pessoa",
      replyText: "  é correria  ",
    });
    expect(com.replyText).toBe("é correria");
    expect(replyFormSchema.parse({ contactId: id, replyKind: "robo" }).replyText).toBeNull();
    expect(
      replyFormSchema.safeParse({ contactId: id, replyKind: "pessoa", replyText: "x".repeat(4001) })
        .success,
    ).toBe(false);
  });
});

describe("roteiro do que responder", () => {
  it("todo tipo de achado tem roteiro, com pelo menos 4 situações", () => {
    for (const k of [...FINDING_KINDS, undefined])
      expect(replyGuide(k).cases.length).toBeGreaterThanOrEqual(4);
  });
  it("cada resposta sugerida fecha com pergunta e não promete resultado", () => {
    for (const k of FINDING_KINDS) {
      for (const c of replyGuide(k).cases) {
        expect(c.text.trim().endsWith("?"), `${k}: ${c.when}`).toBe(true);
        expect(c.text).not.toMatch(/garant|dobr|resultado certo|\{/i);
      }
    }
  });
});
