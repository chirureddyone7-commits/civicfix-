
-- CivicFix database schema

CREATE TABLE IF NOT EXISTS issues (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,

    category VARCHAR(30) NOT NULL DEFAULT 'OTHER'
        CHECK (category IN (
            'ROADS',
            'WATER',
            'GARBAGE',
            'STREETLIGHT',
            'DRAINAGE',
            'OTHER'
        )),

    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),

    location VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,

    CONSTRAINT issues_coordinates_pair_check CHECK (
        ((latitude IS NULL) = (longitude IS NULL))
        AND (
            latitude IS NULL
            OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
        )
    ),

    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),

    reporter_name VARCHAR(100),
    image_urls TEXT[] NOT NULL DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS issue_status_history (
    id BIGSERIAL PRIMARY KEY,

    issue_id BIGINT NOT NULL,

    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,

    note TEXT,

    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_issue
        FOREIGN KEY (issue_id)
        REFERENCES issues(id)
        ON DELETE CASCADE,

    CHECK (old_status IS NULL OR old_status IN (
        'OPEN', 'IN_PROGRESS', 'RESOLVED'
    )),

    CHECK (new_status IN (
        'OPEN', 'IN_PROGRESS', 'RESOLVED'
    ))
);

-- Indexes for faster issue retrieval

CREATE INDEX IF NOT EXISTS idx_issues_status
ON issues(status);

CREATE INDEX IF NOT EXISTS idx_issues_category
ON issues(category);

CREATE INDEX IF NOT EXISTS idx_issues_created_at
ON issues(created_at);

CREATE INDEX IF NOT EXISTS idx_history_issue_id
ON issue_status_history(issue_id);


-- Safe migration for databases created before complaint photo support.
ALTER TABLE issues ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';
