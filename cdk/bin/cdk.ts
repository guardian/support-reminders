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
};

export const prodProps: SupportRemindersProps = {
	stack: "support",
	stage: "PROD",
	certificateId: "b384a6a0-2f54-4874-b99b-96eeff96c009",
	domainName: "reminders.support.guardianapis.com",
	hostedZoneId: "Z3KO35ELNWZMSX",
};

new SupportReminders(app, "SupportReminders-CODE", codeProps);
new SupportReminders(app, "SupportReminders-PROD", prodProps);
