# fx_extra / tod_checks

**DRAFT - not approved by Gary. NOT wired into game code.** Owner: Animator.

soul/ spotted, transitions and hit feedback had no 4-phase ToD strips (Game dev inventory item 1-3)

Transitions: soul hook_specs say grade none (screen-space UI layer, ungraded); checked ungraded and, as a fallback, lit-graded. Spotted spark/emotes: shown with sprite grade and lit grade (recommend lit).

## Results (fraction of FX pixels with |dLuma| >= 28 vs graded background; pass >= 0.5, creature-replacement >= 0.3)

| check | dawn | day | dusk | night | pass |
|---|---|---|---|---|---|
| spotted_spark_spritegrade | 0.872 | 0.882 | 0.849 | 0.742 | yes |
| spotted_spark_litgrade | 0.872 | 0.882 | 0.856 | 0.79 | yes |
| spotted_spark_rt_spritegrade | 0.752 | 0.888 | 0.693 | 0.516 | yes |
| spotted_spark_rt_litgrade | 0.752 | 0.888 | 0.693 | 0.681 | yes |
| spotted_eye_glint_spritegrade | 1.0 | 1.0 | 0.976 | 0.667 | yes |
| spotted_eye_glint_litgrade | 1.0 | 1.0 | 0.976 | 0.667 | yes |
| spotted_emote_heart_spritegrade | 0.919 | 0.923 | 0.903 | 0.789 | yes |
| spotted_emote_heart_litgrade | 0.919 | 0.923 | 0.918 | 0.817 | yes |
| spotted_emote_sweat_spritegrade | 0.922 | 0.933 | 0.905 | 0.788 | yes |
| spotted_emote_sweat_litgrade | 0.922 | 0.933 | 0.919 | 0.816 | yes |
| spotted_emote_dots_spritegrade | 0.942 | 0.942 | 0.926 | 0.809 | yes |
| spotted_emote_dots_litgrade | 0.942 | 0.942 | 0.941 | 0.837 | yes |
| spotted_emote_note_spritegrade | 0.935 | 0.935 | 0.921 | 0.809 | yes |
| spotted_emote_note_litgrade | 0.935 | 0.935 | 0.935 | 0.834 | yes |
| spotted_emote_zzz_spritegrade | 0.932 | 0.938 | 0.918 | 0.792 | yes |
| spotted_emote_zzz_litgrade | 0.932 | 0.938 | 0.932 | 0.825 | yes |
| spotted_emote_anger_spritegrade | 0.931 | 0.935 | 0.911 | 0.8 | yes |
| spotted_emote_anger_litgrade | 0.931 | 0.935 | 0.925 | 0.828 | yes |
| spotted_emote_question_spritegrade | 0.942 | 0.942 | 0.927 | 0.81 | yes |
| spotted_emote_question_litgrade | 0.942 | 0.942 | 0.941 | 0.838 | yes |
| spotted_emote_sparkle_spritegrade | 0.933 | 0.936 | 0.918 | 0.794 | yes |
| spotted_emote_sparkle_litgrade | 0.933 | 0.936 | 0.936 | 0.826 | yes |
| transition_wild_leaf_screenspace | 0.769 | 0.766 | 0.772 | 0.6 | yes |
| transition_wild_leaf_litgrade | 0.763 | 0.766 | 0.768 | 0.617 | yes |
| transition_enraged_shard_screenspace | 0.751 | 0.751 | 0.855 | 0.736 | yes |
| transition_enraged_shard_litgrade | 0.719 | 0.751 | 0.711 | 0.745 | yes |
| transition_trainer_bars_screenspace | 0.975 | 0.856 | 0.842 | 0.772 | yes |
| transition_trainer_bars_litgrade | 0.849 | 0.856 | 0.843 | 0.77 | yes |
| transition_ron_jacket_screenspace | 0.828 | 0.795 | 0.746 | 0.574 | yes |
| transition_ron_jacket_litgrade | 0.748 | 0.795 | 0.742 | 0.688 | yes |
| transition_master_coin_screenspace | 0.874 | 0.818 | 0.971 | 0.925 | yes |
| transition_master_coin_litgrade | 0.805 | 0.818 | 0.969 | 0.966 | yes |
| transition_guardian_whiteout_screenspace | 0.996 | 0.984 | 1.0 | 1.0 | yes |
| transition_guardian_whiteout_litgrade | 0.984 | 0.984 | 0.937 | 0.838 | yes |
| transition_reduced_motion_fade_screenspace | 0.998 | 0.863 | 0.863 | 0.795 | yes |
| transition_reduced_motion_fade_litgrade | 0.863 | 0.863 | 0.858 | 0.794 | yes |
| hit_cindrip_front_flash_spritegrade | 1.0 | 1.0 | 1.0 | 1.0 | yes |
| hit_cindrip_front_faint_spritegrade | 0.859 | 0.861 | 0.804 | 0.686 | yes |
| hit_cindrip_front_overuse_spritegrade | 0.858 | 0.86 | 0.808 | 0.685 | yes |
| hit_bastonox_back_flash_spritegrade | 1.0 | 1.0 | 1.0 | 1.0 | yes |
| hit_bastonox_back_faint_spritegrade | 0.799 | 0.811 | 0.791 | 0.678 | yes |
| hit_bastonox_back_overuse_spritegrade | 0.767 | 0.778 | 0.758 | 0.621 | yes |
| hit_tidemarrow_front_flash_spritegrade | 0.917 | 0.917 | 0.917 | 0.917 | yes |
| hit_tidemarrow_front_faint_spritegrade | 0.683 | 0.707 | 0.649 | 0.47 | yes |
| hit_tidemarrow_front_overuse_spritegrade | 0.644 | 0.675 | 0.614 | 0.427 | yes |

## Visual review

- **transitions_night**: Fixed in soul/ (Oct 22): wild_leaf, enraged_shard, ron_jacket and master_coin now use near-black fills with rims/detail from the 8 night-lit colours and are marked screen-space/ungraded. See the numbers above; night strips checked by eye.
- **spark**: spark brightened in soul/ (gen_spotted.py); see spotted_spark_* rows.
- **hit_feedback**: All pass. tidemarrow faint/overuse lowest at night (0.43-0.47) but above the 0.3 replacement-frame bar.

Strips: `_preview/<check>_tod_2x.png` (key frames x dawn|day|dusk|night) and `_tod_2x.gif` (animated).

## Previews

- ToD strips: 104 files in `tod_checks/_preview/*_tod_2x.*`


## Weak spots / needs artist polish

- Read-only checks of soul/ assets (soul/ is Animator-owned; it was fixed at the source, these are the checks).
- Transitions wild_leaf, enraged_shard, ron_jacket and master_coin are now screen-space (ungraded) with night-lit rims; spotted spark brightened.
- soul/ metadata now marks transitions grade none; other soul/ pieces are rendered both lit and sprite-graded.
- All art here is code-generated: it is a timing/placement draft and needs an artist polish pass before approval.

## Rebuild

`python3 _tools/gen_tod_checks.py` (or `python3 _tools/build_all.py`), then `python3 _tools/validate_fx_extra.py`.
