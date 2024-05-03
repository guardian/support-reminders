import {GuApiGatewayWithLambdaByPath, GuScheduledLambda} from "@guardian/cdk";
import {GuAlarm} from "@guardian/cdk/lib/constructs/cloudwatch";
import type {GuStackProps} from "@guardian/cdk/lib/constructs/core";
import {GuStack} from "@guardian/cdk/lib/constructs/core";
import {GuVpc} from "@guardian/cdk/lib/constructs/ec2";
import {GuLambdaFunction} from "@guardian/cdk/lib/constructs/lambda";
import type {App} from "aws-cdk-lib";
import {Duration} from "aws-cdk-lib";
import {CfnBasePathMapping, CfnDomainName, Cors} from "aws-cdk-lib/aws-apigateway";
import {ComparisonOperator, Metric} from "aws-cdk-lib/aws-cloudwatch";
import {SecurityGroup} from "aws-cdk-lib/aws-ec2";
import {Schedule} from "aws-cdk-lib/aws-events";
import {Effect, ManagedPolicy, Policy, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {CfnRecordSet} from "aws-cdk-lib/aws-route53";
import {isProd} from "../../src/lib/stage";

export interface SupportRemindersProps extends GuStackProps {
	certificateId: string;
	domainName: string;
	hostedZoneId: string;
	datalakeBucket: string;
	deployBucket: string;
	securityGroupToAccessPostgresId: string;
}

export class SupportReminders extends GuStack {
	constructor(scope: App, id: string, props: SupportRemindersProps) {
		super(scope, id, props);


		// ---- Miscellaneous constants ---- //
		const app = "support-reminders";
		const vpc = GuVpc.fromIdParameter(this, "vpc");
		const alarmsTopic = 'alarms-handler-topic-PROD';
		const runtime = Runtime.NODEJS_18_X;
		const fileName = "support-reminders.zip";
		const environment = {
			"Bucket": props.datalakeBucket,
			"Stage": this.stage,
		};
		const securityGroups = [SecurityGroup.fromSecurityGroupId(this, "security-group", props.securityGroupToAccessPostgresId)];
		const vpcSubnets = {
			subnets: GuVpc.subnetsFromParameter(this),
		};
		const awsLambdaVpcAccessExecutionRole =
			ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole")
		const sharedLambdaProps = {
			app,
			runtime,
			fileName,
			vpc,
			vpcSubnets,
			securityGroups,
			environment,
		};


		// ---- API-triggered lambda functions ---- //
		const createRemindersSignupLambda = new GuLambdaFunction(this, "create-reminders-signup", {
			handler: "create-reminder-signup/lambda/lambda.handler",
			functionName: `support-reminders-create-reminder-signup-${this.stage}`,
			...sharedLambdaProps,
		});

		const reactivateRecurringReminderLambda = new GuLambdaFunction(this, "reactivate-recurring-reminder", {
			handler: "reactivate-recurring-reminder/lambda/lambda.handler",
			functionName: `support-reminders-reactivate-recurring-reminder-${this.stage}`,
			...sharedLambdaProps,
		});

		const cancelRemindersLambda = new GuLambdaFunction(this, "cancel-reminders", {
			handler: "cancel-reminders/lambda/lambda.handler",
			functionName: `support-reminders-cancel-reminders-${this.stage}`,
			...sharedLambdaProps,
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
				snsTopicName: alarmsTopic,
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
		const signupExportsLambda = new GuScheduledLambda(this, "signup-exports", {
			handler: "signup-exports/lambda/lambda.handler",
			functionName: `support-reminders-signup-exports-${this.stage}`,
			rules: [
				{
					schedule: Schedule.cron({ hour: "00", minute: "05" }),
				},
			],
			monitoringConfiguration: {
				snsTopicName: alarmsTopic,
				toleratedErrorPercentage: 1,
			},
			...sharedLambdaProps,
		});

		const nextRemindersLambda = new GuScheduledLambda(this, "next-reminders", {
			handler: "next-reminders/lambda/lambda.handler",
			functionName: `support-reminders-next-reminders-${this.stage}`,
			rules: [
				{
					schedule: Schedule.cron({ hour: "00", minute: "05" }),
				},
			],
			monitoringConfiguration: {
				snsTopicName: alarmsTopic,
				toleratedErrorPercentage: 1,
			},
			...sharedLambdaProps,
		});


		// ---- Alarms ---- //
		const alarmName = (shortDescription: string) =>
			`URGENT 9-5 - ${this.stage} ${shortDescription}`;

		const alarmDescription = (description: string) =>
			`Impact - ${description}. Follow the process in https://docs.google.com/document/d/1_3El3cly9d7u_jPgTcRjLxmdG2e919zCLvmcFCLOYAk/edit`;

		new GuAlarm(this, 'ApiGateway4XXAlarm', {
			app,
			alarmName: alarmName("API gateway 4XX response"),
			alarmDescription: alarmDescription("Reminders API received an invalid request"),
			evaluationPeriods: 1,
			threshold: 8,
			actionsEnabled: isProd(),
			snsTopicName: alarmsTopic,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			metric: new Metric({
				metricName: "4XXError",
				namespace: "AWS/ApiGateway",
				statistic: "Sum",
				period: Duration.seconds(300),
				dimensionsMap: {
					ApiName: `support-reminders-${this.stage}`,
				}
			}),
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

		new CfnBasePathMapping(this, "BasePathMapping", {
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
						`arn:aws:ssm:${this.region}:${this.account}:parameter/support-reminders/db-config/${props.stage}`,
						`arn:aws:ssm:${this.region}:${this.account}:parameter/support-reminders/idapi/${props.stage}/*`,
						`arn:aws:ssm:${this.region}:${this.account}:parameter/${props.stage}/support/support-reminders/db-config`,
						`arn:aws:ssm:${this.region}:${this.account}:parameter/${props.stage}/support/support-reminders/idapi/*`,
					]
				}),
			],
		})

		const s3GetObjectInlinePolicy: Policy = new Policy(this, "S3 getObject inline policy", {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: [
						"s3:GetObject"
					],
					resources: [
						`arn:aws:s3::*:${props.deployBucket}/*`
					]
				})
			],
		})

		const s3PutObjectInlinePolicy: Policy = new Policy(this, "S3 putObject inline policy", {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: [
						"s3:PutObject",
						"s3:PutObjectAcl"
					],
					resources: [
						`arn:aws:s3:::${props.datalakeBucket}`,
						`arn:aws:s3:::${props.datalakeBucket}/*`
					]
				})
			]
		})

		const apiGatewayTriggeredLambdaFunctions: GuLambdaFunction[] = [
			createRemindersSignupLambda,
			reactivateRecurringReminderLambda,
			cancelRemindersLambda,
		]

		const scheduledLambdaFunctions: GuLambdaFunction[] = [
			signupExportsLambda,
			nextRemindersLambda
		]

		apiGatewayTriggeredLambdaFunctions.forEach((l: GuLambdaFunction) => {
			l.role?.addManagedPolicy(awsLambdaVpcAccessExecutionRole)
			l.role?.attachInlinePolicy(ssmInlinePolicy)
			l.role?.attachInlinePolicy(s3GetObjectInlinePolicy)
		})

		scheduledLambdaFunctions.forEach((l: GuLambdaFunction) => {
			l.role?.addManagedPolicy(awsLambdaVpcAccessExecutionRole)
			l.role?.attachInlinePolicy(ssmInlinePolicy)
			l.role?.attachInlinePolicy(s3GetObjectInlinePolicy)
			l.role?.attachInlinePolicy(s3PutObjectInlinePolicy)
		})
	}
}
