-- 2: hamle kaydı ve ölüm sebebi (oyunlar tekrar oynatılıp ölçülebilsin)
ALTER TABLE scores ADD COLUMN ver INTEGER;
ALTER TABLE scores ADD COLUMN steps INTEGER;
ALTER TABLE scores ADD COLUMN actions TEXT;
ALTER TABLE scores ADD COLUMN cause TEXT;
ALTER TABLE scores ADD COLUMN after INTEGER;
