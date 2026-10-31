package net.paigegames.kilumen;

import android.content.Intent;
import android.net.Uri;
import com.android.billingclient.api.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.*;

/** Google Play Billing bridge for the Kilumen web game (dev/kilumen-store; copied from Lifeline's LifelineBillingPlugin). JS: window.Capacitor.Plugins.KilumenBilling */
@CapacitorPlugin(name = "KilumenBilling")
public class KilumenBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient client;
    private final Map<String, ProductDetails> details = new HashMap<>();
    private PluginCall pendingPurchase;

    @Override
    public void load() {
        client = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
    }

    private interface Ready { void run(); }
    private void connected(PluginCall call, Ready r) {
        if (client.isReady()) { r.run(); return; }
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult br) {
                if (br.getResponseCode() == BillingClient.BillingResponseCode.OK) r.run();
                else call.reject("billing unavailable: " + br.getDebugMessage(), String.valueOf(br.getResponseCode()));
            }
            @Override public void onBillingServiceDisconnected() { }
        });
    }

    /** Native config (from admob.properties via BuildConfig), so ad ids live in one native spot. */
    @PluginMethod
    public void getConfig(PluginCall call) {
        JSObject o = new JSObject();
        o.put("rewardedAdUnitId", BuildConfig.ADMOB_REWARDED_ID);
        o.put("interstitialAdUnitId", BuildConfig.ADMOB_INTERSTITIAL_ID);
        o.put("testAds", BuildConfig.TEST_ADS);
        o.put("versionCode", BuildConfig.VERSION_CODE);
        call.resolve(o);
    }

    /** getProducts({ inapp: [ids], subs: [ids] }) -> { products: [{id,type,price,title,basePlans:[{id,price}]}] } */
    @PluginMethod
    public void getProducts(PluginCall call) {
        connected(call, () -> {
            List<QueryProductDetailsParams.Product> list = new ArrayList<>();
            add(list, call.getArray("inapp"), BillingClient.ProductType.INAPP);
            add(list, call.getArray("subs"), BillingClient.ProductType.SUBS);
            if (list.isEmpty()) { call.resolve(new JSObject().put("products", new JSArray())); return; }
            client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(), (br, res) -> {
                JSArray out = new JSArray();
                for (ProductDetails d : res.getProductDetailsList()) {
                    details.put(d.getProductId(), d);
                    JSObject p = new JSObject().put("id", d.getProductId()).put("type", d.getProductType()).put("title", d.getName());
                    if (d.getOneTimePurchaseOfferDetails() != null) p.put("price", d.getOneTimePurchaseOfferDetails().getFormattedPrice());
                    if (d.getSubscriptionOfferDetails() != null) {
                        JSArray plans = new JSArray();
                        for (ProductDetails.SubscriptionOfferDetails s : d.getSubscriptionOfferDetails()) {
                            if (s.getOfferId() != null) continue; // base plans only
                            List<ProductDetails.PricingPhase> ph = s.getPricingPhases().getPricingPhaseList();
                            plans.put(new JSObject().put("id", s.getBasePlanId()).put("price", ph.get(ph.size() - 1).getFormattedPrice()));
                        }
                        p.put("basePlans", plans);
                    }
                    out.put(p);
                }
                call.resolve(new JSObject().put("products", out).put("code", br.getResponseCode()));
            });
        });
    }

    private void add(List<QueryProductDetailsParams.Product> list, JSArray ids, String type) {
        if (ids == null) return;
        try { for (Object id : ids.toList()) list.add(QueryProductDetailsParams.Product.newBuilder().setProductId(String.valueOf(id)).setProductType(type).build()); }
        catch (Exception ignored) { }
    }

    /** purchase({ productId, basePlanId? }) -> { ok, state, productIds, reason? }. Call getProducts first. */
    @PluginMethod
    public void purchase(PluginCall call) {
        String id = call.getString("productId"), plan = call.getString("basePlanId");
        connected(call, () -> {
            ProductDetails d = details.get(id);
            if (d == null) { call.resolve(new JSObject().put("ok", false).put("reason", "product not found in Play: " + id)); return; }
            BillingFlowParams.ProductDetailsParams.Builder pb = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d);
            if (d.getSubscriptionOfferDetails() != null) {
                String token = null;
                for (ProductDetails.SubscriptionOfferDetails s : d.getSubscriptionOfferDetails())
                    if (s.getBasePlanId().equals(plan) && s.getOfferId() == null) token = s.getOfferToken();
                if (token == null) { call.resolve(new JSObject().put("ok", false).put("reason", "base plan not found: " + plan)); return; }
                pb.setOfferToken(token);
            }
            if (pendingPurchase != null) { pendingPurchase.resolve(new JSObject().put("ok", false).put("reason", "superseded")); }
            pendingPurchase = call;
            call.setKeepAlive(true);
            getActivity().runOnUiThread(() -> {
                BillingResult br = client.launchBillingFlow(getActivity(), BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(pb.build())).build());
                if (br.getResponseCode() != BillingClient.BillingResponseCode.OK) finish(false, "launch failed: " + br.getDebugMessage(), null);
            });
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult br, List<Purchase> purchases) {
        int code = br.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
            JSArray ids = new JSArray(); boolean pending = false;
            for (Purchase p : purchases) {
                if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) { ack(p); for (String s : p.getProducts()) ids.put(s); }
                else if (p.getPurchaseState() == Purchase.PurchaseState.PENDING) pending = true;
            }
            if (ids.length() > 0) finish(true, null, ids);
            else finish(false, pending ? "pending" : "not purchased", null);
        } else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            finish(false, "already_owned", null);
        } else {
            finish(false, code == BillingClient.BillingResponseCode.USER_CANCELED ? "cancelled" : br.getDebugMessage(), null);
        }
        notifyListeners("purchasesUpdated", new JSObject().put("code", code));
    }

    private void finish(boolean ok, String reason, JSArray ids) {
        PluginCall c = pendingPurchase; pendingPurchase = null; if (c == null) return;
        JSObject o = new JSObject().put("ok", ok);
        if (reason != null) o.put("reason", reason);
        if (ids != null) o.put("productIds", ids);
        c.resolve(o); c.setKeepAlive(false);
    }

    private void ack(Purchase p) {
        if (p.isAcknowledged()) return; // unacknowledged purchases are refunded by Play after 3 days
        client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(), br -> { });
    }

    /** restore() -> { ok, passes: [ids], subs: [{ id, autoRenewing }] } — authoritative list of what Play says the user owns. */
    @PluginMethod
    public void restore(PluginCall call) {
        connected(call, () -> client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(), (br1, inapp) -> {
            if (br1.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.resolve(new JSObject().put("ok", false).put("reason", br1.getDebugMessage())); return; }
            client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(), (br2, subs) -> {
                if (br2.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.resolve(new JSObject().put("ok", false).put("reason", br2.getDebugMessage())); return; }
                JSArray passes = new JSArray(), subArr = new JSArray();
                for (Purchase p : inapp) if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) { ack(p); for (String s : p.getProducts()) passes.put(s); }
                for (Purchase p : subs) if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) { ack(p); for (String s : p.getProducts()) subArr.put(new JSObject().put("id", s).put("autoRenewing", p.isAutoRenewing())); }
                call.resolve(new JSObject().put("ok", true).put("passes", passes).put("subs", subArr));
            });
        }));
    }

    /** Opens Google Play's subscription management page (cancel / change plan happen there, per Play policy). */
    @PluginMethod
    public void manageSubscriptions(PluginCall call) {
        String sku = call.getString("productId", "");
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/account/subscriptions?sku=" + sku + "&package=" + getContext().getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }
}
