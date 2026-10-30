import { toPng, toSvg } from 'html-to-image';
import { downloadDataUrl } from '../lib/files';

const HIDDEN = [
  'react-flow__minimap',
  'react-flow__controls',
  'react-flow__panel',
  'react-flow__attribution',
];

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

// Saves the canvas as it looks in the current view. The caller fits the view
// to the content first, so the picture holds everything and not just what is on screen.
export async function exportCanvasImage(kind: 'png' | 'svg', filename: string): Promise<void> {
  const element = document.querySelector<HTMLElement>('.canvas');
  if (!element) throw new Error('The canvas is not on screen.');

  // Let the fitted view settle before taking the picture.
  await nextFrame();
  await nextFrame();

  const options = {
    backgroundColor: getComputedStyle(element).backgroundColor,
    filter: (node: HTMLElement) => !HIDDEN.some((c) => node.classList?.contains(c)),
  };
  const dataUrl =
    kind === 'png'
      ? await toPng(element, { ...options, pixelRatio: 2 })
      : await toSvg(element, options);
  downloadDataUrl(filename, dataUrl);
}
