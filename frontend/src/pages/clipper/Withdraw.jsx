import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "../../components/Breadcrumbs";
import useToast from "../../hooks/useToast";
import { api } from "../../lib/api";

import {
    Wallet,
    Landmark,
    CircleDollarSign,
    Clock3,
    CreditCard,
    ArrowLeft
} from "lucide-react";

const PROFILE_PAYMENTS_TAB = "/clipper/profile?tab=payments";

export default function Withdraw() {
    const [amount, setAmount] = useState("");
    const [profile, setProfile] = useState(null);
    const [overview, setOverview] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { showToast } = useToast();

    const withdrawalAmount = Number(amount) || 0;
    const availableBalance = overview?.available_balance ?? 0;
    const pendingReview = overview?.pending_earnings ?? 0;
    const lifetimeWithdrawn = overview?.total_withdrawals ?? 0;
    const minimumWithdrawal = overview?.minimum_payout ?? 2500;

    const configuredPaymentMethod = profile?.payment_method;
    const paymentMethodLabel = configuredPaymentMethod === "upi"
        ? "UPI"
        : configuredPaymentMethod === "bank_transfer"
            ? "Bank Transfer"
            : null;
    const paymentMethodValue = profile?.payment_method === "upi"
        ? profile?.upi_id
        : profile?.payment_method === "bank_transfer"
            ? profile?.bank_name
                ? `${profile.bank_name} • ${profile.bank_account_number?.slice(-4) || ""}`
                : profile?.bank_account_number
            : null;

    const hasPaymentMethod = Boolean(configuredPaymentMethod && paymentMethodValue);
    const isValid =
        hasPaymentMethod &&
        withdrawalAmount >= minimumWithdrawal &&
        withdrawalAmount <= availableBalance;

    const quickSelect = (value) => {
        if (value === "all") {
            setAmount(String(Math.floor(availableBalance)));
            return;
        }

        setAmount(value.toString());
    };

    const receiveAmount = useMemo(() => withdrawalAmount, [withdrawalAmount]);

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                const [profileData, overviewData] = await Promise.all([
                    api('/api/auth/profile/me/'),
                    api('/api/earnings/overview/'),
                ]);

                if (!mounted) return;
                setProfile(profileData);
                setOverview(overviewData);
            } catch (error) {
                showToast({
                    type: 'error',
                    message: error?.message || 'Unable to load withdrawal details.',
                });
            } finally {
                if (!mounted) return;
                setLoadingProfile(false);
                setLoadingOverview(false);
            }
        };

        loadData();
        return () => {
            mounted = false;
        };
    }, [showToast]);

    const handleWithdrawRequest = async () => {
        if (!isValid) return;

        if (!configuredPaymentMethod) {
            showToast({ type: 'error', message: 'No payment method is configured for withdrawals.' });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                amount: withdrawalAmount,
                payoutMethod: configuredPaymentMethod,
            };

            if (configuredPaymentMethod === 'upi') {
                payload.upiId = profile?.upi_id;
            }

            if (configuredPaymentMethod === 'bank_transfer') {
                payload.bankAccountHolder = profile?.bank_account_holder;
                payload.bankAccountNumber = profile?.bank_account_number;
                payload.bankIfsc = profile?.bank_ifsc;
                payload.bankName = profile?.bank_name;
            }

            const response = await api('/api/earnings/payout/request-payout/', {
                method: 'POST',
                body: payload,
            });

            showToast({
                type: 'success',
                title: 'Withdrawal Requested',
                message: response?.message || `₹${withdrawalAmount.toLocaleString()} has been requested successfully.`,
            });
            setAmount('');

            const updatedOverview = await api('/api/earnings/overview/');
            setOverview(updatedOverview);
        } catch (error) {
            showToast({
                type: 'error',
                title: 'Request failed',
                message: error?.message || 'Unable to request a withdrawal at this time.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <Breadcrumbs />
           

            {/* Hero */}
            <section className="mt-6 flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
                    <Link
                    to="/clipper/earnings"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 font-medium transition hover:bg-white/5"
                >
                    <ArrowLeft size={18} />
                    Back to Earnings
                </Link>
                    </span>

                    <h1 className="mt-5 text-4xl font-bold">
                        Withdraw Funds
                    </h1>

                    <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
                        Transfer your available earnings to your registered
                        payment method.
                    </p>
                </div>

               
            </section>

            {/* Wallet Summary */}

            <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Wallet
                        className="mb-4 text-violet-400"
                        size={28}
                    />

                    <p className="text-sm text-zinc-500">
                        Available Balance
                    </p>

                    <h3 className="mt-2 text-3xl font-bold">
                        ₹{availableBalance.toLocaleString()}
                    </h3>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Clock3
                        className="mb-4 text-amber-400"
                        size={28}
                    />

                    <p className="text-sm text-zinc-500">
                        Pending Review
                    </p>

                    <h3 className="mt-2 text-3xl font-bold">
                        ₹{pendingReview.toLocaleString()}
                    </h3>

                    <p className="mt-2 text-xs text-zinc-500">
                        Awaiting admin approval
                    </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CircleDollarSign
                        className="mb-4 text-emerald-400"
                        size={28}
                    />

                    <p className="text-sm text-zinc-500">
                        Lifetime Withdrawn
                    </p>

                    <h3 className="mt-2 text-3xl font-bold">
                        ₹{lifetimeWithdrawn.toLocaleString()}
                    </h3>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Landmark
                        className="mb-4 text-sky-400"
                        size={28}
                    />

                    <p className="text-sm text-zinc-500">
                        Minimum Withdrawal
                    </p>

                    <h3 className="mt-2 text-3xl font-bold">
                        ₹{minimumWithdrawal}
                    </h3>
                </div>
            </section>
            {/* Main Content */}
            
            <section className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                {/* Withdraw Form */}

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                    <h2 className="text-2xl font-semibold">
                        Withdraw Funds
                    </h2>

                    <p className="mt-2 text-sm text-zinc-400">
                        Enter the amount you'd like to withdraw from your
                        available balance.
                    </p>

                    {/* Last Wallet Credit */}

                   

                    {/* Amount */}

                    <div className="mt-8">
                        <label className="mb-3 block text-sm font-medium">
                            Withdrawal Amount
                        </label>

                        <input
                            type="number"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-5 py-4 text-2xl outline-none transition focus:border-violet-500"
                        />

                        <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
                            <span>
                                Available: ₹
                                {availableBalance.toLocaleString()}
                            </span>

                            <span>
                                Minimum: ₹
                                {minimumWithdrawal.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Quick Amount */}

                    <div className="mt-6 flex flex-wrap gap-3">
                        {[500, 1000, 5000].map((value) => (
                            <button
                                key={value}
                                onClick={() => quickSelect(value)}
                                className="rounded-xl border border-white/10 px-5 py-2 transition hover:bg-white/5"
                            >
                                ₹{value.toLocaleString()}
                            </button>
                        ))}

                        <button
                            onClick={() => quickSelect("all")}
                            className="rounded-xl bg-violet-600 px-5 py-2 font-medium transition hover:bg-violet-500"
                        >
                            Withdraw All
                        </button>
                    </div>

                    {/* Validation */}

                    {!hasPaymentMethod && (
                        <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
                            You don't have a payment method yet.{" "}
                            <Link to={PROFILE_PAYMENTS_TAB} className="font-medium underline underline-offset-2">
                                Add one from your profile
                            </Link>{" "}
                            before requesting a withdrawal.
                        </div>
                    )}

                    {amount && hasPaymentMethod && !isValid && (
                        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                            Withdrawal amount must be between ₹
                            {minimumWithdrawal.toLocaleString()} and ₹
                            {availableBalance.toLocaleString()}.
                        </div>
                    )}

                    {/* Button */}

                    <button
                        disabled={!isValid || submitting}
                        onClick={handleWithdrawRequest}
                        className={`mt-8 w-full rounded-xl py-4 text-lg font-semibold transition ${isValid && !submitting
                                ? "bg-violet-600 hover:bg-violet-500"
                                : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                            }`}
                    >
                        {submitting ? 'Requesting...' : 'Request Withdrawal'}
                    </button>
                </div>

                {/* Sidebar */}

                <div className="space-y-6">
                    {/* Payment Method */}

                    {hasPaymentMethod ? (
                        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">
                                    Payment Method
                                </h3>

                                <Link
                                    to={PROFILE_PAYMENTS_TAB}
                                    className="text-sm text-violet-400 transition hover:text-violet-300"
                                >
                                    Change
                                </Link>
                            </div>

                            <div className="mt-6 flex items-center gap-4">
                                <div className="rounded-xl bg-violet-500/10 p-3">
                                    <CreditCard className="text-violet-400" size={24} />
                                </div>

                                <div>
                                    <p className="font-medium">
                                        {paymentMethodLabel || 'No payment method'}
                                    </p>

                                    <p className="mt-1 text-sm text-zinc-500">
                                        {paymentMethodValue || 'Add a payment method on your profile'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6">
                            <h3 className="text-lg font-semibold">
                                Payment Method
                            </h3>

                            <p className="mt-3 text-sm leading-6 text-zinc-400">
                                No payment method added yet. Add one from your
                                profile to receive withdrawals.
                            </p>

                            <Link
                                to={PROFILE_PAYMENTS_TAB}
                                className="mt-6 flex w-full items-center justify-center rounded-xl bg-violet-600 px-5 py-3 font-medium transition hover:bg-violet-500"
                            >
                                + Add Payment Method
                            </Link>
                        </div>
                    )}

                    {/* Summary */}

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                        <h3 className="text-lg font-semibold">
                            Withdrawal Summary
                        </h3>

                        <div className="mt-6 space-y-4">
                            <div className="flex justify-between text-zinc-400">
                                <span>Withdrawal Amount</span>

                                <span>
                                    ₹{withdrawalAmount.toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between text-zinc-400">
                                <span>Processing Fee</span>

                                <span>₹0</span>
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <div className="flex justify-between text-lg font-semibold">
                                    <span>You'll Receive</span>

                                    <span className="text-emerald-400">
                                        ₹{receiveAmount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Things To Know */}

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                        <h3 className="text-lg font-semibold">
                            Things to Know
                        </h3>

                        <ul className="mt-5 space-y-4 text-sm leading-6 text-zinc-400">
                            <li>
                                • Minimum withdrawal amount is ₹
                                {minimumWithdrawal}.
                            </li>

                            <li>
                                • Requests are processed within 1–3 business
                                days.
                            </li>

                            <li>
                                • Withdrawals are sent to your verified payment
                                method.
                            </li>

                            <li>
                                • You'll receive a notification once the payout
                                has been completed.
                            </li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}