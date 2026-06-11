import { buildMimocodePromptBlocks, buildMimocodePromptText } from '../../../../src/providers/mimocode/runtime/buildMimocodePrompt';

describe('buildMimocodePromptText', () => {
  it('appends Claudian XML context to the user query', () => {
    const prompt = buildMimocodePromptText({
      browserSelection: {
        selectedText: 'Browser quote',
        source: 'browser:https://example.com',
        title: 'Example',
        url: 'https://example.com',
      },
      currentNotePath: 'notes/today.md',
      editorSelection: {
        mode: 'selection',
        notePath: 'notes/today.md',
        selectedText: 'Selected text',
        startLine: 4,
        lineCount: 2,
      },
      text: 'Summarize this',
    });

    expect(prompt).toContain('Summarize this');
    expect(prompt).toContain('<current_note>');
    expect(prompt).toContain('notes/today.md');
    expect(prompt).toContain('<editor_selection path="notes/today.md" lines="4-5">');
    expect(prompt).toContain('<browser_selection source="browser:https://example.com" title="Example" url="https://example.com">');
  });

  it('does not auto-attach external context folders to the OpenCode prompt', () => {
    const prompt = buildMimocodePromptText({
      externalContextPaths: ['/tmp/project'],
      text: 'Summarize this',
    });

    expect(prompt).toContain('Summarize this');
    expect(prompt).not.toContain('<context_files>');
    expect(prompt).not.toContain('/tmp/project');
  });

  it('rebuilds prior conversation context when a native session must be recreated', () => {
    const prompt = buildMimocodePromptText(
      {
        text: 'Continue with the fix',
      },
      [
        {
          content: 'Inspect the bug',
          id: 'user-1',
          role: 'user',
          timestamp: 1,
        },
        {
          content: 'I found the failing path',
          id: 'assistant-1',
          role: 'assistant',
          timestamp: 2,
        },
      ],
    );

    expect(prompt).toContain('User: Inspect the bug');
    expect(prompt).toContain('Assistant: I found the failing path');
    expect(prompt).toContain('User: Continue with the fix');
  });
});

describe('buildMimocodePromptBlocks', () => {
  it('includes image attachments after the main text block', () => {
    const blocks = buildMimocodePromptBlocks({
      images: [{
        data: 'base64-image',
        id: 'img-1',
        mediaType: 'image/png',
        name: 'diagram.png',
        size: 123,
        source: 'file',
      }],
      text: 'Inspect this image',
    });

    expect(blocks).toEqual([
      { type: 'text', text: 'Inspect this image' },
      { type: 'image', mimeType: 'image/png', data: 'base64-image' },
    ]);
  });
});
