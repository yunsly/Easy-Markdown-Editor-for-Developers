export interface BadgeMarkdownOptions {
  altText: string;
  imageUrl: string;
  linkUrl?: string;
}

const escapeMarkdownText = (value: string): string =>
  value.replace(/[\\[\]]/g, '\\$&');

const escapeMarkdownDestination = (value: string): string =>
  value.replace(/[\\()]/g, '\\$&');

export const createBadgeMarkdown = (
  options: BadgeMarkdownOptions,
): string => {
  const altText = options.altText.trim();
  const imageUrl = options.imageUrl.trim();

  if (altText.length === 0) {
    throw new Error('Badge alt text must not be empty.');
  }

  if (imageUrl.length === 0) {
    throw new Error('Badge image URL must not be empty.');
  }

  const imageMarkdown = `![${escapeMarkdownText(altText)}](${escapeMarkdownDestination(imageUrl)})`;
  const linkUrl = options.linkUrl?.trim();

  if (linkUrl === undefined || linkUrl.length === 0) {
    return imageMarkdown;
  }

  return `[${imageMarkdown}](${escapeMarkdownDestination(linkUrl)})`;
};
