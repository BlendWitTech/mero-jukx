import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Wallet } from 'lucide-react';

interface KhaltiPaymentProps {
    amount: number;
    purchaseId: string;
    purchaseName: string;
    onSuccess: (data: any) => void;
    onError: (error: any) => void;
}

export default function KhaltiPayment({ amount, purchaseId, purchaseName, onSuccess, onError }: KhaltiPaymentProps) {
    const { theme } = useTheme();

    const handlePayment = () => {
        // In a real implementation, this would trigger the Khalti SDK
        // For demonstration/setup, we'll simulate the flow or provide instructions
        console.log(`Initiating Khalti payment for Rs. ${amount}`);

        const config = {
            publicKey: "test_public_key_xxxxxxxxxxxxxxxx",
            productIdentity: purchaseId,
            productName: purchaseName,
            productUrl: window.location.href,
            amount: amount * 100, // Khalti expects paisa
            eventHandler: {
                onSuccess(payload: any) {
                    console.log("Khalti Success:", payload);
                    onSuccess(payload);
                },
                onError(error: any) {
                    console.log("Khalti Error:", error);
                    onError(error);
                },
                onClose() {
                    console.log("Khalti Widget Closed");
                }
            }
        };

        // Note: Khalti Checkout script needs to be included in index.html or loaded dynamically
        // @ts-ignore
        if (window.KhaltiCheckout) {
            // @ts-ignore
            const checkout = new window.KhaltiCheckout(config);
            checkout.show({ amount: amount * 100 });
        } else {
            console.warn("Khalti SDK not loaded. Simulating success...");
            // Simulate success for dev/preview
            setTimeout(() => onSuccess({ token: 'test_token', amount: amount * 100 }), 1000);
        }
    };

    return (
        <button
            onClick={handlePayment}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 bg-[#5C2D91] hover:bg-[#4a2475]"
        >
            <img src="https://khalti.com/static/img/logo1.png" alt="Khalti" className="h-6 invert brightness-0" />
            Pay with Khalti
        </button>
    );
}
