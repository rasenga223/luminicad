import { Logger } from "../foundation/logger";
import { Result } from "../foundation/result";

// Request Types
export type ContentPart =
    | { type: "text"; text: string }
    | {
          type: "image_url";
          image_url: {
              url: string;
              detail?: "auto" | "low" | "high";
          };
      };

export interface OpenRouterMessage {
    role: "user" | "assistant" | "system" | "tool";
    content: string | ContentPart[] | null; // Allow null content for assistant tool_calls messages
    name?: string;
    tool_call_id?: string;
    // Added tool_calls to the OpenRouterMessage interface for assistant responses.
    tool_calls?: {
        id: string;
        type: "function";
        function: {
            name: string;
            arguments: string; // This is a JSON string
        };
    }[];
}

export interface FunctionDescription {
    description?: string;
    name: string;
    parameters: object; // JSON Schema object
}

export interface Tool {
    type: "function";
    function: FunctionDescription;
}

export type ToolChoice =
    | "none"
    | "auto"
    | {
          // Specific function call
          type: "function";
          function: { name: string };
      }
    | "any"; // Replaces "required" for some models like Cohere Command R+

export interface OpenRouterChatOptions {
    apiKey?: string; // Kept for direct calls during dev/testing, but proxy is preferred.
    model?: string;
    temperature?: number;
    max_tokens?: number; // Changed from maxTokens to match requestBody
    stream?: boolean;
    // Added tools and tool_choice to options.
    tools?: Tool[];
    tool_choice?: ToolChoice;
    response_format?: { type: "json_object" };
    stop?: string | string[];
    transforms?: string[];
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}

// This was OpenRouterConfig, renamed to OpenRouterRequest to better reflect its use.
// However, the main request structure for chat completions is more specific.
// Let's refine this to represent the actual request body for /chat/completions.

export interface OpenRouterChatRequestBody {
    messages: OpenRouterMessage[];
    model: string; // model is required in the body
    response_format?: { type: "json_object" };
    stop?: string | string[];
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
    tools?: Tool[];
    tool_choice?: ToolChoice;
    transforms?: string[];
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}

export interface OpenRouterResponse {
    id?: string; // Optional ID for the response
    choices: {
        message: OpenRouterMessage; // This is the full message object
        finish_reason: string; // e.g., "stop", "tool_calls", "length"
        // logprobs, etc. can be added if needed
    }[];
    usage?: {
        // Optional usage statistics
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    // model, system_fingerprint, etc.
}

export class OpenRouterClient {
    private readonly baseUrl: string;
    private readonly defaultModel: string; // Renamed from model to defaultModel for clarity
    private static _apiKey: string | undefined;

    constructor(config?: Partial<OpenRouterChatOptions>) {
        // Use OpenRouterChatOptions for constructor config
        this.baseUrl = "https://openrouter.ai/api/v1"; // Removed config.baseUrl to fix to standard OpenRouter URL
        this.defaultModel = config?.model || "anthropic/claude-3.5-sonnet";

        if (config?.apiKey) {
            OpenRouterClient._apiKey = config.apiKey;
        }
    }

    static setApiKey(key: string) {
        OpenRouterClient._apiKey = key;
    }

    private getApiKey(): Result<string> {
        const key = OpenRouterClient._apiKey;
        // Allow proxy mode by default if no key is set.
        // Client explicitly setting key indicates direct call intention (dev/test).
        if (!key) {
            return Result.ok("proxy-mode");
        }
        return Result.ok(key);
    }

    /**
     * Sends a chat request to OpenRouter with the given messages and logs the request and response.
     * @param messages - Array of messages in the chat.
     * @param options - Optional configurations for the request, including model, tools, and tool_choice.
     * @returns A Result object containing the full assistant OpenRouterMessage on success, or an error string.
     */
    async chat(
        messages: OpenRouterMessage[],
        options: Partial<OpenRouterChatOptions> = {}, // Use OpenRouterChatOptions for method options
    ): Promise<Result<OpenRouterMessage, string>> {
        // Return full OpenRouterMessage
        const apiKeyResult = this.getApiKey();
        // No need to check apiKeyResult.isOk if proxy-mode is a valid success state for getApiKey.
        // The actual check for API key presence will happen if not in proxy mode.

        try {
            const requestBody: OpenRouterChatRequestBody = {
                model: options.model || this.defaultModel,
                messages,
                temperature: options.temperature ?? 0.2,
                max_tokens: options.max_tokens ?? 8192, // Ensure consistency with OpenRouterChatOptions field name
                stream: options.stream ?? false,
                top_p: options.top_p ?? 0.9,
                frequency_penalty: options.frequency_penalty ?? 0.1,
                presence_penalty: options.presence_penalty ?? 0.1,
            };

            // Add tools and tool_choice to requestBody if provided in options.
            if (options.tools) {
                requestBody.tools = options.tools;
            }
            if (options.tool_choice) {
                requestBody.tool_choice = options.tool_choice;
            }
            if (options.response_format) {
                requestBody.response_format = options.response_format;
            }
            if (options.stop) {
                requestBody.stop = options.stop;
            }
            if (options.transforms) {
                requestBody.transforms = options.transforms;
            }

            Logger.info(`Sending OpenRouter request: ${JSON.stringify(requestBody).substring(0, 500)}...`); // Log truncated request

            let response;
            const isProxyMode = apiKeyResult.isOk && apiKeyResult.value === "proxy-mode";

            if (isProxyMode) {
                response = await fetch("/api/openrouter-proxy", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                });
            } else {
                if (!apiKeyResult.isOk || !apiKeyResult.value || apiKeyResult.value === "proxy-mode") {
                    // This case should ideally not be hit if getApiKey is working as intended for direct calls
                    return Result.err(
                        "API key is required for direct OpenRouter calls but was not provided or is invalid.",
                    );
                }
                response = await fetch(`${this.baseUrl}/chat/completions`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKeyResult.value}`,
                        "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "", // Handle server-side context
                        "X-Title": "LuminiCAD",
                    },
                    body: JSON.stringify(requestBody),
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                Logger.error(`OpenRouter request failed with status ${response.status}: ${errorText}`);
                return Result.err(`OpenRouter error (${response.status}): ${errorText}`);
            }

            const data: OpenRouterResponse = await response.json();
            Logger.info(`Received OpenRouter response: ${JSON.stringify(data).substring(0, 500)}...`); // Log truncated response

            if (data.choices && data.choices.length > 0) {
                // Return the entire message object from the first choice.
                return Result.ok(data.choices[0].message);
            } else {
                Logger.error("OpenRouter response missing choices or message.");
                return Result.err("OpenRouter response was malformed: No choices or message found.");
            }
        } catch (error: any) {
            Logger.error(`Failed to communicate with OpenRouter: ${error.message || error}`, error);
            return Result.err(`Failed to communicate with OpenRouter: ${error.message || error}`);
        }
    }

    static createSystemMessage(content: string): OpenRouterMessage {
        return { role: "system", content };
    }

    static createUserMessage(content: string | ContentPart[]): OpenRouterMessage {
        return { role: "user", content };
    }

    // static createImageMessage(imageUrl: string, text?: string): OpenRouterMessage { ... } // Keep if needed
}
