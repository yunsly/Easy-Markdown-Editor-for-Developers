import type { Editor } from '@milkdown/kit/core';
import type { Node } from '@milkdown/kit/prose/model';
import type { NodeViewConstructor } from '@milkdown/kit/prose/view';
import { imageSchema } from '@milkdown/kit/preset/commonmark';
import { $view } from '@milkdown/kit/utils';

const NON_RELATIVE_SOURCE = /^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i;

const encodePathSegment = (segment: string): string => {
  let decodedSegment = segment;

  try {
    decodedSegment = decodeURIComponent(segment);
  } catch {
    // A literal percent sign is valid in a file name and encoded below.
  }

  return encodeURIComponent(decodedSegment).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
};

export function resolveWorkspaceImageSource(
  markdownSource: string,
  resourceBaseUri: string,
): string {
  if (markdownSource.length === 0 || NON_RELATIVE_SOURCE.test(markdownSource)) {
    return markdownSource;
  }

  try {
    const baseUrl = new URL(resourceBaseUri);

    if (!baseUrl.pathname.endsWith('/')) {
      baseUrl.pathname = `${baseUrl.pathname}/`;
    }

    const encodedSource = markdownSource.replaceAll('\\', '/').split('/')
      .map(encodePathSegment)
      .join('/');

    return new URL(encodedSource, baseUrl).toString();
  } catch {
    return markdownSource;
  }
}

const setImageAttributes = (
  image: HTMLImageElement,
  node: Node,
  resourceBaseUri: string,
): void => {
  const source = typeof node.attrs.src === 'string' ? node.attrs.src : '';
  const alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : '';
  const title = typeof node.attrs.title === 'string' ? node.attrs.title : '';
  image.src = resolveWorkspaceImageSource(source, resourceBaseUri);
  image.alt = alt;

  if (title.length > 0) {
    image.title = title;
  } else {
    image.removeAttribute('title');
  }
};

export const registerWorkspaceImageView = (
  editor: Editor,
  resourceBaseUri: string,
): void => {
  const workspaceImageView = $view(
    imageSchema.node,
    (): NodeViewConstructor => (initialNode) => {
      const image = document.createElement('img');
      setImageAttributes(image, initialNode, resourceBaseUri);

      return {
        dom: image,
        ignoreMutation: () => true,
        update: (node) => {
          if (node.type !== initialNode.type) {
            return false;
          }

          setImageAttributes(image, node, resourceBaseUri);
          return true;
        },
      };
    },
  );

  editor.use(workspaceImageView);
};
