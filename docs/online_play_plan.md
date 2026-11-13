# Kilumen online play plan (DRAFT, Oct 22, 2026)

Status: **groundwork only, local only.** Nothing here has been applied to the real Supabase project
(`kjdubkeowcyuoazvpoyt`), nothing is committed, pushed or deployed. The stage-1 prototype runs between browser tabs on one
machine (`?online=1`), and the SQL for all three stages is in `supabase/migrations_proposed/`, tested in PGlite only.

Kilumen is Gary's own creature-collecting RPG. Pokémon is used for structure only (zones, link battles, quick-chat style).
Kids may play, so every choice below starts from safety first.

---

## 1. Verified limits and prices (checked Oct 22, 2026)

### Supabase Realtime, Free plan ($0)
Source: <https://supabase.com/docs/guides/realtime/limits> and <https://supabase.com/pricing>

| Limit | Free | Pro ($25/mo) | Pro, no spend cap / Team |
|---|---|---|---|
| Concurrent Realtime connections | **200** | 500 (then $10 per 1,000) | 10,000 |
| Messages per second (whole project) | **100** | 500 | 2,500 |
| Channel joins per second | 100 | 500 | 2,500 |
| Channels per connection | 100 | 100 | 100 |
| Presence keys per object | 10 | 10 | 10 |
| Presence messages per second | **20** | 50 | 1,000 |
| Broadcast payload size | 256 KB | 3,000 KB | 3,000 KB |
| Realtime messages per month | **2 million** | 5 million, then **$2.50 per million** | |

Other free-plan facts from <https://supabase.com/pricing>: 500 MB database, 5 GB egress, 50,000 monthly active users,
500,000 Edge Function calls, anonymous sign-ins included, at most 2 active free projects, and **free projects pause after
1 week with no activity**. Pro has a spend cap that is on by default.

How messages are counted (<https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages>):
a broadcast counts as **1 for the sender plus 1 for every client that receives it**. So one zone channel with N players
costs about **N × N × r** messages per second, where r is how often each player sends.

If a limit is hit, Realtime returns errors such as `too_many_connections`, `too_many_channels`, `too_many_joins` and
`tenant_events` (same limits page). The prototype shows "Area full" or "Offline" and keeps the single-player game running.

Security facts used in the design:
* Private channels + RLS on `realtime.messages` (<https://supabase.com/docs/guides/realtime/authorization>): policies look at
  `realtime.topic()` and `extension` (`broadcast` / `presence`), the client joins with `config: { private: true }`, and
  "Allow public access" must be turned off in Realtime settings. The check happens **when you join** (Realtime inserts a
  test row, reads it back, rolls back). It is cached per connection until the JWT refreshes. It does **not** look at each
  message, so a client can put anything in a payload. Do not `alter` `realtime.messages` (it fails with 42501).
* Use Presence for slow-changing state and Broadcast for frequent updates (<https://supabase.com/docs/guides/realtime/presence>).
* The database can broadcast with `realtime.send(payload, event, topic, private)` (<https://supabase.com/docs/guides/realtime/broadcast>).
  Messages are stored in `realtime.messages` partitions that are kept for 3 days. If no client has connected yet, so no
  partition exists, it logs a warning instead. Private/public must match the client channel.
* Supabase is replacing the `anon` and `service_role` keys with `sb_publishable_...` and `sb_secret_...` keys by the end of 2026
  (presence page). Kilumen's client only ever takes a publishable key, and `checkPublicKey()` rejects anything that looks
  like a secret or service-role key (tested).

### Alternatives
| Option | What it is | Cost | Fit for Kilumen |
|---|---|---|---|
| **Supabase Realtime** (above) | Hosted pub/sub, presence, RLS | Free to 2M msgs/month at 100 msg/s; Pro $25/mo + $2.50/M | Good for auth, saves, reports, chat RPC, small playtests. Gets expensive for lots of position traffic (N² fan-out). |
| **Colyseus** self-hosted | Node game server with rooms and state sync, MIT, `colyseus` 0.18.10 on npm | Software free. Needs a server: e.g. Hetzner CX23 from €5.99/month excl. VAT (<https://www.hetzner.com/cloud/cost-optimized/>; their page showed limited stock when checked) | Best for many players moving around: the server knows who sent what (no spoofing), can check movement, and runs battles server-side. Costs money and somebody has to run it. |
| Colyseus Cloud | Managed Colyseus | From $15/month, **no free tier** (<https://colyseus.io/pricing/>, <https://colyseus.io/cloud-managed-hosting/>) | Same as above, without running a server. |
| **boardgame.io** self-hosted | Turn-based framework, MIT, 0.50.2 (still the latest npm version) | Software free, same server costs as Colyseus | Turn-based only. Doesn't suit the free-walking overworld; could host battles, but Kilumen already has its own battle engine. |

### What the budget means in practice
Prototype send rates: while moving, PC sends 8 position updates/s and mobile 6/s (throttled). When standing still, nothing
is sent except a keyframe every 3 s (PC) or 4 s (mobile). Assume players are moving about 30% of the time:
r ≈ 0.3 × 8 + 0.7 × 0.33 ≈ **2.6 messages/s each** (PC).

| Situation | Messages/s (N × N × r) | Free tier |
|---|---|---|
| 2 friends in one zone | ≈ 10 | Fine. The 2M monthly messages last about 55 hours of play. |
| 6 players in one zone | ≈ 94 | At the 100 msg/s project limit. 2M messages last about 6 hours. |
| 10 players in one zone, all walking (8/s) | 800 | Over the limit, even on Pro (500/s). |
| 20 players at once, shards of about 7, 2 h a day | ≈ 350 | Pro: about 75M messages/month, so about $176 overage + $25 = **about $200/month** |

**Conclusion:** the free tier is fine for **small playtests** (a few friends), not for a public launch with position sync.
Plan:
1. Stage 1 playtests on the Supabase free tier, with zone channels capped at **6 players** (`capPerChannel`, set per profile)
   and, for the Supabase transport, one message per **tile step** instead of 8/s. The game moves on a grid, so a step
   message is enough to animate the walk.
2. Keep Supabase for everything that is low-volume and needs RLS: sign-in, saves, blocks, reports, admin review, typed
   chat through an RPC, and battle records.
3. If more than a few players are online at once, move **only position sync** to a small self-hosted Colyseus server
   (about €6/month) that checks Supabase JWTs. The client already talks to an abstract `Transport` (`src/online/transport.js`), so
   this means adding one new transport file, not a rewrite. **That would cost money, so it's Gary's call.**

---

## 2. Architecture (stage 1, built and tested locally)

```
src/main.js  ── ?online=1 ──▶ src/online/online.js  (wraps scene.renderer.draw; no overworld/battle edits)
                                 ├─ net.js        Throttle (8/6 Hz), Interp (blend, clock offset, teleport snap), SafetyList, Cooldown, shard pick
                                 ├─ ghosts.js     draws other players + name tags + speech bubbles
                                 ├─ filter.js     obscenity (vendored, MIT) + leet/spaced letters + links, phone numbers, contact apps, substances
                                 ├─ phrases.js    13 preset quick-chat phrases (IDs only go over the wire)
                                 ├─ names.js      names = word lists + roll number (no free-text names)
                                 ├─ profiles.js   PC and mobile tuning, independent; mobile landscape-only, 44 px buttons
                                 ├─ config.js     no keys, URLs or project refs in git; resolveOnline() decides local vs supabase
                                 └─ transport.js ─┬─ local_transport.js     BroadcastChannel between tabs (what the prototype uses)
                                                  └─ supabase_transport.js  private channel 'kilumen:zone:<id>#<shard>', presence key = auth uid
```

* **Presence per zone.** The channel is the layout zone (`scene.zone()`), or the map if it has no zones, e.g. `zone:sunmeadow_fields#1`.
  A full channel (16 PC / 12 mobile in the prototype) sends you to shard #2, #3, and so on up to 8.
  Changing zone leaves the old channel and joins the new one.
* **Position sync.** Snapshots `{x, y, dir, map, moving, t}` are throttled, and nothing is sent when nothing changed. Idle
  keyframes repair lost messages, late joiners and unblocks, and a peer that sees a gap asks with a `need` message. Remote
  players are drawn about 200 ms in the past and blended between two snapshots. Big jumps (doors, warps) snap instead of
  sliding. Out-of-order or duplicate snapshots are dropped. The buffer has a fixed size.
* **Quick-chat** (default). Only a phrase ID is sent. The receiver looks up the text, so there's nothing to filter.
  Cooldown 1.5 s (PC) or 2 s (mobile).
* **Typed chat** (stage 2, off by default). The prototype has it behind a setting, filtered when sent and again when
  received. Receivers who haven't turned typed chat on never see typed messages.
* **Mute / Block / Report.** In the Players panel (P on PC, a button on mobile). Mute hides bubbles. Block hides the player
  completely and is saved. Report blocks right away and stores the report (locally for now; in stage 2 it goes into
  `kilumen_online_reports`).

---

## 3. Safety and age approach

Kids may play, so the defaults are the safest ones and each loosening is opt-in:

1. **No free text anywhere by default.** Names come from word lists plus a number, chat is quick-chat phrases, and there are no DMs.
   Strangers can't send each other private messages at all (no DM feature in any stage).
2. **Typed chat is opt-in and limited.** It needs a real (not anonymous) account, an age gate or parent consent
   (`free_text_allowed`, set by the account flow, never by the client), **and** the player's own setting. It's filtered on the
   client, filtered again on the server (`kilumen_send_chat`), and filtered again by every receiver. 60 characters max,
   one message per 1.5 s, no links, numbers with 5 or more digits, contact apps, personal questions, alcohol, drugs or
   smoking. Logged for 30 days so reports can be checked.
3. **Mute, block, report** are one tap away. A report also blocks. Blocks also stop battle invites (stage 3). Reports are
   rate limited (10 per hour) and go to the existing Paige admin roles (`paige_private.is_admin('mod')`) for review, and
   review can ban for 24 h, 7 days or permanently.
4. **Banned players are locked out at the channel level** (RLS on `realtime.messages`). Because of the per-connection cache,
   this takes effect at the next JWT refresh, so keep JWT expiry short.
5. **No personal data needed** for stage 1: anonymous sign-in only, with no email, age or name stored.
6. **Content rule:** no alcohol, drugs or smoking anywhere, including the phrase list and filter list.

On age: the simplest safe line is **quick-chat only for everyone, and typed chat only for players who confirm they are 13+
(or with verified parental consent)**. Rules for collecting data from under-13s (e.g. COPPA in the US) are why typed
chat and accounts are gated. **Get a quick legal check before turning typed chat on publicly.**

Known gap in stage 1 (on purpose, low risk): Supabase Broadcast doesn't stamp the sender, so a modded client could fake
the `from` field and make a ghost or a **preset** phrase look like it came from someone else. Stage 2 fixes this for chat:
typed chat goes only through the RPC, which stamps `auth.uid()`, on a receive-only topic. **Recommendation:** also send
quick-chat through the same RPC in stage 2 so every chat line can be traced, and only ban on server-logged evidence.
Colyseus wouldn't have this gap at all.

---

## 4. Anti-cheat

* **Stage 1 (cosmetic).** Positions don't affect anyone else's game. Receivers snap on teleports instead of sliding, ignore
  unknown and blocked senders, re-filter any text, and size-check player info (`sanitiseMeta`). Later: drop steps longer
  than one tile per step time (speed check).
* **Battles (stage 3): deterministic seed + replay verification.**
  1. Invite → accept. Teams lock at accept, and **the server** makes the seed then, so nobody can choose a lucky seed.
  2. Each turn both players submit a choice to an RPC. RLS hides the other side's choice until you've made yours, so you
     can't peek. The server broadcasts both choices together.
  3. Both clients run the same deterministic engine, so they see the same result.
  4. Both claim a winner. An Edge Function (`kilumen-battle-verify`, service role, **server only**) replays seed + teams +
     choices and checks the teams against the player's cloud save. If anything disagrees, the battle is void and a
     `cheating` report is filed automatically.
  5. **Casual battles give no rewards**, so there's very little to gain by cheating. Ranked play or rewards would need
     server-authoritative battles (Colyseus or an Edge Function running each turn) and is out of scope.
* **Saves.** `kilumen_saves` is one row per user and profile (`pc` / `mobile`, independent), RLS own-row only, 256 KB max.
  The client can't write a save for anyone else, and battle verification checks teams against it.
* **Keys.** No service-role or secret key in the client or in git. `config.js` holds no key, URL or project ref (a test checks
  this). The publishable key comes from runtime config, and `checkPublicKey()` refuses secret-looking keys.

---

## 5. Staged rollout and exact Supabase changes

All SQL is in `supabase/migrations_proposed/` and has **NOT been applied**. RLS is on for every table. Test it locally with
`node --test supabase/migrations_proposed/tests/` (PGlite + a small Supabase shim, 6 tests).

| Stage | Players get | SQL file | Dashboard steps (not SQL) |
|---|---|---|---|
| 1 | See other players in your zone, preset quick-chat, mute/block/report kept on the device | `20261023000001_kilumen_online_stage1.sql`: `kilumen_online_players` (own row only; can't change your ban), `kilumen_private.is_zone_topic/online_ok`, policies on `realtime.messages` for `kilumen:(zone\|map):<id>#1-8` | Turn **off** "Allow public access" in Realtime settings. Turn **on** anonymous sign-ins. Short JWT expiry. **Check that no other game has a broad `realtime.messages` policy** (policies are OR'ed). |
| 2 | Opt-in filtered typed chat, blocks synced across devices, reports sent to admins | `20261023000002_kilumen_online_stage2.sql`: `free_text_allowed/enabled`, `kilumen_online_blocks`, `kilumen_online_reports` (auto-block trigger, 10/hour limit), `kilumen_review_report` (mods), `kilumen_online_chat` (log, admins only, 30-day purge function), `kilumen_send_chat` RPC → `realtime.send` on receive-only `kilumen:chat:...` | Optional: schedule `kilumen_private.purge_chat()` with pg_cron (free). Optional Edge Function using obscenity for a stronger filter. Needs paige-shared `20261022000007_paige_admin.sql`. |
| 3 | Casual battles with players you can see, cloud saves | `20261023000003_kilumen_online_stage3.sql`: `kilumen_saves`, `kilumen_battles`, `kilumen_battle_choices` (no peeking), invite/accept/decline/choice/claim RPCs, `kilumen_private.finish_battle` (service role only), receive-only `kilumen:battle:<id>` topic | Deploy the Edge Function `kilumen-battle-verify` (not written yet; needs the battle engine, which another worker owns). |

What the PGlite tests prove: RLS is on for every table. Zone channels need a player row, the right topic shape and no ban.
You can't unban yourself or edit someone else. Typed chat is refused for anonymous players, when off, without the age
flag, during cooldown, or for bad text: profanity (including spaced letters and leet), links, contact/personal info,
substances, "kys"; while "Scunthorpe" and "class" pass. The sender is stamped by the server, and clients can't post on
chat topics. Reports auto-block, are rate limited, only mods can review, and bans lock the channel. Blocked pairs can't
battle, the seed only exists after accept, you can't see the other side's choice early, a false winner claim voids the
battle and files a report, and saves are own-row only and size-capped.

---

## 6. Decisions for Gary

1. **Typed chat at all?** Recommended: quick-chat only at launch. Typed chat (stage 2) only for 13+ / parent-consented
   accounts, and still off until the player turns it on.
2. **Age gate:** self-declared 13+, parent email consent, or no typed chat for anyone? (Legal check recommended either way.)
3. **Who can battle whom:** anyone you can see in your zone (current design), only friends via a friend code, or only
   after both players have been in the same zone for a while? Blocked pairs can never battle.
4. **Accounts:** OK to start with anonymous sign-in (no data collected), with an optional upgrade to a Paige account later?
5. **Position sync at scale:** stay on the Supabase free tier with small playtests, or later pay about €6/month for a
   self-hosted Colyseus server (or $15+/month for Colyseus Cloud)? Supabase Pro + overage is about $200/month for 20
   players at once.
6. **Channel size:** 6 per zone channel on Supabase (budget) vs the prototype's 16 PC / 12 mobile?
7. **Who reviews reports**, and how fast? (Uses the existing Paige mod/admin roles.)
8. **Quick-chat phrase list** (13 now, in `src/online/phrases.js`): add or remove any?
9. **Should quick-chat go through the server RPC in stage 2** so every line is traceable? (Recommended, see section 3.)
