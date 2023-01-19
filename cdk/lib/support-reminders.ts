import { GuApiGatewayWithLambdaByPath, GuScheduledLambda} from "@guardian/cdk";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuStack, GuStringParameter, GuSubnetListParameter } from "@guardian/cdk/lib/constructs/core";
import { GuLambdaFunction } from "@guardian/cdk/lib/constructs/lambda";
import type { App } from "aws-cdk-lib";
import { CfnBasePathMapping, CfnDomainName, Cors} from "aws-cdk-lib/aws-apigateway";
import { Schedule } from "aws-cdk-lib/aws-events";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { CfnRecordSet } from "aws-cdk-lib/aws-route53";

export interface SupportRemindersProps extends GuStackProps {
	certificateId: string;
	domainName: string;
	hostedZoneId: string;
}

export class SupportReminders extends GuStack {
	constructor(scope: App, id: string, props: SupportRemindersProps) {
		super(scope, id, props);

		// ---- Parameters ---- //
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

		new GuSubnetListParameter(
			this,
			"VpcSubnets",
			{
				description: "Subnets for RDS access"
			}
		)

		// ---- Misc. constants ---- //
		const app = "support-reminders";
		const awsLambdaVpcAccessExecutionRole =
			ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole")


		// ---- API-triggered lambda functions ---- //
		const searchRemindersLambda = new GuLambdaFunction(this, "search-reminders", {
			app,
			runtime: Runtime.NODEJS_14_X,
			handler: "search-reminders/lambda/lambda.handler",
			fileName: "support-reminders.zip",
		});
		searchRemindersLambda.role?.addManagedPolicy(awsLambdaVpcAccessExecutionRole)

		const createRemindersSignupLambda = new GuLambdaFunction(this, "create-reminders-signup", {
			app,
			runtime: Runtime.NODEJS_14_X,
			handler: "create-reminder-signup/lambda/lambda.handler",
			fileName: "support-reminders.zip",
		});
		createRemindersSignupLambda.role?.addManagedPolicy(awsLambdaVpcAccessExecutionRole)

		const reactivateRecurringReminderLambda = new GuLambdaFunction(this, "reactivate-recurring-reminder", {
			app,
			runtime: Runtime.NODEJS_14_X,
			handler: "reactivate-recurring-reminder/lambda/lambda.handler",
			fileName: "support-reminders.zip",
		});
		reactivateRecurringReminderLambda.role?.addManagedPolicy(awsLambdaVpcAccessExecutionRole)

		const cancelRemindersLambda = new GuLambdaFunction(this, "cancel-reminders", {
			app,
			runtime: Runtime.NODEJS_14_X,
			handler: "cancel-reminders/lambda/lambda.handler",
			fileName: "support-reminders.zip",
		});
		cancelRemindersLambda.role?.addManagedPolicy(awsLambdaVpcAccessExecutionRole)


		// ---- API gateway ---- //
		const supportRemindersApi = new GuApiGatewayWithLambdaByPath(this, {
			app,
			defaultCorsPreflightOptions: {
				allowOrigins: Cors.ALL_ORIGINS,
				allowMethods: Cors.ALL_METHODS,
				allowHeaders: ["Content-Type"],
			},
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
			app,
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
			app,
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

		const cfnDomainName = new CfnDomainName(this, "DomainName", {
			domainName: props.domainName,
			regionalCertificateArn: certificateArn,
			endpointConfiguration: {
				types: ["REGIONAL"]
			}
		});

		new CfnBasePathMapping(this, "ApiMapping", {
			domainName: cfnDomainName.ref,
			restApiId: supportRemindersApi.api.restApiId,
			stage: supportRemindersApi.api.deploymentStage.stageName,
		});

		new CfnRecordSet(this, "DNSRecord", {
			name: props.domainName,
			type: "CNAME",
			hostedZoneId: props.hostedZoneId,
			ttl: "60",
			resourceRecords: [
				cfnDomainName.attrRegionalDomainName
			],
		});
	}
}
