import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface EsewaPaymentProps {
    amount: number;
    productId: string;
    taxAmount?: number;
    serviceCharge?: number;
    deliveryCharge?: number;
    onSuccess: () => void;
}

export default function EsewaPayment({ amount, productId, taxAmount = 0, serviceCharge = 0, deliveryCharge = 0, onSuccess }: EsewaPaymentProps) {
    const totalAmount = amount + taxAmount + serviceCharge + deliveryCharge;

    const handlePayment = () => {
        // eSewa usually requires a form submission to their endpoint
        // For development, we simulate the redirect or provide a UI mockup
        console.log(`Initiating eSewa payment for Rs. ${totalAmount}`);

        const path = "https://uat.esewa.com.np/epay/main";
        const params = {
            amt: amount,
            psc: serviceCharge,
            pdc: deliveryCharge,
            txAmt: taxAmount,
            tAmt: totalAmount,
            pid: productId,
            scd: "EPAYTEST", // Merchant code
            su: window.location.origin + "/payment-success",
            fu: window.location.origin + "/payment-failure"
        };

        // Create a hidden form and submit it
        const form = document.createElement("form");
        form.setAttribute("method", "POST");
        form.setAttribute("action", path);

        for (const key in params) {
            const hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key as keyof typeof params].toString());
            form.appendChild(hiddenField);
        }

        document.body.appendChild(form);
        console.warn("eSewa Redirect - Simulating success for now.");
        // form.submit();

        // Simulate success for dev/preview
        setTimeout(() => onSuccess(), 1000);
    };

    return (
        <button
            onClick={handlePayment}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 bg-[#60bb46] hover:bg-[#4d9638]"
        >
            <img src="https://esewa.com.np/common/images/esewa_logo.png" alt="eSewa" className="h-6 brightness-0 invert" />
            Pay with eSewa
        </button>
    );
}
