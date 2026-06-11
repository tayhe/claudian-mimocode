import type { ProviderCommandCatalog } from '../../../core/providers/commands/ProviderCommandCatalog';
import { ProviderWorkspaceRegistry } from '../../../core/providers/ProviderWorkspaceRegistry';
import type {
  ProviderTabWarmupPolicy,
  ProviderWorkspaceRegistration,
  ProviderWorkspaceServices,
} from '../../../core/providers/types';
import type { VaultFileAdapter } from '../../../core/storage/VaultFileAdapter';
import { MimocodeAgentMentionProvider } from '../agents/MimocodeAgentMentionProvider';
import { MimocodeCommandCatalog } from '../commands/MimocodeCommandCatalog';
import { MimocodeCliResolver } from '../runtime/MimocodeCliResolver';
import { MimocodeAgentStorage } from '../storage/MimocodeAgentStorage';
import { mimocodeSettingsTabRenderer } from '../ui/MimocodeSettingsTab';
import { MimocodeRuntimeCommandLoader } from './MimocodeRuntimeCommandLoader';

export interface MimocodeWorkspaceServices extends ProviderWorkspaceServices {
  agentStorage: MimocodeAgentStorage;
  agentMentionProvider: MimocodeAgentMentionProvider;
  commandCatalog: ProviderCommandCatalog;
}

const mimocodeTabWarmupPolicy: ProviderTabWarmupPolicy = {
  resolveMode() {
    return 'commands';
  },
};

export async function createMimocodeWorkspaceServices(
  vaultAdapter: VaultFileAdapter,
): Promise<MimocodeWorkspaceServices> {
  const agentStorage = new MimocodeAgentStorage(vaultAdapter);
  const agentMentionProvider = new MimocodeAgentMentionProvider(agentStorage);
  await agentMentionProvider.loadAgents();

  return {
    agentStorage,
    agentMentionProvider,
    commandCatalog: new MimocodeCommandCatalog(),
    cliResolver: new MimocodeCliResolver(),
    runtimeCommandLoader: new MimocodeRuntimeCommandLoader(),
    settingsTabRenderer: mimocodeSettingsTabRenderer,
    tabWarmupPolicy: mimocodeTabWarmupPolicy,
    refreshAgentMentions: async () => {
      await agentMentionProvider.loadAgents();
    },
  };
}

export const mimocodeWorkspaceRegistration: ProviderWorkspaceRegistration<MimocodeWorkspaceServices> = {
  initialize: async ({ vaultAdapter }) => createMimocodeWorkspaceServices(vaultAdapter),
};

export function maybeGetMimocodeWorkspaceServices(): MimocodeWorkspaceServices | null {
  return ProviderWorkspaceRegistry.getServices('mimocode') as MimocodeWorkspaceServices | null;
}
