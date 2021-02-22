DROP TABLE IF EXISTS one_off_reminder_signups;
CREATE TABLE one_off_reminder_signups(
  identity_id TEXT NOT NULL,
  country TEXT,
  reminder_created_at TIMESTAMP NOT NULL,
  reminder_cancelled_at TIMESTAMP,
  reminder_updated_at TIMESTAMP NOT NULL,
  reminder_platform TEXT NOT NULL,
  reminder_component TEXT NOT NULL,
  reminder_stage TEXT NOT NULL,
  reminder_period DATE NOT NULL,
  reminder_option TEXT,
  PRIMARY KEY (identity_id, reminder_period)
);

DROP TABLE IF EXISTS recurring_reminder_signups;
CREATE TABLE recurring_reminder_signups(
  identity_id TEXT NOT NULL PRIMARY KEY,
  country TEXT,
  reminder_created_at TIMESTAMP NOT NULL,
  reminder_cancelled_at TIMESTAMP,
  reminder_updated_at TIMESTAMP NOT NULL,
  reminder_platform TEXT NOT NULL,
  reminder_component TEXT NOT NULL,
  reminder_stage TEXT NOT NULL,
  reminder_frequency_months INT NOT NULL,
  reminder_option TEXT
);
