import { AI_CONFIG, OpenRouterClient } from "luminicad-ai";
import { IApplication, ICommand, command } from "luminicad-core";
import { ChatInterface } from "luminicad-ui";

@command({
    name: "ai.chat",
    display: "command.ai.chat",
    icon: "icon-chat",
})
export class ChatCommand implements ICommand {
    private static chatInterface: ChatInterface;
    private static aiClient: OpenRouterClient;

    constructor() {
        // No params here
    }

    async execute(app: IApplication): Promise<void> {
        // Wait for application to be ready
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Initialize OpenRouter client if not already created
        if (!ChatCommand.aiClient) {
            // We no longer need to set an API key for client-side - the proxy handles this
            // Create the OpenRouter client without an API key
            ChatCommand.aiClient = new OpenRouterClient({
                model: AI_CONFIG.defaultModel,
            });
        }

        // Create the chat UI if needed
        if (!ChatCommand.chatInterface) {
            ChatCommand.chatInterface = new ChatInterface(
                app, // pass the app here
                ChatCommand.aiClient,
            );
            document.body.appendChild(ChatCommand.chatInterface);
        }

        // Show the interface
        ChatCommand.chatInterface.toggleVisibility(true);
    }
}
