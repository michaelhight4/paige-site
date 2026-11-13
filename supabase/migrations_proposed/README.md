# Proposed migrations: Kilumen online play (NOT APPLIED)

Written Oct 22, 2026 for the online play groundwork. **None of these have been run against any real Supabase project.**
Plan, costs and the reasons behind the design: `docs/online_play_plan.md`.

| File | Stage |
|---|---|
| `20261023000001_kilumen_online_stage1.sql` | See others in your zone + quick-chat (player row, Realtime channel policies) |
| `20261023000002_kilumen_online_stage2.sql` | Filtered typed chat via RPC, blocks, reports + admin review |
| `20261023000003_kilumen_online_stage3.sql` | Casual battles (seed + replay verification), cloud saves |

Local test (PGlite + Supabase shim, no network): `node --test supabase/migrations_proposed/tests/`
(PGlite is found via `PGLITE_FROM` or `../riftward/app`; the tests skip if it isn't there.)

Before applying (Gary's approval needed): read the dashboard steps at the top of each file, check that no existing
`realtime.messages` policy is broad enough to open `kilumen:*` topics, and apply stage by stage. Moving a file into the
real migrations folder is a separate, deliberate step.
