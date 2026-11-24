import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const fronts = pgTable("fronts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  channel: text("channel").notNull(),
  dailyLimit: integer("daily_limit").notNull().default(15),
  active: boolean("active").notNull().default(true),
  // Piso de engajamento da frente, em %. null = régua por tamanho do perfil.
  engagementMin: real("engagement_min"),
  // false para frentes em que o Instagram não é o canal (parcerias, ar-condicionado).
  usesEngagement: boolean("uses_engagement").notNull().default(true),
  // O que libera o envio na fila: "script" (medido nas últimas 24 h) ou "conferido" (no navegador, hoje).
  findingPolicy: text("finding_policy").notNull().default("conferido"),
  // Textos com {nome} e {achado}. Sem texto, a frente não entra na fila.
  messageTemplate: text("message_template"),
  followUpTemplate: text("follow_up_template"),
  // Texto da primeira mensagem por tipo de achado; quem não tem usa message_template.
  templatesByKind: jsonb("templates_by_kind").$type<Record<string, string>>().notNull().default({}),
  // Leads novos por semana, de 5 em 5; a fila divide pelos dias úteis.
  weeklyTarget: integer("weekly_target").notNull().default(25),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    frontId: uuid("front_id")
      .notNull()
      .references(() => fronts.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    category: text("category"),
    city: text("city"),
    site: text("site"),
    instagram: text("instagram"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    rating: text("rating"),
    reviewCount: integer("review_count"),
    followers: integer("followers"),
    engagementPct: real("engagement_pct"),
    stage: text("stage").notNull().default("importado"),
    source: text("source").notNull().default("csv"),
    signals: jsonb("signals").$type<Record<string, unknown>>().notNull().default({}),
    // Anotação livre de quem prospecta; aparece na fila e na página do lead.
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("leads_front_idx").on(t.frontId), index("leads_stage_idx").on(t.stage)],
);

export const findings = pgTable(
  "findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    evidenceUrl: text("evidence_url").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    confidence: text("confidence").notNull().default("media"),
    kind: text("kind").notNull().default("outro"),
    origin: text("origin").notNull().default("conferido"),
    // Partes da mensagem além do fato: algo da empresa que abre a conversa, e quem perde.
    hook: text("hook"),
    customerSide: text("customer_side"),
    // Quem escreveu gancho e lado do cliente: "ia" (rotina das 6h) ou "manual".
    hookBy: text("hook_by"),
    // Conferência no navegador, exigida a cada envio para os tipos em CHECK_KINDS.
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("findings_lead_idx").on(t.leadId)],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
    message: text("message").notNull(),
    isFollowUp: boolean("is_follow_up").notNull().default(false),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    replyKind: text("reply_kind"),
    // O que o lead escreveu, colado como veio.
    replyText: text("reply_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contacts_lead_idx").on(t.leadId)],
);

// Briefing de prospecção respondido por quem vai usar a ferramenta (sem login, por link com token).
export const briefings = pgTable("briefings", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  // Para quem é o briefing, como o Lemuel nomeou ao criar o link.
  title: text("title").notNull(),
  answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
