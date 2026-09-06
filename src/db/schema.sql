-- =================================================================
-- Keepr (usekeepr.com) - Supabase Database Schema
-- Run this script in the Supabase SQL Editor
-- =================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Plan Types
CREATE TYPE user_plan_tier AS ENUM ('free', 'yaad_149', 'ghar_399', 'vault_799');
CREATE TYPE doc_category_type AS ENUM (
    'vehicle',      -- RC, PUC, Insurance, Driving License, Service Bills
    'appliance',    -- Fridge, AC, TV, Mixer, Mobile warranty/bills
    'insurance',    -- Term, Health, Life, General policies
    'medical',      -- Prescriptions, Lab Reports, Vaccination cards
    'identity',     -- Aadhaar, PAN, Passport, Voter ID
    'property',     -- Rent Agreement, Registry, Electricity/Water bills
    'finance',      -- FD receipts, Mutual Fund statements, Tax returns
    'general'       -- Handwritten notes, miscellaneous bills
);
CREATE TYPE reminder_status_type AS ENUM ('pending', 'sent', 'failed', 'cancelled');

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    phone_number VARCHAR(20) PRIMARY KEY, -- WhatsApp Phone Number (with country code, e.g. 919876543210)
    name VARCHAR(100) DEFAULT 'Bhaiya',
    language VARCHAR(10) DEFAULT 'hinglish',
    plan user_plan_tier DEFAULT 'free',
    plan_activated_at TIMESTAMPTZ,
    plan_expires_at TIMESTAMPTZ,
    file_count INT DEFAULT 0,
    reminder_count INT DEFAULT 0,
    last_offer_sent_at TIMESTAMPTZ, -- Anti-spam rule: Max 1 upsell pitch per 7 days
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_phone VARCHAR(20) NOT NULL REFERENCES users(phone_number) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- Path in Supabase storage / Cloudflare R2
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- image/jpeg, application/pdf, audio/ogg, etc.
    file_size_bytes BIGINT DEFAULT 0,
    
    -- Extracted Metadata via Gemini Flash
    category doc_category_type DEFAULT 'general',
    title VARCHAR(255) NOT NULL,            -- e.g. "Havells Grinder Mixer Bill", "Swift Dzire PUC"
    entity_name VARCHAR(255),               -- e.g. "Havells", "Maruti Suzuki", "HDFC ERGO", "Dr. Sharma"
    policy_or_bill_no VARCHAR(100),         -- e.g. "INV-98231", "POL-0091241"
    amount NUMERIC(12, 2),                  -- e.g. 3499.00
    issue_date DATE,                        -- Purchase / Issuance date
    expiry_date DATE,                       -- Expiry / Due date for renewal or warranty
    summary TEXT,                           -- 1-line crisp summary
    tags TEXT[],                            -- ['mixer', 'kitchen', 'warranty', 'havells']
    raw_extraction JSONB,                   -- Complete JSON returned by Gemini
    
    is_encrypted BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reminders Table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_phone VARCHAR(20) NOT NULL REFERENCES users(phone_number) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    reminder_date DATE NOT NULL,
    days_before INT NOT NULL, -- 30, 7, 1, or 0 days
    status reminder_status_type DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Payments / Subscriptions Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_phone VARCHAR(20) NOT NULL REFERENCES users(phone_number) ON DELETE CASCADE,
    razorpay_payment_id VARCHAR(100),
    razorpay_payment_link_id VARCHAR(100),
    amount_inr NUMERIC(10, 2) NOT NULL,
    plan user_plan_tier NOT NULL,
    status VARCHAR(50) DEFAULT 'created', -- 'created', 'paid', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Family Members Table (For Ghar & Vault plans)
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_user_phone VARCHAR(20) NOT NULL REFERENCES users(phone_number) ON DELETE CASCADE,
    member_phone VARCHAR(20) NOT NULL,
    member_name VARCHAR(100),
    relationship VARCHAR(50), -- 'spouse', 'father', 'mother', 'child', 'ca'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(primary_user_phone, member_phone)
);

-- =================================================================
-- Indexes for Sub-Millisecond Search & Fast Cron Execution
-- =================================================================

-- Trigram Indexes for Instant Fuzzy Search (even with typos: "hvels mixr" -> "Havells Mixer")
CREATE INDEX IF NOT EXISTS idx_docs_title_trgm ON documents USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_docs_entity_trgm ON documents USING gin (entity_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_docs_summary_trgm ON documents USING gin (summary gin_trgm_ops);

-- User and Expiry query optimization
CREATE INDEX IF NOT EXISTS idx_docs_user_phone ON documents (user_phone);
CREATE INDEX IF NOT EXISTS idx_docs_expiry_date ON documents (expiry_date);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders (reminder_date, status);

-- =================================================================
-- Database Function: Fuzzy Search Documents
-- Zero LLM cost instant search
-- =================================================================
CREATE OR REPLACE FUNCTION search_user_documents(
    p_user_phone VARCHAR(20),
    p_query TEXT,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    entity_name VARCHAR(255),
    category doc_category_type,
    expiry_date DATE,
    policy_or_bill_no VARCHAR(100),
    amount NUMERIC(12, 2),
    summary TEXT,
    similarity_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.entity_name,
        d.category,
        d.expiry_date,
        d.policy_or_bill_no,
        d.amount,
        d.summary,
        GREATEST(
            similarity(d.title, p_query),
            similarity(COALESCE(d.entity_name, ''), p_query),
            similarity(COALESCE(d.summary, ''), p_query)
        ) AS similarity_score
    FROM documents d
    WHERE d.user_phone = p_user_phone
      AND d.is_active = TRUE
      AND (
          d.title ILIKE '%' || p_query || '%'
          OR COALESCE(d.entity_name, '') ILIKE '%' || p_query || '%'
          OR COALESCE(d.summary, '') ILIKE '%' || p_query || '%'
          OR similarity(d.title, p_query) > 0.25
          OR similarity(COALESCE(d.entity_name, ''), p_query) > 0.25
      )
    ORDER BY similarity_score DESC, d.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
