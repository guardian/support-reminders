# support-reminders

Lambdas for maintaining sign-ups to support reminder messages.

Users can sign up for reminders from e.g. the epic, the contributions thank you page, MMA.
The sign-up data is stored in Postgres and a snapshot of the next reminder per user is sent to Braze.

[Architecture diagram.](https://docs.google.com/drawings/d/18xIEr2VeTMF3H2W_u6lmH7WBJ3KFHIYsB1jurOdBar4/edit)


### create-reminder-signup
A lambda integrated with a couple of API gateway POST endpoints (`/create/one-off`, `/create/recurring`).

A client request includes an email address, which the lambda uses to fetch the user's identity ID if it exists, or creates an identity guest account.

The sign-up data is then persisted to Postgres.

### next-reminders
A lambda for generating the snapshot of reminders for the current month. Runs on a daily schedule.

It produces a `next_reminders.csv`, which is exported to an S3 bucket in the ophan account. From there it is sent to a BigQuery table which is used for ingestion into Braze.

### signup-exports
A lambda for generating the snapshot of newly created and cancelled signups. Runs on a daily schedule, exporting all created/cancelled signups from the previous day.

It produces a `one-off-signups.csv` and `recurring-signups.csv`, which are exported to an S3 bucket in the ophan account. From there they are sent to a BigQuery table which can be queried for analysis.
