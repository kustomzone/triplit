import { Command } from '../command.js';
import * as Flag from '../flags.js';
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';
import axios, { AxiosError } from 'axios';
import { accessTokenMiddleware } from '../middleware/account-auth.js';

export default Command({
  description: 'Deploy to Triplit Cloud',
  preRelease: true,
  middleware: [accessTokenMiddleware],
  flags: {
    projectId: Flag.String({
      description: 'Project ID',
    }),
    triplitDir: Flag.String({
      description: 'Triplit directory',
      char: 'd',
      default: './triplit',
    }),
  },
  async run({ flags, ctx, args }) {
    const workerPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../deploy/worker.js'
    );
    const result = await esbuild.build({
      entryPoints: [workerPath],
      bundle: true,
      // outfile: './triplit/.deploy/index.js',
      write: false,
      alias: {
        '@/schema': './triplit/schema.ts',
      },
    });
    if (result.errors.length) {
      for (const error of result.errors) {
        console.error(error.text);
      }
      return;
    }
    const resultBytes = result.outputFiles[0].contents;
    const resultTextBase64 = Buffer.from(resultBytes).toString('base64');
    try {
      const response = await axios.post(
        `http://localhost:8787/deploy/${flags.projectId}`,
        resultTextBase64,
        {
          headers: {
            'Content-Type': 'text/plain',
            Authorization: 'Bearer ' + ctx.accessToken,
          },
        }
      );
      console.log('Deployed successfully.');
    } catch (err) {
      console.log('Could not upload code bundle.');
      if (err instanceof AxiosError) {
        // log info about Axios Error
        if (err.request) {
          console.log(err.code);
          return;
        }
        if (err.response) {
          console.log(err.response.status);
          console.log(err.response.data);
          return;
        }
      }
      console.error(err);
    }
  },
});
