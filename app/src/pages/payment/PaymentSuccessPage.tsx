import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { CheckCircle, Loader2 } from 'lucide-react';
import toast from '@shared/hooks/useToast';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const hasVerifiedRef = useRef(false); // Track if verification has been attempted

  // Get all URL parameters for debugging (memoized to prevent re-renders)
  const allParams = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);

  // eSewa v2 API returns data in a base64-encoded JSON string in the 'data' parameter
  // Decode and parse it if present (memoized to prevent re-renders)
  const esewaData = useMemo(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        // Decode base64 and parse JSON
        const decodedData = atob(dataParam);
        return JSON.parse(decodedData);
      } catch (error) {
        console.error('Failed to decode eSewa data parameter:', error);
        return null;
      }
    }
    return null;
  }, [searchParams]);

  // Support both v2 API format (ref_id, transaction_uuid) and legacy format (refId, pid)
  // Also check for various eSewa parameter formats
  // Priority: decoded data > direct query params
  // Note: eSewa v2 API may return transaction_code instead of ref_id
  // Memoize these values to prevent unnecessary re-renders
  const refId = useMemo(() =>
    esewaData?.ref_id ||
    esewaData?.transaction_code || // Use transaction_code as ref_id if ref_id is not present
    searchParams.get('ref_id') ||
    searchParams.get('refId') ||
    searchParams.get('refid') ||
    searchParams.get('rid'),
    [esewaData, searchParams]
  );

  const sessionId = useMemo(() =>
    searchParams.get('session_id') ||
    searchParams.get('sessionId') ||
    searchParams.get('session-id'),
    [searchParams]
  );

  const transactionId = useMemo(() =>
    esewaData?.transaction_uuid ||
    esewaData?.transaction_code ||
    searchParams.get('transaction_uuid') ||
    searchParams.get('transactionUuid') ||
    searchParams.get('pid') ||
    searchParams.get('transactionId') ||
    searchParams.get('transaction_id') ||
    searchParams.get('oid'),
    [esewaData, searchParams]
  );

  // Check for eSewa token-related parameters
  const userToken = useMemo(() =>
    searchParams.get('user_token') || searchParams.get('userToken'),
    [searchParams]
  );

  const tokenMessage = useMemo(() =>
    searchParams.get('set_token_message') || searchParams.get('setTokenMessage'),
    [searchParams]
  );

  // Get return path from localStorage
  const returnPath = useMemo(() => localStorage.getItem('payment_return_path') || '/packages', []);

  const verifyPaymentMutation = useMutation({
    mutationFn: async (data: { transactionId: string; refId?: string; sessionId?: string }) => {
      const response = await api.post('/payments/verify', data);
      return response.data;
    },
    onSuccess: async (data) => {
      setVerifying(false);
      if (data.success) {
        setVerified(true);

        // Check if there was a post-payment error first
        if (data.post_payment_error) {
          toast.error(`Payment verified but activation failed: ${data.post_payment_error}`, { duration: 6000 });
        } else {
          // Show success message only once
          toast.success('Payment verified successfully! Your subscription/upgrade will be active shortly.');
        }

        // Aggressively invalidate package and app related queries across the entire application
        console.log('Invalidating all related queries...');

        // Invalidate all queries that contain 'package' or 'app' in their key
        await Promise.all([
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey;
              return Array.isArray(key) && (
                key.some(k => typeof k === 'string' && k.toLowerCase().includes('package')) ||
                key.some(k => typeof k === 'string' && k.toLowerCase().includes('current-package')) ||
                key.some(k => typeof k === 'string' && k.toLowerCase().includes('app'))
              );
            }
          }),
          // Also invalidate organization queries as they might contain package or app info
          queryClient.invalidateQueries({ queryKey: ['organizations'], exact: false }),
          queryClient.invalidateQueries({ queryKey: ['organization'], exact: false }),
          queryClient.invalidateQueries({ queryKey: ['organization-apps'], exact: false }),
          queryClient.invalidateQueries({ queryKey: ['apps'], exact: false }),
          queryClient.invalidateQueries({ queryKey: ['app-access'], exact: false }),
        ]);

        // Clear return path after successful verification use
        localStorage.removeItem('payment_return_path');

        // Wait for backend to complete the upgrade/activation
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Refetch related queries
        console.log('Refetching all related queries...');
        await Promise.all([
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey;
              return Array.isArray(key) && (
                key.some(k => typeof k === 'string' && (
                  k.toLowerCase().includes('package') ||
                  k.toLowerCase().includes('app')
                ))
              );
            }
          }),
        ]);

        // Wait a bit more and refetch again to ensure we have the latest data
        await new Promise(resolve => setTimeout(resolve, 500));
        await queryClient.refetchQueries({ queryKey: ['current-package'], exact: false });
        await queryClient.refetchQueries({ queryKey: ['organization-apps'], exact: false });

        // Dispatch a custom event to notify all components about package update
        window.dispatchEvent(new CustomEvent('package-updated', {
          detail: { packageId: data.payment?.package_id }
        }));

        setTimeout(() => {
          // Navigate to the return path
          navigate(returnPath, { replace: true });
          // Trigger another comprehensive refetch after navigation
          setTimeout(() => {
            queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey;
                return Array.isArray(key) && (
                  key.some(k => typeof k === 'string' && k.toLowerCase().includes('package')) ||
                  key.some(k => typeof k === 'string' && k.toLowerCase().includes('app'))
                );
              }
            });
            queryClient.refetchQueries({ queryKey: ['current-package'], exact: false });
            queryClient.refetchQueries({ queryKey: ['organization-apps'], exact: false });
          }, 500);
        }, 1500);
      } else {
        toast.error(data.message || 'Payment verification failed');
        setTimeout(() => {
          navigate(returnPath);
        }, 3000);
      }
    },
    onError: (error: any) => {
      setVerifying(false);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Payment verification failed';
      console.error('Payment verification error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(errorMessage, { duration: 5000 });
      setTimeout(() => {
        navigate(returnPath);
      }, 4000);
    },
  });

  useEffect(() => {
    // Prevent multiple verification attempts
    if (hasVerifiedRef.current) {
      return;
    }

    console.log('Payment verification check:', {
      refId,
      sessionId,
      transactionId,
      userToken,
      tokenMessage,
      esewaData,
      allParams,
    });

    // Check for eSewa token authentication error first
    if (userToken || tokenMessage) {
      hasVerifiedRef.current = true;
      // eSewa token authentication required
      setVerifying(false);
      toast.error(
        'eSewa requires token authentication. Please enable Mock Mode in .env (ESEWA_USE_MOCK_MODE=true) for development testing.',
        { duration: 6000, id: 'esewa-token-error' } as any
      );
      const timeoutId = setTimeout(() => {
        navigate(returnPath);
      }, 4000);
      return () => clearTimeout(timeoutId);
    }

    // For Stripe: use session_id
    if (sessionId) {
      hasVerifiedRef.current = true;
      console.log('Verifying Stripe payment with sessionId:', sessionId);
      // Stripe payment - transactionId will be retrieved from session on backend
      verifyPaymentMutation.mutate({
        transactionId: transactionId || '', // Use transactionId if available, otherwise empty
        sessionId,
      });
      return;
    }

    // For eSewa: check if we have decoded data or individual parameters
    // eSewa v2 API may return status in the decoded data
    if (esewaData) {
      // Check if payment was successful based on status in decoded data
      const status = esewaData.status || esewaData.payment_status;
      if (status === 'COMPLETE' || status === 'SUCCESS' || status === 'success') {
        // We have eSewa data, extract transaction info
        // eSewa v2 API may return transaction_code instead of ref_id
        const esewaRefId = esewaData.ref_id || esewaData.reference_id || esewaData.transaction_code;
        const esewaTransactionId = esewaData.transaction_uuid || esewaData.transaction_code || esewaData.oid;

        if (esewaTransactionId) {
          hasVerifiedRef.current = true;
          console.log('Verifying eSewa payment from decoded data:', {
            transactionId: esewaTransactionId,
            refId: esewaRefId,
            status,
            esewaData
          });
          verifyPaymentMutation.mutate({
            transactionId: esewaTransactionId || '',
            refId: esewaRefId || undefined, // Allow undefined refId for eSewa v2 API
          });
          return;
        }
      } else if (status === 'FAILURE' || status === 'FAILED' || status === 'failed') {
        // Payment failed according to eSewa
        hasVerifiedRef.current = true;
        setVerifying(false);
        toast.error('Payment was not successful according to eSewa. Please try again.');
        const timeoutId = setTimeout(() => {
          navigate('/packages');
        }, 3000);
        return () => clearTimeout(timeoutId);
      }
    }

    // For eSewa: need refId and transactionId (from direct query params)
    if (refId && transactionId) {
      hasVerifiedRef.current = true;
      console.log('Verifying eSewa payment:', { transactionId, refId });
      verifyPaymentMutation.mutate({
        transactionId,
        refId,
      });
      return;
    }

    // If we have transactionId but no refId, try to verify anyway (might work for some cases)
    if (transactionId && !refId) {
      hasVerifiedRef.current = true;
      console.log('Attempting verification with transactionId only:', transactionId);
      verifyPaymentMutation.mutate({
        transactionId,
        refId: '', // Empty refId - backend will try to find payment
      });
      return;
    }

    // No valid parameters found
    hasVerifiedRef.current = true;
    console.error('Missing payment information. Available parameters:', allParams);
    setVerifying(false);
    toast.error(
      `Missing payment information. Please check your payment status or contact support. Parameters: ${JSON.stringify(allParams)}`,
      { duration: 5000, id: 'missing-payment-info' } as any
    );
    const timeoutId = setTimeout(() => {
      navigate('/packages');
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [refId, transactionId, sessionId, userToken, tokenMessage, esewaData, allParams, navigate]);

  return (
    <div className="min-h-screen bg-[#36393f] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-[#2f3136] rounded-lg shadow-xl border border-[#202225] p-8 text-center">
        {verifying ? (
          <>
            <Loader2 className="h-16 w-16 text-[#5865f2] mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Verifying Payment...
            </h2>
            <p className="text-[#b9bbbe]">
              Please wait while we verify your payment with eSewa.
            </p>
          </>
        ) : verified ? (
          <>
            <CheckCircle className="h-16 w-16 text-[#23a55a] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Payment Successful!
            </h2>
            <p className="text-[#b9bbbe] mb-4">
              Your payment has been verified and processed successfully.
            </p>
            <p className="text-sm text-[#8e9297]">
              Redirecting to packages page...
            </p>
          </>
        ) : (
          <>
            <div className="h-16 w-16 bg-[#ed4245]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-[#ed4245]">✕</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Payment Verification Failed
            </h2>
            <p className="text-[#b9bbbe] mb-4">
              We couldn't verify your payment. Please contact support if you believe this is an error.
            </p>
            <p className="text-sm text-[#8e9297]">
              Redirecting to packages page...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

