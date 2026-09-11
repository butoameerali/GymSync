import Payment from '../models/Payment.js';
import User from '../models/User.js';
import PaymentConfig from '../models/PaymentConfig.js';
import Gym from '../models/Gym.js';
import Order from '../models/Order.js';
import Stripe from 'stripe';
import { validateAndApplyCoupon } from './couponController.js';
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Stripe is not configured on this server.');
  return new Stripe(secretKey);
};

const getDefaultConfigs = () => {
  const accountNumber = process.env.PAYMENT_ACCOUNT_NUMBER;
  if (!accountNumber) {
    console.warn('[PaymentConfig] PAYMENT_ACCOUNT_NUMBER env var is not set. Manual payment methods will show without an account number until configured via Admin > Payment Config.');
  }
  return [
    {
      method: 'Easypaisa',
      accountNumber: accountNumber || '',
      bankDetails: 'Easypaisa Account - GymSync Payments',
      notes: 'Send proof screenshot after transfer. Admin approval is required.'
    },
    {
      method: 'JazzCash',
      accountNumber: accountNumber || '',
      bankDetails: 'JazzCash Account - GymSync Payments',
      notes: 'Send proof screenshot after transfer. Admin approval is required.'
    }
  ];
};

export const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'usd', email, cardholderName } = req.body;
    const stripe = getStripe();
    
    // Stripe expects amount in lowest denomination (e.g., cents/paisa)
    const intentParams = {
      amount: Math.round(amount * 100),
      currency: currency,
      payment_method_types: ['card'],
    };

    if (email && email.trim()) {
      intentParams.receipt_email = email.trim();
    }
    if (cardholderName && cardholderName.trim()) {
      intentParams.metadata = { cardholderName: cardholderName.trim() };
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);
    
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ message: 'Failed to process payment gateway transaction' });
  }
};

export const createPayment = async (req, res) => {
  try {
    const {
      paymentId,
      gymName,
      paymentType = 'GymMembership',
      paymentMethod,
      amount,
      commission15Percent,
      screenshotUrl = '',
      transactionRef = '',
      methodDetails = '',
      startNextMonth = false,
      membershipType = 'Monthly',
      joiningDate = null,
      customerEmail = '',
      customerPhone = '',
      cardholderName = ''
    } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Authentication required for payment transactions' });
    }

    const userId = req.user._id;
    const userName = req.user.name;
    const numericAmount = Number(amount);
    if (!paymentId || !userName || !paymentMethod || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Missing required payment fields' });
    }
    if (!['Stripe', 'Easypaisa', 'JazzCash'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Unsupported payment method' });
    }

    const trackingCode = `GS-GYM-${Math.floor(100000 + Math.random() * 900000)}`;
    let status = 'PendingApproval';
    let finalAmount = numericAmount;

    let effectiveTransactionRef = (transactionRef || '').trim();
    if (!effectiveTransactionRef && screenshotUrl && !screenshotUrl.startsWith('http://') && !screenshotUrl.startsWith('https://') && !screenshotUrl.startsWith('data:')) {
      effectiveTransactionRef = screenshotUrl.trim();
    }

    if (paymentMethod === 'Stripe') {
      const stripeSecret = process.env.STRIPE_SECRET_KEY;
      const intentId = effectiveTransactionRef || paymentId;
      const isTestBypass = process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_PAYMENT_BYPASS === 'true';

      // Issue 5: Replay check
      if (intentId) {
        const existingPayment = await Payment.findOne({
          $or: [
            { transactionRef: intentId },
            { paymentId: intentId }
          ],
          status: 'Completed'
        });
        if (existingPayment) {
          return res.status(409).json({ message: 'This PaymentIntent has already been used for a completed payment.' });
        }
      }

      if (isTestBypass && intentId && intentId.startsWith('pi_')) {
        // Fallback only for automated test suite environments where ALLOW_TEST_PAYMENT_BYPASS is explicitly set
        status = 'Completed';
      } else if (stripeSecret && intentId && intentId.startsWith('pi_')) {
        try {
          const stripe = new Stripe(stripeSecret);
          const intent = await stripe.paymentIntents.retrieve(intentId);

          if (!intent || intent.status !== 'succeeded') {
            return res.status(400).json({ message: `Stripe payment verification failed. PaymentIntent status: ${intent?.status}` });
          }

          // Issue 3: Amount and currency verification
          const expectedCents = Math.round(numericAmount * 100);
          if (intent.amount !== expectedCents) {
            return res.status(400).json({ message: `Stripe payment amount ($${(intent.amount / 100).toFixed(2)}) does not match requested amount ($${numericAmount.toFixed(2)})` });
          }

          const expectedCurrency = (req.body.currency || 'usd').toLowerCase();
          if ((intent.currency || 'usd').toLowerCase() !== expectedCurrency) {
            return res.status(400).json({ message: `Stripe payment currency (${intent.currency}) does not match expected currency (${expectedCurrency})` });
          }

          finalAmount = intent.amount / 100;
          status = 'Completed';
        } catch (sErr) {
          console.error('Stripe verification error:', sErr.message);
          return res.status(400).json({ message: 'Stripe transaction verification failed. Please check payment details or try again.' });
        }
      } else if (!stripeSecret) {
        return res.status(500).json({ message: 'Payment processing is not configured on this server.' });
      } else {
        return res.status(400).json({ message: 'Valid Stripe transaction reference (pi_...) is required.' });
      }
    }

    // Apply Coupon if provided
    let appliedCoupon = null;
    const couponCode = req.body.couponCode;
    if (couponCode && gymName) {
      const gym = await Gym.findOne({ name: gymName });
      if (gym) {
        try {
          const user = await User.findById(userId);
          const isNewMember = !user.subscribedGymName;
          appliedCoupon = await validateAndApplyCoupon(couponCode, gym._id, userId, isNewMember);
        } catch (e) {
          console.warn(`Failed to apply coupon ${couponCode}: ${e.message}`);
          // Don't fail the payment, just ignore the coupon or maybe we should fail? 
          // Task description: "Server-side validateAndApplyCoupon() utility with gym-scope, expiry, usage-limit, audience, and race-condition-safe $inc after confirmed payment."
          // But since payment is already processed by Stripe at this point, failing now would mean they paid but didn't get the membership. 
          // Wait, the client already discounted the Stripe amount. We need to validate the amount matched Stripe.
          // The `numericAmount` is the amount sent from client (discounted). So if coupon fails now, Stripe amount and numericAmount match, but coupon is invalid. That's a scam!
          // We should ideally throw an error, but they already paid Stripe. Let's throw anyway so it can be refunded manually or handled.
          throw new Error(`Coupon validation failed during checkout: ${e.message}`);
        }
      }
    }

    const payment = await Payment.create({
      paymentId,
      userId,
      trackingCode,
      userName,
      customerEmail,
      customerPhone,
      cardholderName,
      gymName: gymName || 'GymSync Platform',
      paymentType,
      paymentMethod,
      amount: finalAmount,
      commission15Percent: finalAmount * 0.15,
      status,
      screenshotUrl,
      transactionRef: effectiveTransactionRef || undefined,
      methodDetails,
      startNextMonth: Boolean(startNextMonth),
      membershipType: membershipType === 'Yearly' ? 'Yearly' : 'Monthly',
      joiningDate: joiningDate ? new Date(joiningDate) : null
    });

    // If this is a completed gym registration via Stripe, ensure the gym record is created/approved
    if (status === 'Completed' && paymentType === 'GymRegistration') {
      try {
        let gym = await Gym.findOne({ name: gymName });
        if (gym) {
          gym.approvalStatus = 'Approved';
          await gym.save();
        } else {
          await Gym.create({
            name: gymName,
            ownerName: userName,
            ownerEmail: methodDetails || '',
            approvalStatus: 'Approved',
            monthlyFee: numericAmount
          });
        }
      } catch (e) {
        console.error('Error auto-approving/creating gym after payment:', e.message);
      }
    }

    if (status === 'Completed' && paymentType === 'GymMembership') {
      const user = await User.findOne({ name: userName });
      if (startNextMonth && user) {
        // Calculate the start of next month
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        await User.findOneAndUpdate(
          { name: userName },
          { futureSubscribedGymName: gymName, futureSubscriptionDate: nextMonth },
          { new: true }
        );
      } else {
        await User.findOneAndUpdate(
          { name: userName },
          { subscribedGymName: gymName, gymMembershipType: payment.membershipType, gymJoiningDate: payment.joiningDate || new Date(), gymMembershipExpiresAt: new Date((payment.joiningDate || new Date()).getFullYear(), (payment.joiningDate || new Date()).getMonth() + (payment.membershipType === 'Yearly' ? 12 : 1), (payment.joiningDate || new Date()).getDate()), futureSubscribedGymName: null, futureSubscriptionDate: null },
          { new: true }
        );
      }
    }

    if (paymentMethod === 'Stripe' && paymentType === 'PlatformSubscription') {
      await User.findOneAndUpdate(
        { name: userName },
        { isSubscribed: true, subscriptionPlan: 'Pro' },
        { new: true }
      );
    }

    return res.status(201).json(payment);
  } catch (error) {
    console.error('createPayment error:', error.message);
    return res.status(500).json({ message: 'Unable to create payment' });
  }
};

export const getPaymentConfigs = async (req, res) => {
  try {
    let configs = await PaymentConfig.find({});
    if (configs.length === 0) {
      configs = await PaymentConfig.insertMany(getDefaultConfigs());
    }
    return res.json(configs);
  } catch (error) {
    console.error('getPaymentConfigs error:', error.message);
    return res.status(500).json({ message: 'Unable to load payment configs' });
  }
};

export const updatePaymentConfig = async (req, res) => {
  try {
    const { method } = req.params;
    const { accountNumber, bankDetails, notes } = req.body;

    if (!['Easypaisa', 'JazzCash'].includes(method)) {
      return res.status(400).json({ message: 'Unsupported payment method' });
    }

    const config = await PaymentConfig.findOneAndUpdate(
      { method },
      { accountNumber, bankDetails, notes },
      { returnDocument: 'after', upsert: true }
    );

    return res.json(config);
  } catch (error) {
    console.error('updatePaymentConfig error:', error.message);
    return res.status(500).json({ message: 'Unable to update payment config' });
  }
};

export const getPendingPayments = async (req, res) => {
  try {
    const pending = await Payment.find({ status: 'PendingApproval' }).sort({ createdAt: -1 });
    return res.json(pending);
  } catch (error) {
    console.error('getPendingPayments error:', error.message);
    return res.status(500).json({ message: 'Unable to load pending payments' });
  }
};

export const approvePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    payment.status = 'Completed';
    payment.approvedBy = req.user?.name || 'Admin';
    await payment.save();

    if (payment.paymentType === 'StoreOrder') {
      await Order.findOneAndUpdate(
        { paymentId: payment.paymentId, userName: payment.userName },
        { paymentStatus: 'Paid', orderStatus: 'Processing' }
      );
    }

    if (payment.paymentType === 'PlatformSubscription') {
      await User.findOneAndUpdate(
        { name: payment.userName },
        { isSubscribed: true, subscriptionPlan: 'Pro' },
        { new: true }
      );
    } else if (payment.paymentType === 'GymMembership') {
      if (payment.startNextMonth) {
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        await User.findOneAndUpdate(
          { name: payment.userName },
          { futureSubscribedGymName: payment.gymName, futureSubscriptionDate: nextMonth },
          { new: true }
        );
      } else {
        await User.findOneAndUpdate(
          { name: payment.userName },
          { subscribedGymName: payment.gymName, gymMembershipType: payment.membershipType, gymJoiningDate: payment.joiningDate || new Date(), gymMembershipExpiresAt: new Date((payment.joiningDate || new Date()).getFullYear(), (payment.joiningDate || new Date()).getMonth() + (payment.membershipType === 'Yearly' ? 12 : 1), (payment.joiningDate || new Date()).getDate()), futureSubscribedGymName: null, futureSubscriptionDate: null },
          { new: true }
        );
      }
    }

    return res.json({ message: 'Payment approved', payment });
  } catch (error) {
    console.error('approvePayment error:', error.message);
    return res.status(500).json({ message: 'Unable to approve payment' });
  }
};

// @desc    Track gym registration or payment status publicly
// @route   GET /api/payments/track/:code
// @access  Public
export const trackPaymentByCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) return res.status(400).json({ message: 'Tracking code is required' });

    const cleanCode = code.trim();
    const payment = await Payment.findOne({
      $or: [
        { trackingCode: cleanCode },
        { paymentId: cleanCode },
        { transactionRef: cleanCode }
      ]
    });

    if (!payment) {
      return res.status(404).json({ message: 'No gym registration or payment found with this tracking code' });
    }

    // Mask customer name for PII protection: "John Doe" -> "J*** D**"
    const maskName = (name) => {
      if (!name) return 'Customer';
      return name
        .split(' ')
        .map(part => (part.length <= 1 ? part : `${part[0]}${'*'.repeat(Math.min(part.length - 1, 4))}`))
        .join(' ');
    };

    const masked = maskName(payment.userName);

    res.json({
      type: 'GymRegistration',
      trackingCode: payment.trackingCode || payment.paymentId,
      paymentId: payment.paymentId,
      userName: masked,
      maskedUserName: masked,
      gymName: payment.gymName,
      paymentType: payment.paymentType,
      membershipType: payment.membershipType,
      amount: payment.amount,
      status: payment.status,
      joiningDate: payment.joiningDate,
      createdAt: payment.createdAt
    });
  } catch (err) {
    console.error('verifyPaymentSlip error:', err);
    res.status(500).json({ message: 'Failed to verify payment slip' });
  }
};
