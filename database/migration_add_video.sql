USE anniversaire;

ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS media_type ENUM('image', 'video') NOT NULL DEFAULT 'image' AFTER filepath;

ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS is_published TINYINT(1) NOT NULL DEFAULT 1 AFTER source;
