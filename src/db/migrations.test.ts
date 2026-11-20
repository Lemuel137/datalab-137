import { describe, expect, it } from "vitest";
import { planMigrations, splitStatements } from "./migrations";

const tags = ["0000_a", "0001_b", "0002_c", "0003_d"];

describe("planMigrations", () => {
  it("banco vazio: roda todas, na ordem", () => {
    expect(planMigrations({ tags, applied: [], hasSchema: false, baseline: "0001_b" })).toEqual({
      baseline: [],
      run: tags,
    });
  });

  it("banco que já existia sem controle: marca até a linha de base e roda só o que veio depois", () => {
    expect(planMigrations({ tags, applied: [], hasSchema: true, baseline: "0001_b" })).toEqual({
      baseline: ["0000_a", "0001_b"],
      run: ["0002_c", "0003_d"],
    });
  });

  it("com controle: roda só as que faltam", () => {
    expect(
      planMigrations({
        tags,
        applied: ["0000_a", "0001_b", "0002_c"],
        hasSchema: true,
        baseline: "0001_b",
      }),
    ).toEqual({ baseline: [], run: ["0003_d"] });
    expect(
      planMigrations({ tags, applied: tags, hasSchema: true, baseline: "0001_b" }).run,
    ).toEqual([]);
  });

  it("linha de base que não existe na lista é erro, não palpite", () => {
    expect(() =>
      planMigrations({ tags, applied: [], hasSchema: true, baseline: "9999_x" }),
    ).toThrow(/linha de base/);
  });
});

describe("splitStatements", () => {
  it("separa pelo marcador do drizzle e ignora pedaço vazio", () => {
    expect(splitStatements("A;--> statement-breakpoint\nB;\n--> statement-breakpoint\n  ")).toEqual(
      ["A;", "B;"],
    );
  });
});
