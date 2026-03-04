-- Criar buckets de storage para imagens
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('product-photos', 'product-photos', true),
  ('store-logos', 'store-logos', true);

-- Políticas para product-photos bucket
CREATE POLICY "Usuários podem visualizar fotos de produtos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-photos');

CREATE POLICY "Usuários podem fazer upload de fotos de produtos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem atualizar suas fotos de produtos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem deletar suas fotos de produtos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Políticas para store-logos bucket
CREATE POLICY "Usuários podem visualizar logos de lojas"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-logos');

CREATE POLICY "Usuários podem fazer upload de logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem atualizar suas logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'store-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem deletar suas logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'store-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);