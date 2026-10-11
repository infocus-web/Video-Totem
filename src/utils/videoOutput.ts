import type { SequenceConfig } from '../types';

export function videoOutput(config: Pick<SequenceConfig, 'width' | 'height' | 'outputRotation'>) {
  const rotation = config.width < config.height && (config.outputRotation === 90 || config.outputRotation === 270) ? config.outputRotation : 0;
  return {
    width: rotation ? config.height : config.width,
    height: rotation ? config.width : config.height,
    rotation,
  };
}
