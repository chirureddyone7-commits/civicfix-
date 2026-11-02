-- Add optional GPS coordinates to existing CivicFix databases.
-- Safe to run on databases where the columns already exist.
ALTER TABLE issues
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Keep coordinate pairs valid: both values must be NULL or both supplied.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'issues_coordinates_pair_check'
    ) THEN
        ALTER TABLE issues
            ADD CONSTRAINT issues_coordinates_pair_check
            CHECK (
                (latitude IS NULL AND longitude IS NULL)
                OR
                (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
            );
    END IF;
END $$;
