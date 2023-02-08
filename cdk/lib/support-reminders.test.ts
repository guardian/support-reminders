import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { codeProps, prodProps } from "../bin/cdk";
import { SupportReminders } from "./support-reminders";

describe("The SupportReminders stack", () => {
	it("matches the snapshot", () => {
		const app = new App();
		const codeStack = new SupportReminders(
			app,
			"SupportReminders-CODE",
			codeProps
		);
		const prodStack = new SupportReminders(
			app,
			"SupportReminders-PROD",
			prodProps
		);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
