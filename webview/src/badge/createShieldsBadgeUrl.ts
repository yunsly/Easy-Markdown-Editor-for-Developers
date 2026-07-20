import type { BadgeDefinition } from './badgeTypes';

const SHIELDS_BADGE_BASE_URL = 'https://img.shields.io/badge/';

const encodeBadgePathPart = (value: string): string =>
  encodeURIComponent(value)
    .replaceAll('-', '--')
    .replaceAll('_', '__');

const normalizeColor = (color: string): string =>
  color.trim().replace(/^#/, '');

export const createShieldsBadgeUrl = (
  definition: BadgeDefinition,
): string => {
  const message = definition.message.trim();
  const messageColor = normalizeColor(definition.messageColor);

  if (message.length === 0) {
    throw new Error('Badge message must not be empty.');
  }

  if (messageColor.length === 0) {
    throw new Error('Badge message color must not be empty.');
  }

  const label = definition.label?.trim();
  const badgeParts = label === undefined || label.length === 0
    ? [message, messageColor]
    : [label, message, messageColor];
  const badgeContent = badgeParts.map(encodeBadgePathPart).join('-');
  const badgeUrl = new URL(`${SHIELDS_BADGE_BASE_URL}${badgeContent}`);

  if (definition.style !== 'flat') {
    badgeUrl.searchParams.set('style', definition.style);
  }

  if (definition.logo !== undefined && definition.logo.length > 0) {
    badgeUrl.searchParams.set('logo', definition.logo);

    if (
      definition.logoColor !== undefined &&
      definition.logoColor.length > 0
    ) {
      badgeUrl.searchParams.set(
        'logoColor',
        normalizeColor(definition.logoColor),
      );
    }
  }

  if (
    label !== undefined &&
    label.length > 0 &&
    definition.labelColor !== undefined &&
    definition.labelColor.length > 0
  ) {
    badgeUrl.searchParams.set(
      'labelColor',
      normalizeColor(definition.labelColor),
    );
  }

  return badgeUrl.toString();
};
