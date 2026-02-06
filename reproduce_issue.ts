
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const baseURL = "https://nuvai-resource.openai.azure.com/anthropic/v1/messages";

// Mock fetch to capture the URL
const originalFetch = global.fetch;
global.fetch = async (input, init) => {
    console.log("Requested URL:", input);
    return new Response("{}", { status: 200 });
};

const anthropic = createAnthropic({
    baseURL: baseURL,
    apiKey: "dummy",
});

async function run() {
    try {
        await generateText({
            model: anthropic("claude-3-haiku-20240307"),
            prompt: "Hello",
        });
    } catch (e) {
        // Ignore errors from the mock response
    }
}

run();
