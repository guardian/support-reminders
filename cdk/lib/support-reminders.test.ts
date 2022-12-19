import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { SupportReminders } from "./support-reminders";

describe("The SupportReminders stack", () => {
  it("matches the snapshot", () => {
    const app = new App();
    const stack = new SupportReminders(app, "SupportReminders", { stack: "support", stage: "TEST" });
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});
