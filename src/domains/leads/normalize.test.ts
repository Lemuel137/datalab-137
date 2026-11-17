import { describe, expect, it } from "vitest";
import { parseCsv } from "./normalize";
import { isDuplicate, dedupe } from "./dedupe";

describe("parseCsv", () => {
  it("lê cabeçalho com BOM e respeita campo entre aspas com vírgula", () => {
    const csv =
      '\uFEFFclasse,nota,nome,endereco\nrede,100,Espaçolaser,"Av. Toledo, 350 - Campinas"\n';
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].nome).toBe("Espaçolaser");
    expect(rows[0].endereco).toBe("Av. Toledo, 350 - Campinas");
  });

  it("ignora linha vazia no fim", () => {
    expect(parseCsv("a,b\n1,2\n\n")).toHaveLength(1);
  });
});

describe("dedupe", () => {
  it("detecta duplicata por @ do Instagram mesmo com URL completa", () => {
    const a = { instagram: "@ClinicaEstetica" };
    const b = { instagram: "https://www.instagram.com/clinicaestetica/" };
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("detecta duplicata por telefone formatado de forma diferente", () => {
    expect(isDuplicate({ phone: "+55 19 99676-9349" }, { phone: "5519996769349" })).toBe(true);
  });

  it("detecta duplicata por domínio, ignorando www e protocolo", () => {
    expect(isDuplicate({ site: "https://www.uma.com.br/x" }, { site: "uma.com.br" })).toBe(true);
  });

  it("não marca como duplicata dois leads sem campo em comum", () => {
    expect(isDuplicate({ instagram: "a" }, { instagram: "b" })).toBe(false);
  });

  it("separa únicos e duplicatas preservando o primeiro", () => {
    const out = dedupe([
      { instagram: "a", nome: "primeiro" },
      { instagram: "b", nome: "segundo" },
      { instagram: "a", nome: "terceiro" },
    ]);
    expect(out.unique.map((u) => u.nome)).toEqual(["primeiro", "segundo"]);
    expect(out.duplicates.map((u) => u.nome)).toEqual(["terceiro"]);
  });
});
