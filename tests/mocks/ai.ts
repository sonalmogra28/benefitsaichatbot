import { LanguageModelV2 } from 'ai';

export class MockLanguageModelV2 implements LanguageModelV2 {
  constructor(private options: any) {}

  doGenerate(options: any) {
    return this.options.doGenerate(options);
  }

  doStream(options: any) {
    return this.options.doStream(options);
  }
}
