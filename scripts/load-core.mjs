import { build } from 'esbuild';

export async function loadGlassWebCore() {
  const result = await build({
    absWorkingDir: new URL('..', import.meta.url).pathname,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    write: false,
    stdin: {
      contents: [
        "export { demoTrace } from './lib/glassweb/demo-trace.ts';",
        "export * from './lib/glassweb/trace-utils.ts';",
        "export * from './lib/glassweb/types.ts';",
      ].join('\n'),
      loader: 'ts',
      resolveDir: new URL('..', import.meta.url).pathname,
      sourcefile: 'glassweb-core-entry.ts',
    },
  });

  const source = Buffer.from(result.outputFiles[0].contents).toString('base64');
  return import(`data:text/javascript;base64,${source}`);
}
