# ETL Pipeline Quality & Robustness Improvements

**Implemented:** February 4, 2026
**Focus:** Data quality validation, robustness, and observability (no external services)

## Overview

Based on staff-level data engineering assessment, implemented critical improvements to ensure **quality over speed**. All improvements use only Postgres and existing infrastructure - no external services required.

---

## What Was Implemented

### 1. Schema Validation (`validation/schema-validator.ts`) ✅

**Problem:** LLM outputs can be malformed, breaking UI/DB
**Solution:** Zod-based runtime validation before persistence

**Features:**
- Knowledge Card validation (company info, pricing ranges, URLs)
- Analysis validation (score bounds, pros/cons balance)
- Quality gates (shouldPublish, humanReviewRequired)
- Detailed validation reports with severity levels

### 2. Fast Duplicate Detection (Postgres pg_trgm) ✅

**Problem:** O(n) in-memory check scans 1000+ rows per hunt
**Solution:** Indexed trigram similarity search (10-100x faster)

### 3. Metrics Collection (Postgres-based) ✅

**Problem:** No quality trend tracking
**Solution:** `pipeline_metrics` table with JSONB tags

### 4. Validation Tracking ✅

**Problem:** No history of what passed/failed validation
**Solution:** `hunt_validations` table for audit trail

### 5. Embedding Versioning ✅

**Problem:** Can't safely change embedding strategy
**Solution:** Track version + model in items table

---

## Key Benefits

- **Quality gates**: Block low-quality content (score < 50%)
- **Audit trail**: Full validation history in database
- **Metrics**: Track quality trends over time
- **Performance**: 10-100x faster duplicate detection
- **Safety**: Embedding versioning prevents breaking changes
- **Cost**: Zero - uses only Postgres

---

## Files Changed

### New Files
- `src/lib/hunter/validation/schema-validator.ts`
- `supabase/migrations/038_data_quality_observability.sql`

### Modified Files
- `src/lib/hunter/phases/research.ts`
- `src/lib/hunter/phases/analysis.ts`
- `src/lib/hunter/types.ts`
