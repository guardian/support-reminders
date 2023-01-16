import { join } from "path";
import { GuApiGatewayWithLambdaByPath, GuScheduledLambda} from "@guardian/cdk";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuStack } from "@guardian/cdk/lib/constructs/core";
import { GuLambdaFunction } from "@guardian/cdk/lib/constructs/lambda";
import type { App } from "aws-cdk-lib";
import { CfnBasePathMapping, CfnDomainName } from "aws-cdk-lib/aws-apigateway";
import { Schedule } from "aws-cdk-lib/aws-events";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { CfnRecordSetGroup } from "aws-cdk-lib/aws-route53";
import { CfnInclude } from "aws-cdk-lib/cloudformation-include";

export interface SupportRemindersProps extends GuStackProps {
	certificateId: string;
	domainName: string;
	hostedZoneId: string;
}

export class SupportReminders extends GuStack {
	constructor(scope: App, id: string, props: SupportRemindersProps) {
		super(scope, id, props);

		// ---- Existing CFN template ---- //
		const yamlTemplateFilePath = join(__dirname, "../..", "cfn.yaml");
		new CfnInclude(this, "YamlTemplate", {
			templateFile: yamlTemplateFilePath,
		});


		// ---- Constants ---- //
		const app = "support-reminders";


		// ---- API-triggered lambda functions ---- //
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


		// ---- API gateway ---- //
		const supportRemindersApi = new GuApiGatewayWithLambdaByPath(this, {
			app,
			monitoringConfiguration: {
				snsTopicName: "conversion-dev",
				http5xxAlarm: {
					tolerated5xxPercentage: 1,
				}
			},
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
				},
			],
		})


		// ---- Scheduled lambda functions ---- //
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


		// ---- DNS ---- //
		const certificateArn = `arn:aws:acm:eu-west-1:${this.account}:certificate/${props.certificateId}`;

		const cfnDomainName = new CfnDomainName(this, "ApiDomainName", {
			domainName: props.domainName,
			certificateArn,
		});

		new CfnBasePathMapping(this, "ApiMapping", {
			domainName: cfnDomainName.ref,
			restApiId: supportRemindersApi.api.restApiId,
			stage: supportRemindersApi.api.deploymentStage.stageName,
		});

		new CfnRecordSetGroup(this, "ApiRoute53", {
			hostedZoneId: props.hostedZoneId,
			recordSets: [
				{
					name: props.domainName,
					type: "CNAME",
				},
			],
		});
	}
}
