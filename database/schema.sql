-- Schema for the source movie catalogue that sync/sync.php reads from.
-- Usage: mysql -u root -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS moviedb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE moviedb;

CREATE TABLE IF NOT EXISTS movies (
    id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    title         VARCHAR(255)  NOT NULL,
    overview      TEXT          NULL,
    genre         VARCHAR(255)  NULL COMMENT 'Comma-separated, e.g. "Action, Drama"',
    release_date  DATE          NULL,
    vote_average  DECIMAL(3,1)  NULL COMMENT '0.0 – 10.0',
    poster_url    VARCHAR(512)  NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;
