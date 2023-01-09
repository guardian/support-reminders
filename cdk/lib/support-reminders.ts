import { GuApiGatewayWithLambdaByPath, GuScheduledLambda} from "@guardian/cdk";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import {GuStack, GuStringParameter, GuSubnetListParameter} from "@guardian/cdk/lib/constructs/core";
import { GuLambdaFunction } from "@guardian/cdk/lib/constructs/lambda";
import type { App } from "aws-cdk-lib";
import { Schedule } from "aws-cdk-lib/aws-events";
import { Runtime } from "aws-cdk-lib/aws-lambda";
// import { GuCname } from "@guardian/cdk/lib/constructs/dns";

export class SupportReminders extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		// ---- String Parameters ---- //
		new GuStringParameter(
			this,
			"CertificateArn",
			{
				description:
					"ARN of the certificate",
			}
		);

		new GuStringParameter(
			this,
			"DatalakeBucket",
			{
				description:
					"Bucket to upload data for ingestion into BigQuery",
			}
		);

		new GuStringParameter(
			this,
			"DeployBucket",
			{
				description:
					"Bucket to copy files to",
			}
		);

		new GuStringParameter(
			this,
			"SecurityGroupToAccessPostgres",
			{
				description:
					"Security group to access the RDS instance",
			}
		);

		new GuStringParameter(
			this,
			"Stage",
			{
				description:
					"Set by RiffRaff on each deploy",
			}
		);

		new GuStringParameter(
			this,
			"Stack",
			{
				description:
					"Stack name",
			}
		);

		// ---- DNS Records ---- //
		// new GuCname(this, id: string, props: GuCnameProps)

		// ---- Lambdas ---- //
		const searchRemindersLambda = new GuLambdaFunction(this, "search-reminders", {
			app: "search-reminders-lambda",
			runtime: Runtime.NODEJS_14_X,
			handler: "search-reminders/lambda/lambda.handler",
			fileName: "support-reminders.zip",
		});

		const createRemindersSignupLambda = new GuLambdaFunction(this, "create-reminders-signup", {
			app: "create-reminders-signup-lambda",
			runtime: Runtime.NODEJS_14_X,
			handler: "create-reminder-signup/lambda/lambda.handler",
			fileName: "support-reminders.zip",
		});

		const reactivateRecurringReminderLambda = new GuLambdaFunction(this, "reactivate-recurring-reminder", {
			app: "create-reminders-signup-lambda",
			runtime: Runtime.NODEJS_14_X,
			handler: "reactivate-recurring-reminder/lambda/lambda.handler",
			fileName: "support-reminders.zip",
		});

		const cancelRemindersLambda = new GuLambdaFunction(this, "cancel-reminders", {
			app: "cancel-reminders-lambda",
			runtime: Runtime.NODEJS_14_X,
			handler: "cancel-reminders/lambda/lambda.handler",
			fileName: "support-reminders.zip",
		});

		new GuScheduledLambda(this, "signup-exports", {
			app: "cancel-reminders-lambda",
			runtime: Runtime.NODEJS_14_X,
			handler: "signup-exports/lambda/lambda.handler",
			fileName: "support-reminders.zip",
			rules: [
				{
					schedule: Schedule.expression("cron(05 00 * * ? *)"),
				},
			],
			monitoringConfiguration: {
				snsTopicName: "conversion-dev",
				toleratedErrorPercentage: 1,
			},
		});

		new GuScheduledLambda(this, "next-reminders", {
			app: "next-reminders-lambda",
			runtime: Runtime.NODEJS_14_X,
			handler: "next-reminders/lambda/lambda.handler",
			fileName: "support-reminders.zip",
			rules: [
				{
					schedule: Schedule.expression("cron(05 00 * * ? *)"),
				},
			],
			monitoringConfiguration: {
				snsTopicName: "conversion-dev",
				toleratedErrorPercentage: 1,
			},
		});

		new GuApiGatewayWithLambdaByPath(this, {
			app: "support-reminders",
			targets: [
				{
					path: "/reactivate",
					httpMethod: "POST",
					lambda: reactivateRecurringReminderLambda,
				},
				{
					path: "/create/recurring",
					httpMethod: "POST",
					lambda: createRemindersSignupLambda,
				},
				{
					path: "/search",
					httpMethod: "POST",
					lambda: searchRemindersLambda,
				},
				{
					path: "/create/one-off",
					httpMethod: "POST",
					lambda: createRemindersSignupLambda,
				},
				{
					path: "/cancel",
					httpMethod: "POST",
					lambda: cancelRemindersLambda,
				}
			],
			monitoringConfiguration: {
				snsTopicName: "conversion-dev",
				http5xxAlarm: {
					tolerated5xxPercentage: 1,
				}
			}
		})
	}
}
