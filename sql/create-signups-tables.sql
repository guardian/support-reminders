CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS one_off_reminder_signups;
CREATE TABLE one_off_reminder_signups(
  identity_id TEXT NOT NULL,
  country TEXT,
  reminder_created_at TIMESTAMP NOT NULL,
  reminder_cancelled_at TIMESTAMP,
  reminder_platform TEXT NOT NULL,
  reminder_component TEXT NOT NULL,
  reminder_stage TEXT NOT NULL,
  reminder_period DATE NOT NULL,
  reminder_option TEXT,
  reminder_code uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4 (),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (identity_id, reminder_period)
);

/* PostgreSQL automatically creates a unique index when a unique constraint or primary key is defined for a table
   - https://www.postgresql.org/docs/current/indexes-unique.html
 */
-- CREATE INDEX one_off_reminder_signups_reminder_code ON one_off_reminder_signups (identity_id);

DROP TABLE IF EXISTS recurring_reminder_signups;
CREATE TABLE recurring_reminder_signups(
  identity_id TEXT NOT NULL UNIQUE,
  country TEXT,
  reminder_created_at TIMESTAMP NOT NULL,
  reminder_cancelled_at TIMESTAMP,
  reminder_platform TEXT NOT NULL,
  reminder_component TEXT NOT NULL,
  reminder_stage TEXT NOT NULL,
  reminder_frequency_months INT NOT NULL,
  reminder_option TEXT,
  reminder_code uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4 (),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

/* PostgreSQL automatically creates a unique index when a unique constraint or primary key is defined for a table
   - https://www.postgresql.org/docs/current/indexes-unique.html
 */
-- CREATE INDEX recurring_reminder_signups_reminder_code ON recurring_reminder_signups (identity_id);

CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS one_off_set_updated_at ON one_off_reminder_signups;
CREATE TRIGGER
	one_off_set_updated_at
BEFORE UPDATE ON
	one_off_reminder_signups
FOR EACH ROW EXECUTE PROCEDURE
	set_updated_at_column();

DROP TRIGGER IF EXISTS recurring_set_updated_at ON recurring_reminder_signups;
CREATE TRIGGER
	recurring_set_updated_at
BEFORE UPDATE ON
	recurring_reminder_signups
FOR EACH ROW EXECUTE PROCEDURE
	set_updated_at_column();
