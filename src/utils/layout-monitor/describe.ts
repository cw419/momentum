export function describeElement(element: HTMLElement): { tagName: string; id?: string; className?: string } {
  const className = typeof element.className === 'string' ? element.className : String(element.className);
  return {
    tagName: element.tagName,
    id: element.id || undefined,
    className: className || undefined,
  };
}

