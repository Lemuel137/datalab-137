import { describe, expect, it } from "vitest";
import { senhaConfere } from "./password";

describe("senhaConfere", () => {
  it("aceita a senha correta", () => {
    expect(senhaConfere("senha-de-teste-123", "senha-de-teste-123")).toBe(true);
  });

  it("recusa senha errada", () => {
    expect(senhaConfere("outra-coisa", "senha-de-teste-123")).toBe(false);
  });

  it("recusa senha vazia", () => {
    expect(senhaConfere("", "senha-de-teste-123")).toBe(false);
  });

  it("recusa quando não há senha configurada", () => {
    expect(senhaConfere("qualquer-coisa", undefined)).toBe(false);
  });

  it("recusa senha configurada curta demais", () => {
    expect(senhaConfere("curta", "curta")).toBe(false);
  });

  it("diferencia maiúscula de minúscula", () => {
    expect(senhaConfere("Senha-de-teste-123", "senha-de-teste-123")).toBe(false);
  });
});
