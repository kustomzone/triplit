import prompts from 'prompts';
import { Command } from '../command.js';
import * as Flag from '../flags.js';
import { getSession, storeSession } from '../auth-state.js';
import { supabase } from '../supabase.js';

export default Command({
  description: 'Authenticate with Triplit Cloud',
  preRelease: true,
  //   flags: {
  //     email: Flag.String({
  //       char: 'e',
  //       description: 'Email address to login with',
  //     }),
  //   },
  args: [{ name: 'email', description: 'Email address to login with' }],
  async run({ flags, ctx, args }) {
    const existingSession = getSession();
    if (existingSession) {
      console.log('Already logged in!');
      return;
    }
    let email = args.email;
    if (!email) {
      const answer = await prompts({
        message: 'Enter your email address',
        name: 'email',
        type: 'text',
      });
      email = answer.email;
    }

    const authReponse = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });
    if (authReponse.error !== null) {
      console.log(authReponse.error);
      return;
    }

    const { code } = await prompts({
      message: `Enter the OTP sent to you ${email}`,
      name: 'code',
      type: 'password',
      initial: true,
    });

    const { data, error } = await supabase.auth.verifyOtp({
      type: 'email',
      email,
      token: code,
    });

    storeSession(data.session);
    console.log('Logged in successfully');
  },
});
