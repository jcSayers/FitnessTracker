import { OAuth } from 'oauth';
import { config } from '../config/env.js';
import { getSupabase } from '../config/supabase.js';

const REQUEST_TOKEN_URL = 'https://healthapi.garmin.com/oauth-service/oauth/request_token';
const ACCESS_TOKEN_URL = 'https://healthapi.garmin.com/oauth-service/oauth/access_token';
const AUTHORIZE_URL = 'https://connect.garmin.com/oauthConfirm';

function createOAuthClient(): OAuth {
  return new OAuth(
    REQUEST_TOKEN_URL,
    ACCESS_TOKEN_URL,
    config.GARMIN_CONSUMER_KEY,
    config.GARMIN_CONSUMER_SECRET,
    '1.0',
    null,
    'HMAC-SHA1'
  );
}

export interface GarminTokenPair {
  token: string;
  tokenSecret: string;
}

export class GarminOAuthService {
  private supabase = getSupabase();

  /**
   * Step 1: Get a request token and return the authorization URL.
   * The caller should redirect the user to this URL.
   */
  async getRequestToken(): Promise<{ authUrl: string; token: string; tokenSecret: string }> {
    const oa = createOAuthClient();

    return new Promise((resolve, reject) => {
      oa.getOAuthRequestToken((err, token, tokenSecret) => {
        if (err) {
          reject(new Error(`Failed to get Garmin request token: ${JSON.stringify(err)}`));
          return;
        }
        const authUrl = `${AUTHORIZE_URL}?oauth_token=${encodeURIComponent(token)}`;
        resolve({ authUrl, token, tokenSecret });
      });
    });
  }

  /**
   * Step 2: Exchange the verifier for an access token and store it.
   */
  async exchangeForAccessToken(
    requestToken: string,
    requestTokenSecret: string,
    verifier: string
  ): Promise<GarminTokenPair> {
    const oa = createOAuthClient();

    return new Promise((resolve, reject) => {
      oa.getOAuthAccessToken(
        requestToken,
        requestTokenSecret,
        verifier,
        (err, accessToken, accessTokenSecret) => {
          if (err) {
            reject(new Error(`Failed to get Garmin access token: ${JSON.stringify(err)}`));
            return;
          }
          resolve({ token: accessToken, tokenSecret: accessTokenSecret });
        }
      );
    });
  }

  /**
   * Fetch the Garmin user ID using the access token.
   */
  async getGarminUserId(accessToken: string, accessTokenSecret: string): Promise<string> {
    const oa = createOAuthClient();
    const userIdUrl = 'https://healthapi.garmin.com/wellness-api/rest/user/id';

    return new Promise((resolve, reject) => {
      oa.get(userIdUrl, accessToken, accessTokenSecret, (err, data) => {
        if (err) {
          reject(new Error(`Failed to fetch Garmin user ID: ${JSON.stringify(err)}`));
          return;
        }
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          const garminUserId = parsed?.userId ?? parsed?.user?.userId;
          if (!garminUserId) {
            reject(new Error('Garmin user ID not found in response'));
            return;
          }
          resolve(String(garminUserId));
        } catch (parseErr) {
          reject(new Error(`Failed to parse Garmin user ID response: ${parseErr}`));
        }
      });
    });
  }

  /**
   * Save or update the Garmin connection for a user.
   */
  async saveConnection(
    userId: string,
    garminUserId: string,
    accessToken: string,
    accessTokenSecret: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('garmin_connections')
      .upsert(
        {
          user_id: userId,
          garmin_user_id: garminUserId,
          access_token: accessToken,
          access_token_secret: accessTokenSecret,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      throw new Error(`Failed to save Garmin connection: ${error.message}`);
    }
  }

  /**
   * Get the existing Garmin connection for a user.
   */
  async getConnection(userId: string): Promise<{
    garminUserId: string;
    accessToken: string;
    accessTokenSecret: string;
    connectedAt: string;
  } | null> {
    const { data, error } = await this.supabase
      .from('garmin_connections')
      .select('garmin_user_id, access_token, access_token_secret, connected_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      garminUserId: data.garmin_user_id,
      accessToken: data.access_token,
      accessTokenSecret: data.access_token_secret,
      connectedAt: data.connected_at,
    };
  }

  /**
   * Disconnect Garmin for a user.
   */
  async disconnect(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('garmin_connections')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to disconnect Garmin: ${error.message}`);
    }
  }

  /**
   * Get a Garmin connection by garmin_user_id (used in webhook processing).
   */
  async getConnectionByGarminUserId(garminUserId: string): Promise<{
    userId: string;
    accessToken: string;
    accessTokenSecret: string;
  } | null> {
    const { data, error } = await this.supabase
      .from('garmin_connections')
      .select('user_id, access_token, access_token_secret')
      .eq('garmin_user_id', garminUserId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      userId: data.user_id,
      accessToken: data.access_token,
      accessTokenSecret: data.access_token_secret,
    };
  }

  /**
   * Update last_activity_at timestamp for a Garmin connection.
   */
  async updateLastActivity(garminUserId: string): Promise<void> {
    await this.supabase
      .from('garmin_connections')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('garmin_user_id', garminUserId);
  }
}
