import { Router, Request, Response } from 'express';
import { config } from '../config/env.js';
import { GarminOAuthService } from '../services/garmin-oauth.service.js';
import { SyncService } from '../services/sync.service.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const garminOAuth = new GarminOAuthService();
const syncService = new SyncService();

// Temporary in-memory store for pending OAuth request tokens (TTL ~10 min)
const pendingTokens = new Map<string, { tokenSecret: string; userId: string; expiresAt: number }>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingTokens.entries()) {
    if (val.expiresAt < now) pendingTokens.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * GET /api/garmin/status/:userId
 * Returns whether the user has a Garmin connection and basic info.
 */
router.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ success: false, error: 'userId required' });
      return;
    }

    const connection = await garminOAuth.getConnection(userId);
    if (!connection) {
      res.json({ success: true, connected: false });
      return;
    }

    res.json({
      success: true,
      connected: true,
      garminUserId: connection.garminUserId,
      connectedAt: connection.connectedAt,
    });
  } catch (err) {
    console.error('[Garmin] Status error:', err);
    res.status(500).json({ success: false, error: 'Failed to check Garmin status' });
  }
});

/**
 * GET /api/garmin/auth?userId=<uuid>
 * Initiates the OAuth 1.0a flow.
 * Returns the Garmin authorization URL for the client to redirect to.
 */
router.get('/auth', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ success: false, error: 'userId query param required' });
      return;
    }

    if (!config.GARMIN_CONSUMER_KEY || !config.GARMIN_CONSUMER_SECRET) {
      res.status(503).json({ success: false, error: 'Garmin API credentials not configured' });
      return;
    }

    const { authUrl, token, tokenSecret } = await garminOAuth.getRequestToken();

    // Store the request token secret temporarily keyed by token
    pendingTokens.set(token, {
      tokenSecret,
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minute TTL
    });

    res.json({ success: true, authUrl });
  } catch (err) {
    console.error('[Garmin] Auth error:', err);
    res.status(500).json({ success: false, error: 'Failed to initiate Garmin OAuth' });
  }
});

/**
 * GET /api/garmin/callback?oauth_token=...&oauth_verifier=...
 * Handles the OAuth callback from Garmin.
 * Exchanges the verifier for an access token and saves the connection.
 * Redirects to the Angular app when done.
 */
router.get('/callback', async (req: Request, res: Response) => {
  const oauthToken = req.query.oauth_token as string;
  const oauthVerifier = req.query.oauth_verifier as string;

  if (!oauthToken || !oauthVerifier) {
    res.status(400).send('Missing oauth_token or oauth_verifier');
    return;
  }

  const pending = pendingTokens.get(oauthToken);
  if (!pending) {
    res.status(400).send('Unknown or expired OAuth token. Please try connecting again.');
    return;
  }

  pendingTokens.delete(oauthToken);

  try {
    const { token: accessToken, tokenSecret: accessTokenSecret } =
      await garminOAuth.exchangeForAccessToken(oauthToken, pending.tokenSecret, oauthVerifier);

    const garminUserId = await garminOAuth.getGarminUserId(accessToken, accessTokenSecret);
    await garminOAuth.saveConnection(pending.userId, garminUserId, accessToken, accessTokenSecret);

    console.log(`[Garmin] Connected user ${pending.userId} → garmin_user_id ${garminUserId}`);

    // Redirect back to Angular app sync page
    const redirectUrl = `${config.CORS_ORIGIN}/sync?garmin=connected`;
    res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('[Garmin] Callback error:', err);
    const redirectUrl = `${config.CORS_ORIGIN}/sync?garmin=error`;
    res.redirect(302, redirectUrl);
  }
});

/**
 * DELETE /api/garmin/disconnect/:userId
 * Removes the Garmin connection for a user.
 */
router.delete('/disconnect/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    await garminOAuth.disconnect(userId);
    res.json({ success: true });
  } catch (err) {
    console.error('[Garmin] Disconnect error:', err);
    res.status(500).json({ success: false, error: 'Failed to disconnect Garmin' });
  }
});

/**
 * POST /api/garmin/webhook
 * Receives pushed activity data from the Garmin Health API.
 * Garmin pushes activitySummaries when a user completes an activity.
 */
router.post('/webhook', async (req: Request, res: Response) => {
  // Acknowledge receipt immediately — Garmin requires a fast 200 response
  res.status(200).json({ success: true });

  const body = req.body;
  if (!body) return;

  const summaries: any[] = body.activitySummaries ?? [];
  if (summaries.length === 0) {
    console.log('[Garmin] Webhook received (no activity summaries)');
    return;
  }

  console.log(`[Garmin] Webhook: processing ${summaries.length} activity summaries`);

  for (const summary of summaries) {
    try {
      await processActivitySummary(summary);
    } catch (err) {
      console.error('[Garmin] Failed to process activity summary:', err);
    }
  }
});

/**
 * Transform a Garmin activity summary (webhook push) into a workout instance
 * and persist it via SyncService.
 */
async function processActivitySummary(summary: any): Promise<void> {
  const garminUserId = summary.userId;
  if (!garminUserId) {
    console.warn('[Garmin] Activity summary missing userId, skipping');
    return;
  }

  const connection = await garminOAuth.getConnectionByGarminUserId(String(garminUserId));
  if (!connection) {
    console.warn(`[Garmin] No connection found for garmin_user_id ${garminUserId}`);
    return;
  }

  const userId = connection.userId;
  const activityId = summary.activityId ?? summary.summaryId ?? uuidv4();
  const externalId = `GARMIN_WEBHOOK_${activityId}`;

  const activityType: string = (summary.activityType ?? 'generic').toLowerCase();
  const startTimeSeconds: number = summary.startTimeInSeconds ?? 0;
  const durationSeconds: number = summary.durationInSeconds ?? 0;
  const startTime = new Date(startTimeSeconds * 1000);
  const endTime = new Date((startTimeSeconds + durationSeconds) * 1000);
  const distanceMeters: number = Math.round(summary.distanceInMeters ?? 0);
  const calories: number = Math.round(summary.activeKilocalories ?? summary.calories ?? 0);
  const heartRateAvg: number | undefined = summary.averageHeartRateInBeatsPerMinute;
  const heartRateMax: number | undefined = summary.maxHeartRateInBeatsPerMinute;
  const cadenceAvg: number | undefined =
    summary.averageRunCadenceInStepsPerMinute ??
    summary.averageBikeCadenceInRPM ??
    summary.averageSwimmingCadenceInStrokesPerMinute;
  const elevationGain: number | undefined = summary.totalElevationGainInMeters
    ? Math.round(summary.totalElevationGainInMeters)
    : undefined;

  const activityLabel =
    activityType.charAt(0).toUpperCase() + activityType.slice(1).replace(/_/g, ' ');
  const dateLabel = startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const templateName = `${activityLabel} — ${dateLabel}`;

  // Map Garmin activity type to app category
  const categoryMap: Record<string, string> = {
    running: 'CARDIO', cycling: 'CARDIO', swimming: 'CARDIO', walking: 'CARDIO',
    hiking: 'CARDIO', rowing: 'CARDIO', elliptical: 'CARDIO', stair_climbing: 'CARDIO',
    strength_training: 'STRENGTH', weight_training: 'STRENGTH', pilates: 'STRENGTH',
    yoga: 'YOGA', meditation: 'YOGA',
    basketball: 'SPORTS', soccer: 'SPORTS', tennis: 'SPORTS', volleyball: 'SPORTS',
    golf: 'SPORTS', baseball: 'SPORTS', football: 'SPORTS',
    hiit: 'HIIT', circuit_training: 'HIIT',
  };
  const category = categoryMap[activityType] ?? 'MIXED';

  const instance = {
    id: externalId,
    templateId: undefined as any,
    templateName,
    startTime,
    endTime,
    totalDuration: durationSeconds,
    sets: [
      {
        distance: distanceMeters,
        duration: durationSeconds,
        calories,
        avgHeartRate: heartRateAvg,
        maxHeartRate: heartRateMax,
        completed: true,
      },
    ],
    status: 'COMPLETED' as const,
    notes: `Auto-imported from Garmin Health API. Type: ${activityType}`,
    completedExercises: 1,
    totalExercises: 1,
    heart_rate_avg: heartRateAvg,
    heart_rate_max: heartRateMax,
    cadence_avg: cadenceAvg,
    distance: distanceMeters,
    elevation_gain: elevationGain,
    calories,
    external_source: 'garmin',
    external_id: externalId,
  };

  // Use SyncService to upsert the instance
  const result = await syncService.syncWorkoutInstances(userId, [instance as any]);

  if (result.success) {
    await garminOAuth.updateLastActivity(String(garminUserId));
    console.log(`[Garmin] Saved activity ${externalId} for user ${userId}`);
  } else {
    console.error(`[Garmin] Failed to save activity ${externalId}: ${result.error}`);
  }
}

export default router;
