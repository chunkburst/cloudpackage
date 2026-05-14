-- ============================================================
-- CloudPackage D1 Database Schema
-- Migration: 0002_search_content.sql
-- Description: Add lightweight content search index for text-like files
-- ============================================================

CREATE VIRTUAL TABLE IF NOT EXISTS file_content_fts USING fts5(
    file_id UNINDEXED,
    owner_id UNINDEXED,
    visibility UNINDEXED,
    name,
    path,
    mime_type UNINDEXED,
    content
);
