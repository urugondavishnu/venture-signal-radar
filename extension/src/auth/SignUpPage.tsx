import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from './AuthContext';

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignUpForm = z.infer<typeof signUpSchema>;

interface SignUpPageProps {
  onSwitchToLogin: () => void;
}

export function SignUpPage({ onSwitchToLogin }: SignUpPageProps) {
  const { signUp } = useAuth();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpForm) => {
    setServerError('');
    setLoading(true);
    const { error } = await signUp(data.email, data.password);
    if (error) {
      setServerError(error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-[400px]">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-b from-[#6c63ff]/15 to-transparent rounded-3xl blur-2xl" />
          <div className="relative bg-[#111118] border border-[#1c1c2c] rounded-2xl shadow-2xl">
            <div className="flex flex-col px-8 py-9">
              <div className="flex justify-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#6c63ff]/10 border border-[#6c63ff]/20">
                  <span className="text-2xl leading-none">📡</span>
                </div>
              </div>
              <h1 className="text-[20px] font-semibold text-white text-center mt-3 tracking-tight">
                Create Account
              </h1>
              <p className="text-[13px] text-[#555568] text-center mt-2 leading-snug">
                Join Daily Delta
              </p>
              {success ? (
                <div className="flex flex-col items-center mt-6">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-green-500/10 border border-green-500/20 mb-4">
                    <span className="text-lg text-green-400">&#10003;</span>
                  </div>
                  <div className="w-full bg-green-500/8 border border-green-500/15 rounded-lg px-3.5 py-2.5 mb-4">
                    <p className="text-green-400 text-[12px] leading-relaxed text-center">
                      Account created! Check your email to confirm, then sign in.
                    </p>
                  </div>
                  <button
                    onClick={onSwitchToLogin}
                    className="inline-flex items-center gap-1 text-[13px] text-[#6c63ff] hover:text-[#8b83ff] font-semibold cursor-pointer transition-colors"
                  >
                    Go to Sign In &rarr;
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-5 px-3.5 py-2.5 rounded-lg bg-[#16161f] border border-[#22222e]">
                    <p className="text-[11px] text-[#7a7a90] leading-[1.6] text-center">
                      Intelligence reports will be sent to the email you sign up with.
                    </p>
                  </div>
                  <form onSubmit={handleSubmit(onSubmit)} className="mt-5 flex flex-col">
                    <div>
                      <label className="block text-[11px] font-medium text-[#6a6a80] mb-1.5">Email</label>
                      <input
                        type="email"
                        {...register('email')}
                        className="w-full h-10 px-3.5 bg-[#0c0c14] border border-[#252535] rounded-lg text-[13px] text-white placeholder-[#3a3a4e] focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/25 focus:outline-none transition-all"
                        placeholder="you@example.com"
                        autoFocus
                      />
                      {errors.email && (
                        <p className="text-red-400 text-[11px] mt-1 pl-0.5">{errors.email.message}</p>
                      )}
                    </div>
                    <div className="mt-3">
                      <label className="block text-[11px] font-medium text-[#6a6a80] mb-1.5">Password</label>
                      <input
                        type="password"
                        {...register('password')}
                        className="w-full h-10 px-3.5 bg-[#0c0c14] border border-[#252535] rounded-lg text-[13px] text-white placeholder-[#3a3a4e] focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/25 focus:outline-none transition-all"
                        placeholder="Min 8 characters"
                      />
                      {errors.password && (
                        <p className="text-red-400 text-[11px] mt-1 pl-0.5">{errors.password.message}</p>
                      )}
                    </div>
                    <div className="mt-3">
                      <label className="block text-[11px] font-medium text-[#6a6a80] mb-1.5">Confirm Password</label>
                      <input
                        type="password"
                        {...register('confirmPassword')}
                        className="w-full h-10 px-3.5 bg-[#0c0c14] border border-[#252535] rounded-lg text-[13px] text-white placeholder-[#3a3a4e] focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff]/25 focus:outline-none transition-all"
                        placeholder="Repeat your password"
                      />
                      {errors.confirmPassword && (
                        <p className="text-red-400 text-[11px] mt-1 pl-0.5">{errors.confirmPassword.message}</p>
                      )}
                    </div>
                    {serverError && (
                      <div className="mt-3 bg-red-500/8 border border-red-500/15 rounded-lg px-3.5 py-2.5">
                        <p className="text-red-400 text-[12px]">{serverError}</p>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-4 w-full h-10 bg-[#6c63ff] hover:bg-[#5f57e8] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-white text-[13px] font-semibold rounded-lg transition-all cursor-pointer shadow-md shadow-[#6c63ff]/15"
                    >
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating account...
                        </span>
                      ) : (
                        'Sign Up'
                      )}
                    </button>
                  </form>
                  <div className="flex items-center gap-3 mt-3 mb-2">
                    <div className="flex-1 h-px bg-[#1c1c2c]" />
                    <span className="text-[10px] text-[#3a3a4e] uppercase tracking-widest">or</span>
                    <div className="flex-1 h-px bg-[#1c1c2c]" />
                  </div>
                  <p className="text-center text-[13px] text-[#555568]">
                    Already have an account?{' '}
                    <button
                      onClick={onSwitchToLogin}
                      className="text-[#6c63ff] hover:text-[#8b83ff] font-semibold cursor-pointer transition-colors"
                    >
                      Sign In
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
