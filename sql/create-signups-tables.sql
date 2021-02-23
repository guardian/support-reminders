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
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (identity_id, reminder_period)
);

DROP TABLE IF EXISTS recurring_reminder_signups;
CREATE TABLE recurring_reminder_signups(
  identity_id TEXT NOT NULL PRIMARY KEY,
  country TEXT,
  reminder_created_at TIMESTAMP NOT NULL,
  reminder_cancelled_at TIMESTAMP,
  reminder_platform TEXT NOT NULL,
  reminder_component TEXT NOT NULL,
  reminder_stage TEXT NOT NULL,
  reminder_frequency_months INT NOT NULL,
  reminder_option TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);


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
