import "source-map-support/register";
import { App } from "aws-cdk-lib";
import type { SupportRemindersProps } from "../lib/support-reminders";
import { SupportReminders } from "../lib/support-reminders";

const app = new App();

export const codeProps: SupportRemindersProps = {
	stack: "support",
	stage: "CODE",
	certificateId: "b384a6a0-2f54-4874-b99b-96eeff96c009",
	domainName: "reminders-code.support.guardianapis.com",
	hostedZoneId: "Z3KO35ELNWZMSX",
	datalakeBucket: "contributions-private",
	deployBucket: "membership-dist",
	securityGroupToAccessPostgresId: "sg-aabc6cd7"
};

export const prodProps: SupportRemindersProps = {
	stack: "support",
	stage: "PROD",
	certificateId: "b384a6a0-2f54-4874-b99b-96eeff96c009",
	domainName: "reminders.support.guardianapis.com",
	hostedZoneId: "Z3KO35ELNWZMSX",
	datalakeBucket: "ophan-raw-support-reminders",
	deployBucket: "membership-dist",
	securityGroupToAccessPostgresId: "sg-98b56ee5"

};

new SupportReminders(app, "SupportReminders-CODE", codeProps);
new SupportReminders(app, "SupportReminders-PROD", prodProps);
