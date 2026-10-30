import type { NotificationChannel } from "@prisma/client";

/**
 * Outbound channel drivers. Only the "log" driver ships; real providers (SMTP/Resend for email,
 * Termii/Twilio for SMS, WhatsApp Business Cloud API) implement this interface once credentials and
 * the relevant consent/messaging-policy review are in place.
 */
export type OutboundMessage = {
  to: { userId: string; email?: string | null; phone?: string | null };
  title: string;
  body: string;
  link?: string | null;
};

export interface ChannelDriver {
  readonly name: string;
  send(message: OutboundMessage): Promise<{ status: "SENT" | "SKIPPED"; detail?: string }>;
}

class LogDriver implements ChannelDriver {
  constructor(public readonly name: string) {}
  async send(message: OutboundMessage) {
    // Never log contact details or message bodies — just enough to trace delivery.
    console.info(JSON.stringify({ level: "info", msg: "notification.delivered", driver: this.name, userId: message.to.userId, title: message.title }));
    return { status: "SENT" as const };
  }
}

class NotConfiguredDriver implements ChannelDriver {
  constructor(public readonly name: string) {}
  async send() {
    return { status: "SKIPPED" as const, detail: `${this.name} driver not configured` };
  }
}

function pick(envValue: string | undefined, name: string): ChannelDriver {
  if (envValue === "log") return new LogDriver(name);
  return new NotConfiguredDriver(name);
}

export function driverFor(channel: Exclude<NotificationChannel, "IN_APP">): ChannelDriver {
  switch (channel) {
    case "EMAIL":
      return pick(process.env.EMAIL_DRIVER, "email");
    case "SMS":
      return pick(process.env.SMS_DRIVER, "sms");
    case "WHATSAPP":
      return pick(process.env.WHATSAPP_DRIVER, "whatsapp");
  }
}
