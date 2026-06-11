import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  MIMOCODE_SAFE_MODE_ID,
  MIMOCODE_YOLO_MODE_ID,
} from '../../../../src/providers/mimocode/modes';
import {
  buildMimocodeManagedConfig,
  prepareMimocodeLaunchArtifacts,
} from '../../../../src/providers/mimocode/runtime/MimocodeLaunchArtifacts';

describe('buildMimocodeManagedConfig', () => {
  it('pins OpenCode build, YOLO, safe, and plan prompts to the managed prompt file', () => {
    expect(buildMimocodeManagedConfig({}, '/vault/.claudian/mimocode/system.md', 'Yishen')).toEqual({
      $schema: 'https://mimocode.ai/config.json',
      agent: {
        build: {
          prompt: '{file:/vault/.claudian/mimocode/system.md}',
        },
        [MIMOCODE_YOLO_MODE_ID]: {
          mode: 'primary',
          permission: {
            plan_enter: 'allow',
            question: 'allow',
          },
          prompt: '{file:/vault/.claudian/mimocode/system.md}',
        },
        [MIMOCODE_SAFE_MODE_ID]: {
          mode: 'primary',
          permission: {
            bash: 'ask',
            edit: 'ask',
            plan_enter: 'allow',
            question: 'allow',
          },
          prompt: '{file:/vault/.claudian/mimocode/system.md}',
        },
        plan: {
          prompt: '{file:/vault/.claudian/mimocode/system.md}',
        },
      },
      username: 'Yishen',
    });
  });

  it('can create a dedicated aux agent and default it for the process', () => {
    expect(buildMimocodeManagedConfig(
      {},
      '/vault/.claudian/mimocode/auxiliary/system.md',
      undefined,
      [{
        definition: {
          mode: 'primary',
          permission: {
            '*': 'deny',
            read: 'allow',
          },
        },
        id: 'claudian-aux-readonly',
      }],
      'claudian-aux-readonly',
    )).toEqual({
      $schema: 'https://mimocode.ai/config.json',
      agent: {
        'claudian-aux-readonly': {
          mode: 'primary',
          permission: {
            '*': 'deny',
            read: 'allow',
          },
          prompt: '{file:/vault/.claudian/mimocode/auxiliary/system.md}',
        },
      },
      default_agent: 'claudian-aux-readonly',
    });
  });

  it('merges the user config instead of replacing it', () => {
    expect(buildMimocodeManagedConfig({
      agent: {
        build: {
          model: 'openai/gpt-5',
          permission: {
            bash: 'ask',
            edit: 'ask',
          },
        },
      },
      default_agent: 'build',
      providers: {
        openai: {
          api_key: 'test-key',
        },
      },
      username: 'Existing',
    }, '/vault/.claudian/mimocode/system.md')).toEqual({
      $schema: 'https://mimocode.ai/config.json',
      agent: {
        build: {
          model: 'openai/gpt-5',
          permission: {
            bash: 'ask',
            edit: 'ask',
          },
          prompt: '{file:/vault/.claudian/mimocode/system.md}',
        },
        [MIMOCODE_YOLO_MODE_ID]: {
          mode: 'primary',
          permission: {
            plan_enter: 'allow',
            question: 'allow',
          },
          prompt: '{file:/vault/.claudian/mimocode/system.md}',
        },
        [MIMOCODE_SAFE_MODE_ID]: {
          mode: 'primary',
          permission: {
            bash: 'ask',
            edit: 'ask',
            plan_enter: 'allow',
            question: 'allow',
          },
          prompt: '{file:/vault/.claudian/mimocode/system.md}',
        },
        plan: {
          prompt: '{file:/vault/.claudian/mimocode/system.md}',
        },
      },
      default_agent: 'build',
      providers: {
        openai: {
          api_key: 'test-key',
        },
      },
      username: 'Existing',
    });
  });
});

describe('prepareMimocodeLaunchArtifacts', () => {
  it('layers the managed prompt config on top of MIMOCODE_CONFIG', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'claudian-mimocode-artifacts-'));
    const baseConfigPath = path.join(tmpRoot, 'mimocode.base.json');
    await fs.writeFile(baseConfigPath, JSON.stringify({
      agent: {
        build: {
          model: 'openai/gpt-5',
        },
      },
      default_agent: 'build',
      providers: {
        anthropic: {
          api_key: 'anthropic-key',
        },
      },
    }), 'utf8');

    const result = await prepareMimocodeLaunchArtifacts({
      runtimeEnv: {
        HOME: tmpRoot,
        MIMOCODE_CONFIG: baseConfigPath,
      } as NodeJS.ProcessEnv,
      settings: {
        customPrompt: '',
        mediaFolder: '',
        userName: 'Yishen',
        vaultPath: tmpRoot,
      },
      workspaceRoot: tmpRoot,
    });

    expect(result.configPath).toBe(path.join(tmpRoot, '.claudian', 'mimocode', 'config.json'));
    expect(result.systemPromptPath).toBe(path.join(tmpRoot, '.claudian', 'mimocode', 'system.md'));
    expect(result.configContent).toContain(`"prompt": "{file:${result.systemPromptPath}}"`);
    const generatedConfig = JSON.parse(await fs.readFile(result.configPath, 'utf8'));
    expect(generatedConfig).toMatchObject({
      default_agent: 'build',
      providers: {
        anthropic: {
          api_key: 'anthropic-key',
        },
      },
      username: 'Yishen',
    });
    expect(generatedConfig.agent).toMatchObject({
      build: {
        model: 'openai/gpt-5',
        prompt: `{file:${result.systemPromptPath}}`,
      },
      [MIMOCODE_YOLO_MODE_ID]: {
        mode: 'primary',
        permission: {
          plan_enter: 'allow',
          question: 'allow',
        },
        prompt: `{file:${result.systemPromptPath}}`,
      },
      [MIMOCODE_SAFE_MODE_ID]: {
        mode: 'primary',
        permission: {
          bash: 'ask',
          edit: 'ask',
          plan_enter: 'allow',
          question: 'allow',
        },
        prompt: `{file:${result.systemPromptPath}}`,
      },
      plan: {
        prompt: `{file:${result.systemPromptPath}}`,
      },
    });
  });

  it('keeps the launch key stable when the resolved default database is later passed as MIMOCODE_DB', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'claudian-mimocode-artifacts-'));
    const baseParams = {
      settings: {
        customPrompt: '',
        mediaFolder: '',
        userName: '',
        vaultPath: tmpRoot,
      },
      workspaceRoot: tmpRoot,
    };
    const first = await prepareMimocodeLaunchArtifacts({
      ...baseParams,
      runtimeEnv: {
        HOME: tmpRoot,
      } as NodeJS.ProcessEnv,
    });

    const second = await prepareMimocodeLaunchArtifacts({
      ...baseParams,
      runtimeEnv: {
        HOME: tmpRoot,
        MIMOCODE_DB: first.databasePath ?? undefined,
      } as NodeJS.ProcessEnv,
    });

    expect(first.databasePath).toBe(second.databasePath);
    expect(first.launchKey).toBe(second.launchKey);
  });

  it('creates the resolved OpenCode database directory before launch', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'claudian-mimocode-artifacts-'));
    const xdgDataHome = path.join(tmpRoot, 'xdg-data');
    const databaseDir = path.join(xdgDataHome, 'mimocode');

    const result = await prepareMimocodeLaunchArtifacts({
      runtimeEnv: {
        HOME: path.join(tmpRoot, 'home'),
        XDG_DATA_HOME: xdgDataHome,
      } as NodeJS.ProcessEnv,
      settings: {
        customPrompt: '',
        mediaFolder: '',
        userName: '',
        vaultPath: tmpRoot,
      },
      workspaceRoot: tmpRoot,
    });

    expect(result.databasePath).toBe(path.join(databaseDir, 'mimocode.db'));
    await expect(fs.access(databaseDir)).resolves.toBeUndefined();
  });
});
