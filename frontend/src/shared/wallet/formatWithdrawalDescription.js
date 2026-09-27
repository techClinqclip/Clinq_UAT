/**
 * User-facing withdrawal label for transaction tables.
 * Shows destination only (UPI / masked bank) — never UTR, payout IDs, or gateway refs.
 */

function stripInternalRefs(value) {
    return String(value || "")
        .replace(/\s*[·|]\s*UTR\s+[A-Za-z0-9_-]+/gi, "")
        .replace(/\bUTR\s+[A-Za-z0-9_-]+/gi, "")
        .replace(/\bpout_[A-Za-z0-9]+/gi, "")
        .replace(/\s*[·|]\s*$/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

export function formatWithdrawalDescription(transaction, { fallbackLabel = "Withdrawal request" } = {}) {
    const methodRaw = (
        transaction.paymentMethod
        || transaction.payment_method
        || ""
    ).toString().toLowerCase();

    // Never use external_ref — after payout it is often a UTR / gateway id.
    const details = stripInternalRefs(
        transaction.paymentDetails
        || transaction.payment_details
        || ""
    );

    const isUpi =
        methodRaw.includes("upi")
        || (details.includes("@") && !details.includes("|"));
    const isBank =
        methodRaw.includes("bank")
        || details.includes("|");

    if (isUpi) {
        const upiId = details.includes("|")
            ? stripInternalRefs(details.split("|").pop())
            : details;
        return upiId
            ? `Withdrawal via UPI · ${upiId}`
            : "Withdrawal via UPI";
    }

    if (isBank) {
        const parts = details.split("|").map((part) => stripInternalRefs(part)).filter(Boolean);
        // Stored as: "Holder | Bank Name | Account Number"
        if (parts.length >= 3) {
            const bankName = parts[1];
            const accountNumber = parts[2];
            const last4 = accountNumber.slice(-4);
            return `Withdrawal via Bank Transfer · ${bankName} •••• ${last4}`;
        }
        if (parts.length === 2) {
            return `Withdrawal via Bank Transfer · ${parts[0]} · ${parts[1]}`;
        }
        return details
            ? `Withdrawal via Bank Transfer · ${details}`
            : "Withdrawal via Bank Transfer";
    }

    if (methodRaw.includes("paypal")) {
        return details ? `Withdrawal via PayPal · ${details}` : "Withdrawal via PayPal";
    }

    return details ? `Withdrawal · ${details}` : fallbackLabel;
}
