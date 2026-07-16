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
    const { subject, html } = renderEmailTemplate(
      notification.template,
      notification.data
    );

    if (!this.options_.api_key) {
      const dir = path.join(process.cwd(), ".medusa", "emails");
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(
        dir,
        `${Date.now()}-${notification.template}.html`
      );
      fs.writeFileSync(file, html);
      this.logger_.info(
        `[email:dev] "${subject}" to ${notification.to} (no RESEND_API_KEY — written to ${file})`
      );
      return { id: `local-${Date.now()}` };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options_.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.options_.from || "Shoppen <onboarding@resend.dev>",
        to: [notification.to],
        subject,
        html,
      }),
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
