import asyncio
from aiohttp import ClientSession
import re
import requests
import json
import pprint
import pandas as pd

REMINDERS_INPUT_CSV = "./reminders_raw_prod.csv"
REMINDERS_OUTPUT_JSON = "./reminders_formatted_prod.json"


def get_reminder_period(reminder_date):
    return re.sub(r"-\d\d .*$", "-01", reminder_date)


def get_reminder_stage(pre_contribution_flag):
    return "PRE" if pre_contribution_flag else "POST"


def get_reminder_component(pre_contribution_flag):
    return "EPIC" if pre_contribution_flag else "THANKYOU"


def get_reminder_platform(pre_contribution_flag):
    return "WEB" if pre_contribution_flag else "SUPPORT"


def get_reminder_signup(reminder):
    return {
        "email": reminder["email"],
        "reminderCreatedAt": reminder.reminder_created_timestamp,
        "reminderPeriod": get_reminder_period(reminder.reminder_date),
        "reminderStage": get_reminder_stage(reminder.pre_contribution_flag),
        "reminderComponent": get_reminder_component(reminder.pre_contribution_flag),
        "reminderPlatform": get_reminder_platform(reminder.pre_contribution_flag),
    }


def get_reminder_signups(df):
    return [get_reminder_signup(reminder) for _, reminder in df.iterrows()]


def dump_json(obj, path):
    with open(path, "w") as f:
        json.dump(obj, f)


def main():
    df = pd.read_csv(REMINDERS_INPUT_CSV)
    signups = get_reminder_signups(df)
    dump_json(signups, REMINDERS_OUTPUT_JSON)


if __name__ == "__main__":
    main()
