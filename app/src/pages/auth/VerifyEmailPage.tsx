import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import toast from '@shared/hooks/useToast';
import { CheckCircle, XCircle, Loader2, Shield, Sparkles, Mail, RefreshCw } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    // Show loading state first - keep it until we get a response
    setStatus('loading');
    setMessage('Verifying your email address...');

    // Use a flag to prevent multiple calls
    let isMounted = true;

    authService
      .verifyEmail(token)
      .then((response) => {
        if (!isMounted) return;
        
        // Show success state immediately (no error state first)
        setStatus('success');
        const successMessage = response.message || 'Email verified successfully!';
        setMessage(successMessage);
        
        // Show success toast
        toast.success(successMessage, { duration: 4000 });

        // Redirect to login after showing success message
        setTimeout(() => {
          if (!isMounted) return;
          navigate('/login', { 
            state: { 
              emailVerified: true,
              message: successMessage.includes('already') 
                ? 'Your email is already verified! You can now login.' 
                : 'Email verified successfully! You can now login.' 
            } 
          });
        }, 3000);
      })
      .catch((error) => {
        if (!isMounted) return;
        
        // Only show error if it's a real error (not already verified)
        const errorMessage = error.response?.data?.message || 
                           error.message || 
                           'Invalid or expired verification token. Please request a new verification email.';
        
        // Check if error is about token already used - treat as success
        // This is a fallback in case backend still returns error for already verified
        if (errorMessage.toLowerCase().includes('already been used') || 
            errorMessage.toLowerCase().includes('already verified')) {
          setStatus('success');
          setMessage('Your email is already verified!');
          
          toast.success('Your email is already verified!', { duration: 4000 });

          setTimeout(() => {
            if (!isMounted) return;
            navigate('/login', { 
              state: { 
                emailVerified: true,
                message: 'Your email is already verified! You can now login.' 
              } 
            });
          }, 3000);
        } else {
          // Real error - show error state
          setStatus('error');
          setMessage(errorMessage);
          
          toast.error(errorMessage, { duration: 5000 });
        }
      });

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [token, navigate]);

  const handleResend = async () => {
    if (!resendEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    setResendLoading(true);
    try {
      await authService.resendVerification(resendEmail.trim());
      setResendSent(true);
      toast.success('Verification email sent! Check your inbox.');
    } catch {
      toast.error('Failed to resend verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -left-8 w-80 h-80 bg-[#5865f2]/25 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-[#5865f2]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10 items-center z-10">
        {/* Left: marketing / branding */}
        <div className="hidden lg:flex flex-col gap-8 text-white animate-fadeIn">
          <div className="inline-flex items-center gap-3 bg-[#2f3136]/80 border border-[#202225] rounded-full px-4 py-2 w-max">
            <Sparkles className="w-4 h-4 text-[#faa61a]" />
            <span className="text-xs font-medium text-[#b9bbbe]">
              Secure email verification for your account
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight">
              Verify your{' '}
              <span className="bg-gradient-to-r from-[#ffffff] to-[#a5b4fc] bg-clip-text text-transparent">
                Email Address
              </span>
            </h1>
            <p className="text-sm text-[#b9bbbe] max-w-md">
              We're confirming your email to ensure your account security and enable all features
              of your Mero Jugx workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-[#b9bbbe]">
            <div className="bg-[#2f3136]/70 border border-[#202225] rounded-xl p-4 space-y-2">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#5865f2]/20 text-[#5865f2]">
                <Shield className="w-4 h-4" />
              </div>
              <p className="font-semibold text-white text-sm">Account Security</p>
              <p className="text-xs text-[#8e9297]">
                Email verification helps protect your account from unauthorized access.
              </p>
            </div>
            <div className="bg-[#2f3136]/70 border border-[#202225] rounded-xl p-4 space-y-2">
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#23a55a]/15 text-[#23a55a]">
                <Mail className="w-4 h-4" />
              </div>
              <p className="font-semibold text-white text-sm">Quick Process</p>
              <p className="text-xs text-[#8e9297]">
                Verification is instant once you click the link from your email.
              </p>
            </div>
          </div>
        </div>

        {/* Right: verification card */}
        <div className="relative bg-[#2f3136]/95 backdrop-blur-md rounded-2xl shadow-2xl border border-[#202225] p-8 sm:p-10 space-y-6 animate-slideUp text-center">
          {status === 'loading' && (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 bg-blue-100 dark:bg-blue-900/30">
                  <Loader2 className="h-10 w-10 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Verifying Email</h2>
              <p className="text-[#b9bbbe] mb-6">{message}</p>
              <div className="w-full bg-[#202225] rounded-full h-2">
                <div className="bg-[#5865f2] h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 animate-scale-in"
                     style={{ background: `linear-gradient(135deg, #23a55a20 0%, #10b98120 100%)` }}>
                  <CheckCircle className="h-12 w-12 text-[#23a55a]" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Verification Successful!</h2>
              <p className="text-[#b9bbbe] mb-6">{message}</p>
              <div className="bg-[#23a55a]/10 border border-[#23a55a]/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-[#23a55a]">
                  ✅ Your email address has been verified successfully. You can now login to your account.
                </p>
              </div>
              <p className="text-sm text-[#8e9297] mb-4">Redirecting to login page...</p>
              <div className="w-full bg-[#202225] rounded-full h-2 mb-6">
                <div className="bg-[#23a55a] h-2 rounded-full animate-progress" style={{ width: '100%' }}></div>
              </div>
              <button
                onClick={() => navigate('/login', { 
                  state: { 
                    emailVerified: true,
                    message: 'Email verified successfully! You can now login.' 
                  } 
                })}
                className="w-full py-3 rounded-xl font-semibold transition-all bg-[#5865f2] hover:bg-[#4752c4] text-white"
              >
                Go to Login Now
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
                     style={{ background: `linear-gradient(135deg, #ed424520 0%, #dc262620 100%)` }}>
                  <XCircle className="h-12 w-12 text-[#ed4245]" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
              <p className="text-[#b9bbbe] mb-4">{message}</p>

              {/* Resend verification form */}
              {!resendSent ? (
                <div className="bg-[#2f3136] border border-[#4752c4]/40 rounded-xl p-4 mb-4 text-left">
                  <p className="text-sm text-[#b9bbbe] mb-3 font-medium">
                    <RefreshCw className="inline h-3.5 w-3.5 mr-1" />
                    Get a new verification link
                  </p>
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-3 py-2 rounded-lg bg-[#202225] border border-[#4e5058] text-white text-sm placeholder-[#6d6f78] mb-2 focus:outline-none focus:border-[#5865f2]"
                  />
                  <button
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="w-full py-2 rounded-lg text-sm font-semibold transition-all bg-[#5865f2] hover:bg-[#4752c4] text-white disabled:opacity-50"
                  >
                    {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </div>
              ) : (
                <div className="bg-[#23a55a]/10 border border-[#23a55a]/30 rounded-xl p-4 mb-4">
                  <p className="text-sm text-[#23a55a]">
                    ✅ Verification email sent! Check your inbox and spam folder.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3 rounded-xl font-semibold transition-all bg-[#393c43] hover:bg-[#404249] text-white"
                >
                  Go to Login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

