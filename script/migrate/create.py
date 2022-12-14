import aiohttp
import asyncio
import json
import logging


REMINDERS_SIGNUPS_JSON = "./reminders_formatted_prod.json"
SIGNUPS_URL = "https://reminders.support.guardianapis.com/create/one-off"
NUM_WORKERS = 10
LOG_FILE = "create.log"

logging.basicConfig(filename=LOG_FILE, level=logging.INFO)


def load_signups(path):
    with open(path) as f:
        signups = json.load(f)
    return signups


def enqueue_signups(signups):
    queue = asyncio.Queue()
    for signup in signups:
        queue.put_nowait(signup)
    return queue


async def create_signup(signup, session):
    async with session.post(SIGNUPS_URL, json=signup) as response:
        if response.status == 200:
            logging.info(f"success: {signup}")
        else:
            logging.error(f"fail: {signup}")


async def worker(queue, session):
    while True:
        signup = await queue.get()
        await create_signup(signup, session)
        queue.task_done()


def create_tasks(queue, session):
    tasks = []
    for _ in range(NUM_WORKERS):
        task = asyncio.create_task(worker(queue, session))
        tasks.append(task)
    return tasks


async def cancel_tasks(tasks):
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)


async def main():
    signups = load_signups(REMINDERS_SIGNUPS_JSON)
    queue = enqueue_signups(signups)

    async with aiohttp.ClientSession() as session:
        tasks = create_tasks(queue, session)

        await queue.join()
        await cancel_tasks(tasks)


if __name__ == "__main__":
    asyncio.run(main())
