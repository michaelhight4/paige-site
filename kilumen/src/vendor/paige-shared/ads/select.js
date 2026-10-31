// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
import { AdMobProvider, hasNativeAdMob } from "./providers/admob.js";
import { NoAdsProvider } from "./providers/none.js";
import { PreviewAdsProvider } from "./providers/preview.js";
import { WebAdsProvider, webAdsAllowed } from "./providers/web.js";
/** Pick once: native AdMob > test preview > web (enabled + allowed host) > none. */
export function pickAdsProvider(c, o = {}) {
    if (c.admob.enabled && hasNativeAdMob())
        return new AdMobProvider(c.admob, o.bannerHeight);
    if (o.preview && c.testPreview)
        return new PreviewAdsProvider(o.previewOptions);
    if (webAdsAllowed(c.web))
        return new WebAdsProvider(c.web, o.bannerHeight);
    return new NoAdsProvider();
}
