import 'server-only';

import { createPublicKey, verify } from 'node:crypto';

export type DiscordInteractionOption = {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: DiscordInteractionOption[];
};

export type DiscordInteraction = {
  id: string;
  type: number;
  data?: {
    name?: string;
    options?: DiscordInteractionOption[];
  };
  member?: { user?: { id?: string } };
  user?: { id?: string };
};

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export function isDiscordInteractionsConfigured() {
  return Boolean(process.env.DISCORD_PUBLIC_KEY?.trim()?.match(/^[0-9a-f]{64}$/i));
}

export function verifyDiscordInteraction(
  rawBody: string,
  signature: string,
  timestamp: string,
) {
  const publicKeyHex = process.env.DISCORD_PUBLIC_KEY?.trim() ?? '';
  if (!/^[0-9a-f]{64}$/i.test(publicKeyHex)) return false;
  if (!/^[0-9a-f]{128}$/i.test(signature) || !/^\d{10,13}$/.test(timestamp)) return false;
  const timestampMilliseconds = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMilliseconds) || Math.abs(Date.now() - timestampMilliseconds) > 5 * 60 * 1000) {
    return false;
  }
  try {
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')]),
      format: 'der',
      type: 'spki',
    });
    return verify(
      null,
      Buffer.from(`${timestamp}${rawBody}`),
      key,
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

export function interactionActorId(interaction: DiscordInteraction) {
  return interaction.member?.user?.id || interaction.user?.id || '';
}

export function interactionSubcommand(interaction: DiscordInteraction) {
  return interaction.data?.options?.find((option) => option.type === 1) ?? null;
}

export function optionValue<T extends string | number | boolean>(
  options: DiscordInteractionOption[] | undefined,
  name: string,
) {
  return options?.find((option) => option.name === name)?.value as T | undefined;
}

export function interactionMessage(content: string, ephemeral = false) {
  return Response.json({
    type: 4,
    data: {
      content: content.slice(0, 2000),
      flags: ephemeral ? 64 : undefined,
      allowed_mentions: { parse: [] },
    },
  });
}
