-- Migration 003: Relax signal_type CHECK constraint
-- Agents may return signal types not in the original whitelist.
-- Drop the strict CHECK so inserts don't fail.

ALTER TABLE signals DROP CONSTRAINT IF EXISTS signals_signal_type_check;
