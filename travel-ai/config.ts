import * as dotenv from "dotenv";
dotenv.config();

class Config {
    openai_api_key: string = "";
    have_openai_api_key: boolean = false;
    anthropic_api_key: string = "";
    have_anthropic_api_key: boolean = false;
    have_model: boolean = false;
    model_name: string = "claude-3-7-sonnet-20250219";
    amadeus_bearer_token: string = "";
    have_amadeus_bearer_token: boolean = false;
    amadeus_url: string = "";
    have_amadeus_url: boolean = false;
    is_interrupt: boolean = false;
    have_is_interrupt: boolean = false;

    constructor() {
        this.init();
    }

    populate(name: string): string {
        return process.env[name] || "";
    }

    apiKeyExists(name: string): boolean {
        return this.populate(name) !== "";
    }

    init() {
        this.have_openai_api_key = this.apiKeyExists("OPENAI_API_KEY");
        this.have_anthropic_api_key = this.apiKeyExists("ANTHROPIC_API_KEY");
        this.have_model = this.apiKeyExists("MODEL_NAME");
        this.openai_api_key = this.populate("OPENAI_API_KEY");
        this.anthropic_api_key = this.populate("ANTHROPIC_API_KEY");
        this.model_name = this.populate("MODEL_NAME") || "claude-3-7-sonnet-20250219";
        this.have_amadeus_bearer_token = this.apiKeyExists("AMADEUS_BEARER_TOKEN");
        this.amadeus_bearer_token = this.populate("AMADEUS_BEARER_TOKEN");
        this.have_amadeus_url = this.apiKeyExists("AMADEUS_URL");
        this.amadeus_url = this.populate("AMADEUS_URL");
        this.have_is_interrupt = this.apiKeyExists("IS_INTERRUPT");
        this.is_interrupt = this.populate("IS_INTERRUPT") === "false";
    }
}

export const config = new Config();