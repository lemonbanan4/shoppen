import { AbstractNotificationProviderService } from "@medusajs/framework/utils";
import {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types";
import fs from "fs";
import path from "path";
import { renderEmailTemplate } from "./templates";

type InjectedDependencies = {
  logger: Logger;
};

type Options = {
  api_key?: string;
  from?: string;
};

/**
 * Email notification provider.
 *
 * With RESEND_API_KEY set, emails are sent through Resend. Without it (local
 * development), the rendered email is written to .medusa/emails/ and logged so
 * the full pipeline stays testable.
 */
export default class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend";

  protected logger_: Logger;
  protected options_: Options;

  constructor({ logger }: InjectedDependencies, options: Options) {
    super();
    this.logger_ = logger;
    this.options_ = options;
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const templateResult = renderEmailTemplate(
      notification.template,
      notification.data
    );
    const { subject, html, text } = templateResult;

    const apiKey =
      this.options_.api_key ||
      process.env.EMAIL_API_KEY ||
      process.env.RESEND_API_KEY;

    if (!apiKey) {
      const dir = path.join(process.cwd(), ".medusa", "emails");
      fs.mkdirSync(dir, { recursive: true });
      const ext = html ? "html" : "txt";
      const file = path.join(
        dir,
        `${Date.now()}-${notification.template}.${ext}`
      );
      fs.writeFileSync(file, (html || text) || "");
      this.logger_.info(
        `[email:dev] "${subject}" to ${notification.to} (no EMAIL_API_KEY / RESEND_API_KEY — written to ${file})`
      );
      return { id: `local-${Date.now()}` };
    }

    const payload: Record<string, any> = {
      from:
        notification.from ||
        this.options_.from ||
        process.env.FROM_EMAIL_ADDRESS ||
        process.env.RESEND_FROM_EMAIL ||
        "SOLKAST <hello@solkast.com>",
      to: [notification.to],
      subject,
    };

    if (html) {
      payload.html = html;
    }
    if (text) {
      payload.text = text;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend request failed (${response.status}): ${body}`);
    }

    const result = (await response.json()) as { id: string };
    this.logger_.info(`[email] "${subject}" sent to ${notification.to}`);
    return { id: result.id };
  }
}
