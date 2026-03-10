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
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4 antialiased">
      <div className="w-full max-w-[400px]">
        <div
          className="bg-white rounded-lg"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)' }}
        >
          <div className="flex flex-col px-8 py-9">

            {/* Title */}
            <h1
              className="text-[20px] font-semibold text-black text-center tracking-tight"
              style={{ fontFamily: "'Ubuntu', 'Helvetica Neue', Arial, sans-serif" }}
            >
              Create Account
            </h1>

            {/* Subtitle */}
            <p
              className="text-[13px] text-black/50 text-center mt-2 leading-snug"
              style={{ fontFamily: "'PT Serif', Georgia, serif" }}
            >
              Join Daily Delta
            </p>

            {success ? (
              <div className="flex flex-col items-center mt-6">
                <div className="flex items-center justify-center w-11 h-11 rounded-md bg-green-50 border border-green-200 mb-4">
                  <span className="text-lg text-green-600">&#10003;</span>
                </div>
                <div className="w-full bg-green-50 border border-green-200 rounded-md px-3.5 py-2.5 mb-4">
                  <p className="text-green-700 text-[12px] leading-relaxed text-center">
                    Account created! Check your email to confirm, then sign in.
                  </p>
                </div>
                <button
                  onClick={onSwitchToLogin}
                  className="inline-flex items-center gap-1 text-[13px] text-[#1342FF] hover:text-[#0F35D9] font-semibold cursor-pointer transition-colors"
                >
                  Go to Sign In &rarr;
                </button>
              </div>
            ) : (
              <>
                {/* Info notice */}
                <div className="mt-5 px-3.5 py-2.5 rounded-md bg-[#F5F5F5] border border-black/10">
                  <p
                    className="text-[11px] text-black/40 leading-[1.6] text-center uppercase tracking-wide"
                    style={{ fontFamily: "'Departure Mono', 'SF Mono', monospace" }}
                  >
                    Reports will be sent to the email you sign up with.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="mt-5 flex flex-col">
                  {/* Email */}
                  <div>
                    <label
                      className="block text-[10px] font-medium text-black/40 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: "'Departure Mono', 'SF Mono', monospace" }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full h-10 px-3.5 bg-[#F5F5F5] border border-black/10 rounded-md text-[13px] text-black placeholder-black/30 focus:border-[#1342FF] focus:ring-1 focus:ring-[#1342FF]/15 focus:outline-none transition-all"
                      style={{ fontFamily: "'PT Serif', Georgia, serif" }}
                      placeholder="you@example.com"
                      autoFocus
                    />
                    {errors.email && (
                      <p className="text-red-600 text-[11px] mt-1 pl-0.5">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="mt-3">
                    <label
                      className="block text-[10px] font-medium text-black/40 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: "'Departure Mono', 'SF Mono', monospace" }}
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      {...register('password')}
                      className="w-full h-10 px-3.5 bg-[#F5F5F5] border border-black/10 rounded-md text-[13px] text-black placeholder-black/30 focus:border-[#1342FF] focus:ring-1 focus:ring-[#1342FF]/15 focus:outline-none transition-all"
                      style={{ fontFamily: "'PT Serif', Georgia, serif" }}
                      placeholder="Min 8 characters"
                    />
                    {errors.password && (
                      <p className="text-red-600 text-[11px] mt-1 pl-0.5">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="mt-3">
                    <label
                      className="block text-[10px] font-medium text-black/40 mb-1.5 uppercase tracking-wider"
                      style={{ fontFamily: "'Departure Mono', 'SF Mono', monospace" }}
                    >
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      {...register('confirmPassword')}
                      className="w-full h-10 px-3.5 bg-[#F5F5F5] border border-black/10 rounded-md text-[13px] text-black placeholder-black/30 focus:border-[#1342FF] focus:ring-1 focus:ring-[#1342FF]/15 focus:outline-none transition-all"
                      style={{ fontFamily: "'PT Serif', Georgia, serif" }}
                      placeholder="Repeat your password"
                    />
                    {errors.confirmPassword && (
                      <p className="text-red-600 text-[11px] mt-1 pl-0.5">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  {/* Server error */}
                  {serverError && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-md px-3.5 py-2.5">
                      <p className="text-red-600 text-[12px]">{serverError}</p>
                    </div>
                  )}

                  {/* Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 w-full h-10 bg-[#1342FF] hover:bg-[#0F35D9] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-white text-[11px] font-semibold rounded-md transition-all cursor-pointer uppercase tracking-wider"
                    style={{ fontFamily: "'Departure Mono', 'SF Mono', monospace" }}
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

                {/* Divider */}
                <div className="flex items-center gap-3 mt-3 mb-2">
                  <div className="flex-1 h-px bg-black/10" />
                  <span
                    className="text-[10px] text-black/30 uppercase tracking-widest"
                    style={{ fontFamily: "'Departure Mono', 'SF Mono', monospace" }}
                  >
                    or
                  </span>
                  <div className="flex-1 h-px bg-black/10" />
                </div>

                {/* Footer */}
                <p
                  className="text-center text-[13px] text-black/50"
                  style={{ fontFamily: "'PT Serif', Georgia, serif" }}
                >
                  Already have an account?{' '}
                  <button
                    onClick={onSwitchToLogin}
                    className="text-[#1342FF] hover:text-[#0F35D9] font-semibold cursor-pointer transition-colors"
                  >
                    Sign In
                  </button>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Powered by TinyFish */}
        <a
          href="https://tinyfish.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 mt-5 opacity-30 hover:opacity-50 transition-opacity"
          style={{ textDecoration: 'none' }}
        >
          <span
            className="text-[9px] text-black/50 uppercase tracking-wider"
            style={{ fontFamily: "'Departure Mono', 'SF Mono', monospace" }}
          >
            Powered by
          </span>
          <img src="/images/tinyfish-logo.png" alt="TinyFish" className="h-3.5 w-auto" />
        </a>
      </div>
    </div>
  );
}
