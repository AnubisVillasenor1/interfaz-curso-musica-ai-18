import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const paths = {
  migration: 'supabase/migrations/20261107190000_entitlement_lifecycle.sql',
  fulfillment: 'lib/fulfilment.ts',
  webhook: 'app/api/stripe/webhook/route.ts',
}

const [migration, fulfillment, webhook] = await Promise.all(
  Object.values(paths).map((path) => readFile(new URL('../' + path, import.meta.url), 'utf8')),
)

const checks = [
  ['separates permanent course from the expiring extension', migration.includes('base_plan') && migration.includes('extension_expires_at')],
  ['checks extension expiry when consuming quota', /e\.extension_expires_at is not null and e\.extension_expires_at > now\(\)/i.test(migration)],
  ['checks Pro subscription status and period end', /e\.current_period_end is null or e\.current_period_end > now\(\)/i.test(migration) && migration.includes("'trialing', 'past_due'")],
  ['keeps unknown historical rights flagged for review', migration.includes('entitlement_reconciliation_required = true')],
  ['persists pending subscription identity and period', migration.includes('subscription_id, subscription_status, current_period_end') && migration.includes('play-and-go-pro')],
  ['preserves base entitlement when an extension is purchased', fulfillment.includes("basePlan = 'enrolled'") && fulfillment.includes('extensionExpiresAt = new Date')],
  ['validates Pro status before granting it', fulfillment.includes('PRO_ACTIVE_STATUSES.has(subscription.status)')],
  ['requires subscription identity before revoking Pro', fulfillment.includes(".eq('subscription_id', subscriptionId)") && fulfillment.includes('stale_subscription')],
  ['processes subscription updates from Stripe', webhook.includes("event.type === 'customer.subscription.updated'") && webhook.includes('sync_entitlement_effective_state')],
  ['verifies the subscription with the Stripe API before fulfilment', webhook.includes('subscriptions.retrieve(subscriptionId)')],
]

let failures = 0
for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label)
  if (!passed) failures += 1
}

assert.equal(failures, 0, failures + ' entitlement lifecycle contract checks failed')
console.log('Entitlement lifecycle contract checks passed: ' + checks.length + '/' + checks.length)
