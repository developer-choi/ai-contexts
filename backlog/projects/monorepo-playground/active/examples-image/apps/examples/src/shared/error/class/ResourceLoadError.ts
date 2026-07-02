import BaseError from './BaseError';

interface ResourceLoadErrorOptions {
  url: string | Blob | null | undefined;
  type: 'image' | 'video' | 'script';
}

export default class ResourceLoadError extends BaseError {
  readonly options: ResourceLoadErrorOptions;
  readonly name = 'ResourceLoadError';

  constructor(options: ResourceLoadErrorOptions) {
    super(`[${options.type}] ${options.url}`, { level: 'info' });
    this.options = options;
  }
}
