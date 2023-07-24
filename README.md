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

## Running the tests

To run the test locally, you'll want to connect to a local version of postgres. The easiest way to install that is with

```sh
brew install postgresql
```

followed by

```sh
brew services start postgresql
```

This process should have created a postgres user with the same name as your macos user. The next thing to do is to create the test database, you can do that by running

```sh
psql
```

followed by (you can actually call the database whatever you'd like)

```sql
CREATE DATABASE "support-reminders-test";
```

If this doesn't work, you might want to try running `createdb` (outside of your psql session).

Finally to set up your environment variables, make a copy of the `.env.example`

```sh
cp .env.example .env
```

and fill it in. The default user through homebrew will be your macos name, the password can be left blank, and the url will look something like (swap out `support-reminders-test` if you gave your database a different name)

```sh
TEST_DB_URL='postgresql://localhost/support-reminders-test'
```

Remember to run `nvm use` before running the tests.

## Connecting to the contributions store database

Follow set up instructions in the [contributions-platform](https://github.com/guardian/contributions-platform/tree/master/contributions-store) repo.
