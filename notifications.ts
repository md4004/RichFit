// Daily notification job. Runs on the server (Cloud Run), triggered once a day by
// Cloud Scheduler via POST /api/notify/daily, so it never depends on anyone opening the app.
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import config from './firebase-applet-config.json' with { type: 'json' };

const TIMEZONE = 'Asia/Beirut';
const SOON_DAYS = 3;          // "ends in X days" window
const EXPIRED_GRACE_DAYS = 7; // only remind recently expired members
const PRUNE_AFTER_DAYS = 60;  // delete notifications older than this

type Stage = 'soon' | 'today' | 'expired';

// Notification ID prefixes (kept compatible with the ones the app created before)
const MEMBER_PREFIX: Record<Stage, string> = { soon: 'sub_alert', today: 'sub_today', expired: 'sub_expired' };
const ADMIN_PREFIX: Record<Stage, string> = { soon: 'admin_sub_alert', today: 'admin_sub_today', expired: 'admin_sub_expired' };

function db(): Firestore {
  const app = getApps()[0] ?? initializeApp({ projectId: config.projectId });
  return getFirestore(app, config.firestoreDatabaseId);
}

// Today's date in Beirut as YYYY-MM-DD
function todayInBeirut(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
}

// Whole days from today until the subscription end date (both treated as plain dates)
function daysBetween(today: string, end: string): number {
  const toUtc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((toUtc(end.slice(0, 10)) - toUtc(today)) / 86400000);
}

function stageFor(days: number): Stage | null {
  if (days >= 1 && days <= SOON_DAYS) return 'soon';
  if (days === 0) return 'today';
  if (days < 0 && days >= -EXPIRED_GRACE_DAYS) return 'expired';
  return null;
}

function memberMessage(stage: Stage, days: number) {
  if (stage === 'soon') return {
    title: 'Membership ending soon',
    body: `Your RichFit membership ends in ${days} day${days === 1 ? '' : 's'}. Renew at the front desk to keep training without interruption.`,
    type: 'warning' as const,
  };
  if (stage === 'today') return {
    title: 'Membership ends today',
    body: 'Your RichFit membership ends today. Renew at the front desk to keep your access.',
    type: 'warning' as const,
  };
  return {
    title: 'Membership expired',
    body: 'Your RichFit membership has expired. Renew at the front desk and get back to training.',
    type: 'critical' as const,
  };
}

function adminMessage(stage: Stage, name: string, days: number) {
  if (stage === 'soon') return { title: 'Membership ending soon', body: `${name}'s membership ends in ${days} day${days === 1 ? '' : 's'}.`, type: 'warning' as const };
  if (stage === 'today') return { title: 'Membership ends today', body: `${name}'s membership ends today.`, type: 'warning' as const };
  return { title: 'Membership expired', body: `${name}'s membership expired ${-days} day${days === -1 ? '' : 's'} ago.`, type: 'critical' as const };
}

function listNames(names: string[], max = 3): string {
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')} +${names.length - max} more`;
}

export async function runDailyNotifications(deps: { firestore?: any; messaging?: any; today?: string } = {}) {
  const firestore = deps.firestore ?? db();
  const messaging = deps.messaging ?? getMessaging();
  const today = deps.today ?? todayInBeirut();
  const nowIso = new Date().toISOString();
  const report = { date: today, memberPushes: 0, adminAlerts: 0, digestsSent: 0, lowStock: 0, removed: 0, invalidTokens: 0 };

  const usersSnap = await firestore.collection('users').get();
  const users = usersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  const admins = users.filter(u => u.role === 'admin');
  const members = users.filter(u => u.role !== 'admin' && u.role !== 'coach');
  const usersById = new Map<string, any>(users.map(u => [u.id, u]));

  // Sends a push (data-only, so the service worker controls how it is shown and where a tap leads)
  const push = async (user: any, title: string, body: string, url: string) => {
    if (!user.fcmToken) return false;
    try {
      await messaging.send({
        token: user.fcmToken,
        data: { title, body, url },
        webpush: { headers: { Urgency: 'high' } },
      });
      return true;
    } catch (err: any) {
      const code = err?.errorInfo?.code || err?.code || '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token') || code.includes('invalid-argument')) {
        await firestore.collection('users').doc(user.id).update({ fcmToken: null });
        report.invalidTokens++;
      } else {
        console.error(`Push failed for ${user.id}:`, err);
      }
      return false;
    }
  };

  // Creates a notification document once; returns true only the first time
  const createOnce = async (id: string, data: { userId: string; title: string; message: string; type: string; url?: string }) => {
    try {
      await firestore.collection('notifications').doc(id).create({ ...data, read: false, createdAt: nowIso });
      return true;
    } catch (err: any) {
      if (err?.code === 6 || String(err?.message).includes('ALREADY_EXISTS')) return false;
      throw err;
    }
  };

  // 1. Membership notifications
  const digest: Record<Stage, string[]> = { soon: [], today: [], expired: [] };

  for (const member of members) {
    if (member.status === 'inactive' || !member.subscriptionEnd) continue;
    const days = daysBetween(today, member.subscriptionEnd);
    const stage = stageFor(days);
    if (!stage) continue;

    // Member: in-app + push, once per stage per subscription period
    const m = memberMessage(stage, days);
    const memberDocId = `${MEMBER_PREFIX[stage]}_${member.id}_${member.subscriptionEnd}`;
    if (await createOnce(memberDocId, { userId: member.id, title: m.title, message: m.body, type: m.type, url: '/' })) {
      if (await push(member, m.title, m.body, '/')) report.memberPushes++;
    }

    // Admin: one in-app alert per member (no push; the push is the daily summary below)
    const a = adminMessage(stage, member.name, days);
    let newForAdmin = false;
    for (const admin of admins) {
      const adminDocId = `${ADMIN_PREFIX[stage]}_${member.id}_${member.subscriptionEnd}_${admin.id}`;
      if (await createOnce(adminDocId, { userId: admin.id, title: a.title, message: a.body, type: a.type, url: '/admin/ops' })) {
        report.adminAlerts++;
        newForAdmin = true;
      }
    }

    // Summary: everyone ending today or soon, plus members newly expired since the last run
    if (stage === 'soon' || stage === 'today' || newForAdmin) digest[stage].push(member.name);
  }

  // 2. Low stock (admin only, once each time a product drops to its alert level)
  const lowStock: string[] = [];
  const productsSnap = await firestore.collection('products').get();
  for (const p of productsSnap.docs) {
    const product = p.data() as any;
    // Only products where the admin set an alert level in the app
    const isLow = typeof product.minStock === 'number' && typeof product.stock === 'number' && product.stock <= product.minStock;
    for (const admin of admins) {
      const id = `low_stock_${p.id}_${admin.id}`;
      if (isLow) {
        const created = await createOnce(id, {
          userId: admin.id,
          title: 'Low stock',
          message: `${product.name} is down to ${product.stock} unit${product.stock === 1 ? '' : 's'}. Time to restock.`,
          type: 'warning',
          url: '/admin/shop',
        });
        if (created) report.lowStock++;
      } else {
        // Stock is back above the minimum: clear the alert so it can trigger again next time
        const ref = firestore.collection('notifications').doc(id);
        if ((await ref.get()).exists) { await ref.delete(); report.removed++; }
      }
    }
    if (isLow) lowStock.push(`${product.name} (${product.stock})`);
  }

  // 3. One morning summary push per admin
  const lines: string[] = [];
  if (digest.today.length) lines.push(`${digest.today.length} end today: ${listNames(digest.today)}`);
  if (digest.soon.length) lines.push(`${digest.soon.length} end within ${SOON_DAYS} days: ${listNames(digest.soon)}`);
  if (digest.expired.length) lines.push(`${digest.expired.length} just expired: ${listNames(digest.expired)}`);
  if (lowStock.length) lines.push(`Low stock: ${listNames(lowStock)}`);

  if (lines.length) {
    const title = 'RichFit daily summary';
    const body = lines.join(' · ');
    for (const admin of admins) {
      const created = await createOnce(`admin_digest_${today}_${admin.id}`, { userId: admin.id, title, message: body, type: 'info', url: '/admin/ops' });
      if (created && await push(admin, title, body, '/admin/ops')) report.digestsSent++;
    }
  }

  // 4. Cleanup: remove alerts that no longer apply, and anything very old
  const pruneBefore = new Date(Date.now() - PRUNE_AFTER_DAYS * 86400000).toISOString();
  const allNotifs = await firestore.collection('notifications').get();
  const staleRefs: any[] = [];
  for (const n of allNotifs.docs) {
    const data = n.data() as any;
    let stale = typeof data.createdAt === 'string' && data.createdAt < pruneBefore;

    const sub = n.id.match(/^(admin_)?sub_(alert|today|expired)_([^_]+)_(\d{4}-\d{2}-\d{2})(_.+)?$/);
    if (!stale && sub) {
      const [, adminPrefix, kind, memberId, end, adminSuffix] = sub;
      if (adminPrefix && !adminSuffix) { staleRefs.push(n.ref); continue; } // old single-admin format, replaced
      const member = usersById.get(memberId);
      const days = daysBetween(today, end);
      stale =
        !member ||                                   // member no longer exists
        member.status === 'inactive' ||              // member was terminated
        member.subscriptionEnd !== end ||            // member renewed
        (kind === 'alert' && days < 0) ||            // "ending soon" is outdated once expired
        (kind === 'today' && days < 0) ||
        (kind === 'expired' && days < -EXPIRED_GRACE_DAYS * 4); // long-expired: stop cluttering
    }
    if (stale) staleRefs.push(n.ref);
  }
  for (let i = 0; i < staleRefs.length; i += 400) {
    const batch = firestore.batch();
    staleRefs.slice(i, i + 400).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
  report.removed += staleRefs.length;

  return report;
}
