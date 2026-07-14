export function extractWorkflowRunBlocks(workflow: string): string[] {
  const lines = workflow.split(/\r?\n/);
  const blocks: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const runMatch = /^(\s*)(?:-\s+)?run:\s*(.*)$/.exec(line);
    if (!runMatch) continue;

    const indent = runMatch[1]?.length ?? 0;
    const inlineCommand = runMatch[2] ?? '';
    if (!/^[>|][+-]?$/.test(inlineCommand)) {
      blocks.push(inlineCommand);
      continue;
    }

    const blockLines: string[] = [];
    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1] ?? '';
      const nextIndent = nextLine.match(/^\s*/)?.[0].length ?? 0;
      if (nextLine.trim() && nextIndent <= indent) break;
      blockLines.push(nextLine);
      index += 1;
    }
    blocks.push(blockLines.join('\n'));
  }

  return blocks;
}
