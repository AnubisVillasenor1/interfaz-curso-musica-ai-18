import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const paths = {
  migration: 'supabase/migrations/20261111143000_runtime_security_alignment.sql',
  fulfillment: 'lib/fulfilment.ts',
  webhook: 'app/api/stripe/webhook/route.ts',
}

const [migration, fulfillment, webhook] = await Promise.all(
  Object.values(paths).map((path) => readFile(new URL('../' + path, import.meta.url), 'utf8')),
)

const checks = [
  ['separates permanent course from the expiring extension', migration.includes('base_plan') && migration.includes('extension_expires_at')],
  ['requires explicit subscription status and a future period end', /e\.subscription_status in \('active', 'trialing', 'past_due'\)/i.test(migration) && /e\.current_period_end is not null\s+and e\.current_period_end > now\(\)/i.test(migration)],
  ['blocks provider generation when a paid entitlement needs reconciliation', /entitlement_reconciliation_required and not v_course_active/i.test(migration)],
  ['flags ambiguous historical Pro and extension rights without inventing an active status', migration.includes('entitlement_reconciliation_required = true') && !migration.includes("case when e.plan = 'pro' then 'active'" )],
  ['persists pending subscription identity and period', migration.includes('subscription_id, subscription_status, current_period_end') && migration.includes('play-and-go-pro')],
  ['preserves base entitlement when an extension is purchased', fulfillment.includes("basePlan = 'enrolled'") && fulfillment.includes('extensionExpiresAt = new Date')],
  ['requires verified status and future period end before granting Pro', fulfillment.includes('PRO_ACTIVE_STATUSES.has(subscription.status)') && fulfillment.includes('verifiedPeriodEnd')],
  ['requires subscription identity before revoking Pro', fulfillment.includes(".eq('subscription_id', subscriptionId)") && fulfillment.includes('stale_subscription')],
  ['processes subscription updates from Stripe', webhook.includes("event.type === 'customer.subscription.updated'") && webhook.includes('sync_entitlement_effective_state')],
  ['updates pending purchases when subscription lifecycle events arrive before signup', webhook.includes('pendingSubscriptionUpdated') && webhook.includes('pendingSubscriptionRevoked')],
  ['verifies the subscription with the Stripe API before fulfilment', webhook.includes('subscriptions.retrieve(subscriptionId)')],
  ['reads billing periods from subscription items in current Stripe SDK', webhook.includes('subscription.items.data') && webhook.includes('item.current_period_end')],
]

let failures = 0
for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label)
  if (!passed) failures += 1
}

assert.equal(failures, 0, failures + ' entitlement lifecycle contract checks failed')
console.log('Entitlement lifecycle contract checks passed: ' + checks.length + '/' + checks.length)
