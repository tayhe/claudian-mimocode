import { QueryBackedInstructionRefineService } from '../../../core/auxiliary/QueryBackedInstructionRefineService';
import type ClaudianPlugin from '../../../main';
import { MimocodeAuxQueryRunner } from '../runtime/MimocodeAuxQueryRunner';

export class MimocodeInstructionRefineService extends QueryBackedInstructionRefineService {
  constructor(plugin: ClaudianPlugin) {
    super(new MimocodeAuxQueryRunner(plugin, {
      agentProfile: 'passive',
      artifactPurpose: 'instructions',
    }));
  }
}
