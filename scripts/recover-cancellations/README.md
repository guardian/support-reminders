#### 1. Download logs from cloudwatch

E.g.

`export AWS_DEFAULT_REGION=eu-west-1 && awslogs get /aws/lambda/support-reminders-cancel-reminders-PROD --start='2021-06-15 16:00' --end='2021-06-16 09:00' --filter-pattern="invalid input syntax for type uuid" --profile membership > filtered-dump.log`

#### 2. Extract the base64 codes from the error logs and decode

`grep "Error: error" filtered-dump.log  > errors`

You can just use vim block edit mode to remove everything except the codes.

`cat errors | uniq > deduped`

`./decode.sh deduped`

#### 3. Lookup actual reminder_codes from postgres and send to cancellation endpoint

Setup the ssh tunnel to the database bastion, then run:
`node getReminderCode.js <database name> <username> <password> <path-to-file>`
