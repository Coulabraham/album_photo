-- Album d'anniversaire romantique — MySQL 8 / MariaDB 10.4+
CREATE DATABASE IF NOT EXISTS anniversaire
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE anniversaire;

CREATE TABLE IF NOT EXISTS photos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    media_type ENUM('image', 'video') NOT NULL DEFAULT 'image',
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    memory_date DATE NULL,
    source ENUM('webcam', 'upload') NOT NULL DEFAULT 'upload',
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_photos_filename (filename),
    KEY idx_photos_created_at (created_at),
    KEY idx_photos_memory_date (memory_date),
    KEY idx_photos_media_type (media_type),
    KEY idx_photos_source (source),
    KEY idx_photos_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(80) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Créez ensuite le compte administrateur avec create_admin.php (voir README.md).
