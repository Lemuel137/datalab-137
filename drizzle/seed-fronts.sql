INSERT INTO fronts (name, slug, channel, daily_limit, active) VALUES
  ('Clínicas', 'clinicas', 'instagram', 15, true),
  ('Negócios com dor de atendimento', 'atendimento', 'whatsapp', 20, false),
  ('Negócios com e-mail público', 'email-frio', 'email', 20, false),
  ('E-commerce (Tranco)', 'ecommerce', 'instagram', 15, true),
  ('Advogados de imigração EUA', 'imigracao-eua', 'instagram', 15, false),
  ('Parcerias de cardápio digital', 'parcerias-cardapio', 'indicacao', 5, true)
ON CONFLICT (slug) DO NOTHING;
