const pg = require('pg');
const fs = require('fs');
const fetch = require('node-fetch');

const database = process.argv[2];
const user = process.argv[3];
const password = process.argv[4];
const path = process.argv[5];

const pool = new pg.Pool({
	host: 'localhost',
	database,
	user,
	password,
	port: 5431,
});

const data = fs.readFileSync(path).toString()
data.split('\n').forEach(prefix => {
	const query = {
		text: `
			WITH codes AS (
				SELECT reminder_code
				FROM recurring_reminder_signups
				UNION
				SELECT reminder_code
				FROM one_off_reminder_signups
			)
			SELECT reminder_code FROM codes
			WHERE
				reminder_code::text LIKE($1)
        `,
		values: [`${prefix}%`],
	};

	pool.query(query)
		.then(result => {
			console.log(prefix, result.rows[0].reminder_code)
			return fetch('https://reminders.support.guardianapis.com/cancel',
			{
				method: 'POST',
				body: JSON.stringify({ reminderCode: result.rows[0].reminder_code} )
			})
		}).then(response => {
			console.log('api response', response.status)
		})
})
