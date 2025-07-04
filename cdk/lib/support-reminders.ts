import {GuApiGatewayWithLambdaByPath, GuScheduledLambda} from "@guardian/cdk";
import {GuAlarm} from "@guardian/cdk/lib/constructs/cloudwatch";
import type {GuStackProps} from "@guardian/cdk/lib/constructs/core";
import {GuStack} from "@guardian/cdk/lib/constructs/core";
import {GuVpc} from "@guardian/cdk/lib/constructs/ec2";
import {GuLambdaFunction} from "@guardian/cdk/lib/constructs/lambda";
import type {App} from "aws-cdk-lib";
import {Duration} from "aws-cdk-lib";
import {AccessLogFormat, AwsIntegration, CfnBasePathMapping, CfnDomainName, Cors, LogGroupLogDestination, MethodLoggingLevel, RequestValidator} from "aws-cdk-lib/aws-apigateway";
import {ComparisonOperator, Metric} from "aws-cdk-lib/aws-cloudwatch";
import {SecurityGroup} from "aws-cdk-lib/aws-ec2";
import {Schedule} from "aws-cdk-lib/aws-events";
import { Effect, ManagedPolicy, Policy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import {LoggingFormat, Runtime} from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import {CfnRecordSet} from "aws-cdk-lib/aws-route53";
import { Queue } from "aws-cdk-lib/aws-sqs";
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
		const runtime = Runtime.NODEJS_22_X;
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

		// SQS Queues
		const queueName = `${app}-queue-${props.stage}`;
		const deadLetterQueueName = `dead-letters-${app}-${props.stage}`;

		const deadLetterQueue = new Queue(this, `dead-letters-${app}Queue`, {
			queueName: deadLetterQueueName,
			retentionPeriod: Duration.days(14),
		});

		new GuAlarm(this, `${app}-alarm`, {
			app: app,
			snsTopicName: alarmsTopic,
			alarmName: `${app}-${this.stage}: failed event on the dead letter queue`,
			alarmDescription: `A reminder signup event failed and is now on the dead letter queue.`,
			metric: deadLetterQueue
				.metric('ApproximateNumberOfMessagesVisible')
				.with({ statistic: 'Sum', period: Duration.minutes(1) }),
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 24,
			actionsEnabled: this.stage === 'PROD',
		});

		const queue = new Queue(this, `${app}Queue`, {
			queueName,
			visibilityTimeout: Duration.minutes(2),
			deadLetterQueue: {
				// The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
				// This has been set to 1 to avoid duplicate  events
				maxReceiveCount: 1,
				queue: deadLetterQueue,
			},
		});

		// SQS to Lambda event source mapping
		const eventSource = new SqsEventSource(queue, {
			reportBatchItemFailures: true,
			batchSize: 1,
		});
		const events=[eventSource];

		const loggingFormat = LoggingFormat.TEXT;

		const sharedLambdaProps = {
			app,
			runtime,
			fileName,
			vpc,
			vpcSubnets,
			securityGroups,
			environment,
			loggingFormat,
		};

		const apiRole = new Role(this, 'ApiGatewayToSqsRole', {
			assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
		});

		// grant sqs:SendMessage* to Api Gateway Role
		queue.grantSendMessages(apiRole);

		// Api Gateway Direct Integration
		const sendMessageIntegration = new AwsIntegration({
			service: 'sqs',
			path: `${this.account}/${queue.queueName}`,
			integrationHttpMethod: 'POST',
			options: {
				credentialsRole: apiRole,
				requestParameters: {
					'integration.request.header.Content-Type': `'application/x-www-form-urlencoded'`,
				},
				requestTemplates: {
					'application/json': 'Action=SendMessage&MessageBody=$input.body&MessageAttribute.1.Name=X-GU-GeoIP-Country-Code&MessageAttribute.1.Value.DataType=String&MessageAttribute.1.Value.StringValue=$input.params(\'X-GU-GeoIP-Country-Code\')&MessageAttribute.2.Name=EventPath&MessageAttribute.2.Value.DataType=String&MessageAttribute.2.Value.StringValue=$context.path',
				},
				integrationResponses: [
					{
						statusCode: '200',
						responseTemplates: {
							"application/json": `{"done": true}`,
						},
					},
				]
			},
		});

		// ---- API-triggered lambda functions ---- //
		const createRemindersSignupLambda = new GuLambdaFunction(this, "create-reminders-signup", {
			handler: "create-reminder-signup/lambda/lambda.handler",
			functionName: `support-reminders-create-reminder-signup-${this.stage}`,
			...sharedLambdaProps,
			events,
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
		const apiGatewayLogGroup = new LogGroup(this, 'ApiGatewayAccessLogs', {
			logGroupName: `/aws/apigateway/${app}-${this.stage}`,
		});

		const supportRemindersApi = new GuApiGatewayWithLambdaByPath(this, {
			app,
			defaultCorsPreflightOptions: {
				allowOrigins: Cors.ALL_ORIGINS,
				allowMethods: Cors.ALL_METHODS,
				allowHeaders: ["Content-Type"],
			},
			monitoringConfiguration: this.stage === 'CODE' ? { noMonitoring: true } : {
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
					path: "/cancel",
					httpMethod: "POST",
					lambda: cancelRemindersLambda,
				},
			],
			deployOptions: {
				accessLogDestination: new LogGroupLogDestination(
					apiGatewayLogGroup,
				),
				accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
				loggingLevel: MethodLoggingLevel.ERROR,
				metricsEnabled: true,
				dataTraceEnabled: false,
			},
		})


		// post method to /create
		supportRemindersApi.api.root.resourceForPath('/create/one-off').addMethod('POST', sendMessageIntegration, {
			methodResponses: [
				{
					statusCode: '200',
				},
			],
			requestParameters: {
				'method.request.header.X-GU-GeoIP-Country-Code': true,
			},
			requestValidator: new RequestValidator(this, 'one-off-validator', {
				restApi: supportRemindersApi.api,
				validateRequestParameters: true
			}),
		});
		supportRemindersApi.api.root.resourceForPath('/create/recurring').addMethod('POST', sendMessageIntegration, {
			methodResponses: [
				{
					statusCode: '200',
				},
			],
			requestParameters: {
				'method.request.header.X-GU-GeoIP-Country-Code': true,
			},
			requestValidator: new RequestValidator(this, 'recurring-validator', {
				restApi: supportRemindersApi.api,
				validateRequestParameters: true
			}),
		});



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

		const apiRolePolicy: Policy = 	new Policy(this, "SendMessagePolicy", {
			statements: [
				new PolicyStatement({
					actions: ["sqs:SendMessage"],
					effect:  Effect.ALLOW,
					resources: [queue.queueArn],
				}),
			],
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
			l.role?.attachInlinePolicy(apiRolePolicy)
		})

		scheduledLambdaFunctions.forEach((l: GuLambdaFunction) => {
			l.role?.addManagedPolicy(awsLambdaVpcAccessExecutionRole)
			l.role?.attachInlinePolicy(ssmInlinePolicy)
			l.role?.attachInlinePolicy(s3GetObjectInlinePolicy)
			l.role?.attachInlinePolicy(s3PutObjectInlinePolicy)
		})
	}
}
