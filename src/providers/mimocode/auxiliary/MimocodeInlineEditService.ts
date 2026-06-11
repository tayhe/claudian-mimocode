import { QueryBackedInlineEditService } from '../../../core/auxiliary/QueryBackedInlineEditService';
import type ClaudianPlugin from '../../../main';
import { MimocodeAuxQueryRunner } from '../runtime/MimocodeAuxQueryRunner';

export class MimocodeInlineEditService extends QueryBackedInlineEditService {
  constructor(plugin: ClaudianPlugin) {
    super(new MimocodeAuxQueryRunner(plugin, {
      agentProfile: 'readonly',
      artifactPurpose: 'inline',
      allowReadTextFile: true,
    }));
  }
}
