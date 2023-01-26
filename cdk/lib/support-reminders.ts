import {GuApiGatewayWithLambdaByPath, GuScheduledLambda} from "@guardian/cdk";
import type {GuStackProps} from "@guardian/cdk/lib/constructs/core";
import {GuStack, GuStringParameter} from "@guardian/cdk/lib/constructs/core";
import {GuVpc} from "@guardian/cdk/lib/constructs/ec2";
import {GuLambdaFunction} from "@guardian/cdk/lib/constructs/lambda";
import type {App} from "aws-cdk-lib";
import {Aws} from "aws-cdk-lib";
import {CfnBasePathMapping, CfnDomainName, Cors} from "aws-cdk-lib/aws-apigateway";
import {SecurityGroup} from "aws-cdk-lib/aws-ec2";
import {Schedule} from "aws-cdk-lib/aws-events";
import {Effect, ManagedPolicy, Policy, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {CfnRecordSet} from "aws-cdk-lib/aws-route53";

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

		const securityGroupToAccessPostgres = new GuStringParameter(
			this,
			"SecurityGroupToAccessPostgres",
			{
				description:
					"Security group to access the RDS instance",
			}
		);


		// ---- Miscellaneous constants ---- //
		const app = "support-reminders";
		const vpc = GuVpc.fromIdParameter(this, "vpc");
		const runtime = Runtime.NODEJS_16_X;
		const fileName = "support-reminders.zip";
		const securityGroups = [SecurityGroup.fromSecurityGroupId(this, "security-group", securityGroupToAccessPostgres.valueAsString)];
		const vpcSubnets = {
			subnets: GuVpc.subnetsFromParameter(this),
		};
		const awsLambdaVpcAccessExecutionRole =
			ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole")


		// ---- API-triggered lambda functions ---- //
		const searchRemindersLambda = new GuLambdaFunction(this, "search-reminders", {
			app,
			runtime,
			fileName,
			vpc,
			vpcSubnets,
			securityGroups,
			handler: "search-reminders/lambda/lambda.handler",
			functionName: `support-reminders-search-reminders-${this.stage}`,
		});

		const createRemindersSignupLambda = new GuLambdaFunction(this, "create-reminders-signup", {
			app,
			runtime,
			fileName,
			vpc,
			vpcSubnets,
			securityGroups,
			handler: "create-reminder-signup/lambda/lambda.handler",
			functionName: `support-reminders-create-reminder-signup-${this.stage}`,
		});

		const reactivateRecurringReminderLambda = new GuLambdaFunction(this, "reactivate-recurring-reminder", {
			app,
			runtime,
			fileName,
			vpc,
			vpcSubnets,
			securityGroups,
			handler: "reactivate-recurring-reminder/lambda/lambda.handler",
			functionName: `support-reminders-reactivate-recurring-reminder-${this.stage}`,
		});

		const cancelRemindersLambda = new GuLambdaFunction(this, "cancel-reminders", {
			app,
			runtime,
			fileName,
			vpc,
			vpcSubnets,
			securityGroups,
			handler: "cancel-reminders/lambda/lambda.handler",
			functionName: `support-reminders-cancel-reminders-${this.stage}`,
		});


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
			runtime,
			fileName,
			vpc,
			vpcSubnets,
			securityGroups,
			handler: "signup-exports/lambda/lambda.handler",
			functionName: `support-reminders-signup-exports-${this.stage}`,
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
			runtime,
			fileName,
			vpc,
			vpcSubnets,
			securityGroups,
			handler: "next-reminders/lambda/lambda.handler",
			functionName: `support-reminders-next-reminders-${this.stage}`,
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


		// ---- Apply policies ---- //
		const ssmInlinePolicy: Policy = new Policy(this, "SSM inline policy", {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: [
						"ssm:GetParametersByPath",
						"ssm:GetParameter"
					],
					resources: [
						`arn:aws:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter/support-reminders/db-config/${props.stage}`,
						`arn:aws:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter/support-reminders/idapi/${props.stage}/*`,
					]
				}),
			],
		})

		const s3InlinePolicy: Policy = new Policy(this, "S3 inline policy", {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: [
						"s3:GetObject"
					],
					resources: [
						"arn:aws:s3::*:membership-dist/*"
					]
				}),
			],
		})

		const lambdaFunctions: GuLambdaFunction[] = [
			searchRemindersLambda,
			createRemindersSignupLambda,
			reactivateRecurringReminderLambda,
			cancelRemindersLambda
		]

		lambdaFunctions.forEach((l: GuLambdaFunction) => {
			l.role?.addManagedPolicy(awsLambdaVpcAccessExecutionRole)
			l.role?.attachInlinePolicy(ssmInlinePolicy)
			l.role?.attachInlinePolicy(s3InlinePolicy)
		})
	}
}
