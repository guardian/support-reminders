export async function handler(event: any, context: any) {
    console.log("hello, world!")

    return {
        status: 200,
        body: "hello, world!"
    }
}
