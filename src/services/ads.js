// Ad provider abstraction.
//
// The game only ever calls these four methods. Swapping the provider (none,
// Poki SDK, CrazyGames SDK, AdMob via Capacitor) is a matter of adding a
// provider object here; the game code does not change.
//
// Providers must implement:
//   init(): Promise<void>
//   showRewarded(): Promise<boolean>   // resolves true if the reward was earned
//   showInterstitial(): Promise<void>
//   gameplayStart() / gameplayStop()   // portal SDKs use these for ad pacing
import { track } from './analytics.js';

const noneProvider = {
  name: 'none',
  async init() {},
  async showRewarded() {
    // Without an ad network the reward is granted for free so the feature is
    // testable. Replace with a real provider before monetising.
    return true;
  },
  async showInterstitial() {},
  gameplayStart() {},
  gameplayStop() {},
};

// Poki: https://sdk.poki.com/  (script injected by the portal; window.PokiSDK)
const pokiProvider = {
  name: 'poki',
  async init() {
    await window.PokiSDK.init();
    window.PokiSDK.gameLoadingFinished();
  },
  async showRewarded() {
    return window.PokiSDK.rewardedBreak();
  },
  async showInterstitial() {
    await window.PokiSDK.commercialBreak();
  },
  gameplayStart() {
    window.PokiSDK.gameplayStart();
  },
  gameplayStop() {
    window.PokiSDK.gameplayStop();
  },
};

// CrazyGames: https://docs.crazygames.com/sdk/html5-v3/  (window.CrazyGames.SDK)
const crazyGamesProvider = {
  name: 'crazygames',
  async init() {
    await window.CrazyGames.SDK.init();
    window.CrazyGames.SDK.game.loadingStop();
  },
  showRewarded() {
    return new Promise((resolve) => {
      window.CrazyGames.SDK.ad.requestAd('rewarded', {
        adFinished: () => resolve(true),
        adError: () => resolve(false),
      });
    });
  },
  showInterstitial() {
    return new Promise((resolve) => {
      window.CrazyGames.SDK.ad.requestAd('midgame', { adFinished: resolve, adError: resolve });
    });
  },
  gameplayStart() {
    window.CrazyGames.SDK.game.gameplayStart();
  },
  gameplayStop() {
    window.CrazyGames.SDK.game.gameplayStop();
  },
};

function detectProvider() {
  if (typeof window === 'undefined') return noneProvider;
  if (window.PokiSDK) return pokiProvider;
  if (window.CrazyGames?.SDK) return crazyGamesProvider;
  return noneProvider;
}

let provider = noneProvider;

export const ads = {
  get providerName() {
    return provider.name;
  },
  async init() {
    provider = detectProvider();
    try {
      await provider.init();
    } catch (e) {
      console.warn('ad provider init failed, falling back to none', e);
      provider = noneProvider;
    }
    track('ads_init', { provider: provider.name });
  },
  async showRewarded(placement) {
    track('rewarded_request', { placement });
    let ok = false;
    try {
      ok = await provider.showRewarded();
    } catch {
      ok = false;
    }
    track(ok ? 'rewarded_earned' : 'rewarded_failed', { placement });
    return ok;
  },
  async showInterstitial(placement) {
    track('interstitial_request', { placement });
    try {
      await provider.showInterstitial();
    } catch {
      /* ignore */
    }
  },
  gameplayStart() {
    try {
      provider.gameplayStart();
    } catch {
      /* ignore */
    }
  },
  gameplayStop() {
    try {
      provider.gameplayStop();
    } catch {
      /* ignore */
    }
  },
};
