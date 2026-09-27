from rest_framework import serializers
from decimal import Decimal
from .models import Transaction
from .payments import MAX_TOPUP_AMOUNT, MIN_TOPUP_AMOUNT


class WalletTopUpCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=MIN_TOPUP_AMOUNT)

    def validate_amount(self, value):
        if value < MIN_TOPUP_AMOUNT:
            raise serializers.ValidationError(f'Minimum top-up is ₹{MIN_TOPUP_AMOUNT}.')
        if value > MAX_TOPUP_AMOUNT:
            raise serializers.ValidationError(f'Maximum top-up is ₹{MAX_TOPUP_AMOUNT}.')
        return value


class WalletTopUpConfirmSerializer(serializers.Serializer):
    razorpayOrderId = serializers.CharField(max_length=100, source='order_id')
    razorpayPaymentId = serializers.CharField(max_length=100, source='payment_id')
    razorpaySignature = serializers.CharField(max_length=255, source='signature')


class WalletTopUpFailSerializer(serializers.Serializer):
    razorpayOrderId = serializers.CharField(max_length=100, source='order_id')
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)


# Serializer for handling the withdrawal request body
class PayoutSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('2500.00'))
    payoutMethod = serializers.ChoiceField(choices=['upi', 'bank_transfer', 'paypal'], source='payout_method')
    upiId = serializers.CharField(max_length=100, required=False, allow_blank=True, source='upi_id')
    bankAccountHolder = serializers.CharField(max_length=150, required=False, allow_blank=True, source='bank_account_holder')
    bankAccountNumber = serializers.CharField(max_length=50, required=False, allow_blank=True, source='bank_account_number')
    bankIfsc = serializers.CharField(max_length=20, required=False, allow_blank=True, source='bank_ifsc')
    bankName = serializers.CharField(max_length=150, required=False, allow_blank=True, source='bank_name')

    def validate_amount(self, value):
        if value < Decimal('2500.00'):
            raise serializers.ValidationError("Minimum withdrawal is ₹2500.")
        return value

    def validate(self, attrs):
        payout_method = attrs.get('payout_method')
        if payout_method == 'upi' and not attrs.get('upi_id'):
            raise serializers.ValidationError({'upiId': 'UPI ID is required for UPI payouts.'})

        if payout_method == 'bank_transfer':
            missing_fields = []
            if not attrs.get('bank_account_holder'):
                missing_fields.append('bankAccountHolder')
            if not attrs.get('bank_account_number'):
                missing_fields.append('bankAccountNumber')
            if not attrs.get('bank_ifsc'):
                missing_fields.append('bankIfsc')
            if not attrs.get('bank_name'):
                missing_fields.append('bankName')

            if missing_fields:
                raise serializers.ValidationError(
                    {field: 'This field is required for bank transfer payouts.' for field in missing_fields}
                )

        return attrs

# Serializer for listing past withdrawal history
class TransactionSerializer(serializers.ModelSerializer):
    transactionType = serializers.CharField(source='get_transaction_type_display', read_only=True)
    paymentMethod = serializers.CharField(source='get_payment_method_display', read_only=True)
    paymentDetails = serializers.CharField(source='payment_details', read_only=True)
    contentTitle = serializers.SerializerMethodField()
    submissionId = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id',
            'amount',
            'transactionType',
            'paymentMethod',
            'paymentDetails',
            'status',
            'external_ref',
            'contentTitle',
            'submissionId',
            'createdAt',
        ]
    def get_contentTitle(self, obj):
        return obj.content.title if obj.content else None

    def get_submissionId(self, obj):
        return obj.submission.id if obj.submission else None
