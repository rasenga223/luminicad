import { Logger, Result } from "luminicad-core";

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
    content: string | ContentPart[] | null;
    name?: string;
    tool_call_id?: string;
    tool_calls?: {
        id: string;
        type: "function";
        function: {
            name: string;
            arguments: string;
        };
    }[];
}

export interface FunctionDescription {
    description?: string;
    name: string;
    parameters: object;
}

export interface Tool {
    type: "function";
    function: FunctionDescription;
}

export type ToolChoice = "none" | "auto" | { type: "function"; function: { name: string } } | "any";

export interface OpenRouterChatOptions {
    apiKey?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    tools?: Tool[];
    tool_choice?: ToolChoice;
    response_format?: { type: "json_object" };
    stop?: string | string[];
    transforms?: string[];
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}

export interface OpenRouterChatRequestBody {
    messages: OpenRouterMessage[];
    model: string;
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
    id?: string;
    choices: {
        message: OpenRouterMessage;
        finish_reason: string;
    }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class OpenRouterClient {
    private readonly baseUrl: string;
    private readonly defaultModel: string;
    private static _apiKey: string | undefined;

    constructor(config?: Partial<OpenRouterChatOptions>) {
        this.baseUrl = "https://openrouter.ai/api/v1";
        this.defaultModel = config?.model || "anthropic/claude-3.5-sonnet";
        if (config?.apiKey) {
            OpenRouterClient._apiKey = config.apiKey;
        }
    }

    static setApiKey(key: string) {
        OpenRouterClient._apiKey = key;
    }

    private getApiKey(): Result<string> {
        let key = OpenRouterClient._apiKey;
        if (!key && typeof window !== "undefined") {
            const w = window as any;
            try {
                key =
                    w.LUMINI_OPENROUTER_API_KEY ||
                    (w.localStorage && w.localStorage.getItem("OPENROUTER_API_KEY"));
            } catch {}
        }
        if (!key) return Result.ok("proxy-mode");
        return Result.ok(key);
    }

    async chat(
        messages: OpenRouterMessage[],
        options: Partial<OpenRouterChatOptions> = {},
    ): Promise<Result<OpenRouterMessage, string>> {
        const apiKeyResult = this.getApiKey();
        try {
            const requestBody: OpenRouterChatRequestBody = {
                model: options.model || this.defaultModel,
                messages,
                temperature: options.temperature ?? 0.2,
                max_tokens: options.max_tokens ?? 8192,
                stream: options.stream ?? false,
                top_p: options.top_p ?? 0.9,
                frequency_penalty: options.frequency_penalty ?? 0.1,
                presence_penalty: options.presence_penalty ?? 0.1,
            };
            if (options.tools) requestBody.tools = options.tools;
            if (options.tool_choice) requestBody.tool_choice = options.tool_choice;
            if (options.response_format) requestBody.response_format = options.response_format;
            if (options.stop) requestBody.stop = options.stop;
            if (options.transforms) requestBody.transforms = options.transforms;

            Logger.info(`Sending OpenRouter request: ${JSON.stringify(requestBody).substring(0, 500)}...`);

            let response: Response;
            const isProxyMode = apiKeyResult.isOk && apiKeyResult.value === "proxy-mode";
            if (isProxyMode) {
                response = await fetch("/api/openrouter-proxy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody),
                });
            } else {
                if (!apiKeyResult.isOk || !apiKeyResult.value || apiKeyResult.value === "proxy-mode") {
                    return Result.err(
                        "API key is required for direct OpenRouter calls but was not provided or is invalid.",
                    );
                }
                response = await fetch(`${this.baseUrl}/chat/completions`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKeyResult.value}`,
                        "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
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
            Logger.info(`Received OpenRouter response: ${JSON.stringify(data).substring(0, 500)}...`);
            if (data.choices && data.choices.length > 0) {
                return Result.ok(data.choices[0].message);
            }
            Logger.error("OpenRouter response missing choices or message.");
            return Result.err("OpenRouter response was malformed: No choices or message found.");
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
}
