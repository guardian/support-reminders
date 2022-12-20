import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { SupportReminders } from "../lib/support-reminders";

const app = new App();
new SupportReminders(app, "SupportReminders-CODE", { stack: "support", stage: "CODE" });
new SupportReminders(app, "SupportReminders-PROD", { stack: "support", stage: "PROD" });
