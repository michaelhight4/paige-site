/** Heldpath Stretches catalog. Figures from U.S. Army ATP 7-22.02 (federal public domain). */

export const DISCLAIMER =
  "This is general fitness guidance, not medical advice. Stop if you feel pain. If you have an injury, illness, or a condition that makes stretching unsafe, talk to a clinician first.";

export const CREDITS_TITLE = "Sources and credits";

export const CREDITS_BODY = [
  "The stretch figures in Heldpath are from U.S. Army ATP 7-22.02, Holistic Health and Fitness Drills and Exercises (including Change 1).",
  "The manual is a U.S. federal government work, marked approved for public release, and is in the public domain. Photos were developed by the U.S. Army Center for Initial Military Training and produced at the Enterprise Media Center in Fort Eustis, Virginia.",
  "Source: Army Publishing Directorate, armypubs.army.mil. We cropped the official figures for the cards and rewrote the cues in plain language. We did not change the movements.",
  "Heldpath is not affiliated with the U.S. Army or the Department of Defense.",
].join(" ");

export const GROUPS = [
  { id: "neck_upper", name: "Neck & upper back" },
  { id: "shoulders_arms", name: "Shoulders & arms" },
  { id: "back_trunk", name: "Back & trunk" },
  { id: "hips", name: "Hips" },
  { id: "thighs", name: "Thighs" },
  { id: "lower_legs", name: "Lower legs" },
];

const IMG = (id) => `assets/stretches/${id}.png`;

export const STRETCHES = [
  {
    id: "pmcs_neck",
    name: "Neck mobility",
    group: "neck_upper",
    drill: "PMCS",
    figure: "Figure 17-1. PMCS1 Spine—neck",
    image: IMG("pmcs_neck"),
    hold: "Slow, pain-free range",
    reps: "5 repetitions",
    description:
      "Stand with your feet apart. Look left and right, then tilt an ear toward each shoulder, and finally look up and down as far as is comfortable. Compare sides. Repeat the head movements five times, and do more only if the motion eases.",
  },
  {
    id: "pmcs_midback_seated",
    name: "Mid-back (seated)",
    group: "neck_upper",
    drill: "PMCS",
    figure: "Figure 17-2. PMCS1 Spine—mid-back seated",
    image: IMG("pmcs_midback_seated"),
    hold: "Slow, pain-free range",
    reps: "5 repetitions each way",
    description:
      "Sit tall with your fingers interlocked over your chest. Rotate your trunk to the right, then to the left, keeping the motion in your mid-back. Compare sides and repeat five times.",
  },
  {
    id: "pmcs_midback_standing",
    name: "Mid-back (standing)",
    group: "neck_upper",
    drill: "PMCS",
    figure: "Figure 17-3. PMCS1 Spine—mid-back standing mobility",
    image: IMG("pmcs_midback_standing"),
    hold: "Slow, pain-free range",
    reps: "5 repetitions",
    description:
      "Stand with your feet apart. Look up as far as you can without pain while you raise both arms up and over your head. Return and repeat five times. Do more only if the motion eases.",
  },
  {
    id: "pmcs_midback_prone",
    name: "Mid-back (prone)",
    group: "neck_upper",
    drill: "PMCS",
    figure: "Figure 17-4. PMCS1 Spine—mid-back prone mobility",
    image: IMG("pmcs_midback_prone"),
    hold: "Up to 60 seconds",
    reps: "1–3 holds",
    description:
      "Lie face down and prop your chin on your fingertips, opening the mid-back. Rest in this position for up to 60 seconds. Repeat a few times if it helps. Come down if you feel pain.",
  },
  {
    id: "rd1_overhead_arm_pull",
    name: "Overhead Arm Pull",
    group: "shoulders_arms",
    drill: "Recovery Drill",
    figure: "Figure 16-1. RD1 Overhead Arm Pull",
    image: IMG("rd1_overhead_arm_pull"),
    hold: "20–30 seconds each side",
    reps: "1–2 holds",
    description:
      "Stand with your feet apart. Raise one arm overhead, bend the elbow, and gently pull that elbow toward the opposite side until you feel a stretch along the triceps and the side of the trunk. Keep your ribcage tall. Switch sides.",
  },
  {
    id: "pmcs_shoulder",
    name: "Shoulder stretch",
    group: "shoulders_arms",
    drill: "PMCS",
    figure: "Figure 17-13. PMCS5 Shoulder",
    image: IMG("pmcs_shoulder"),
    hold: "Slow, pain-free range",
    reps: "5 repetitions each side",
    description:
      "Stand in a relaxed, feet-apart stance. Reach one hand behind you and use the other hand to gently draw that wrist farther back, as in a parade-rest position, until you feel a stretch across the front of the shoulder. Return and repeat five times on each side.",
  },
  {
    id: "pmcs_arm",
    name: "Elbow extension",
    group: "shoulders_arms",
    drill: "PMCS",
    figure: "Figure 17-14. PMCS6 Arm",
    image: IMG("pmcs_arm"),
    hold: "Slow, pain-free range",
    reps: "5 repetitions each side",
    description:
      "Stand with your feet apart. Support one arm with the opposite hand and straighten the elbow as far as is comfortable. You can brace the hand on a wall and gently press the elbow straighter. Return and repeat five times on each arm.",
  },
  {
    id: "pmcs_elbow_wrist",
    name: "Wrist extension",
    group: "shoulders_arms",
    drill: "PMCS",
    figure: "Figure 17-15. PMCS6 Elbow and wrist",
    image: IMG("pmcs_elbow_wrist"),
    hold: "Slow, pain-free range",
    reps: "5 repetitions each side",
    description:
      "Keep the elbow straight and use the opposite hand to gently pull the fingers back so the palm faces away from you. Return and repeat five times on each side. If straightening is uncomfortable, try the same idea into a gentle fist instead.",
  },
  {
    id: "pd1_bend_and_reach",
    name: "Bend and Reach",
    group: "back_trunk",
    drill: "Preparation Drill",
    figure: "Figure 3-1. PD1 Bend and Reach",
    image: IMG("pd1_bend_and_reach"),
    hold: "Slow cadence",
    reps: "5–10 repetitions",
    description:
      "Stand with your feet apart and arms overhead, palms facing in. Squat slightly, heels down, and reach your hands between your legs as you round the spine and tuck the chin to look behind you. Return to standing with the arms overhead. Move slowly.",
  },
  {
    id: "pd6_windmill",
    name: "Windmill",
    group: "back_trunk",
    drill: "Preparation Drill",
    figure: "Figure 3-9. PD6 Proper technique to execute the Windmill",
    image: IMG("pd6_windmill"),
    hold: "Slow cadence",
    reps: "5–10 repetitions",
    description:
      "Stand with your feet apart and arms straight out to the sides, palms down. Bend the hips and knees and rotate your trunk to one side, reaching the opposite hand toward the outside of that foot. Look back as the other arm stays in line across the shoulders. Return and switch sides.",
  },
  {
    id: "pd9_bent_leg_body_twist",
    name: "Bent-Leg Body Twist",
    group: "back_trunk",
    drill: "Preparation Drill",
    figure: "Figure 3-12. PD9 Bent-Leg Body Twist",
    image: IMG("pd9_bent_leg_body_twist"),
    hold: "Slow cadence",
    reps: "5–10 repetitions",
    description:
      "Lie on your back with hips and knees bent to 90 degrees, knees and feet together, and arms out to the sides with palms on the floor. Lower both legs to one side while the upper back and arms stay on the ground. Return to the center, then lower to the other side.",
  },
  {
    id: "rd3_extend_and_flex",
    name: "Extend and Flex",
    group: "back_trunk",
    drill: "Recovery Drill",
    figure: "Figure 16-3. RD3 Extend and Flex",
    image: IMG("rd3_extend_and_flex"),
    hold: "20–30 seconds each position",
    reps: "1–2 holds",
    description:
      "From a hands-and-knees or prone start, move into a gentle back extension with the hips down and look slightly up, holding 20–30 seconds. Then sit back toward your heels, chest toward the thighs and arms stretched forward, and hold another 20–30 seconds. Keep the motion pain-free.",
  },
  {
    id: "rd3_extend_and_flex_standing",
    name: "Extend and Flex (standing)",
    group: "back_trunk",
    drill: "Recovery Drill (modified)",
    figure: "Figure 16-12. RD MOD3 Extend and Flex (modified)—standing",
    image: IMG("rd3_extend_and_flex_standing"),
    hold: "10–15 seconds, or 20–30 seconds moving",
    reps: "1–2 holds",
    description:
      "Stand with your feet apart. Place your hands on your low back and gently extend, looking up, then fold forward with a long spine and let the arms hang or reach toward the floor. Move in and out of the positions for 20–30 seconds, or hold each for 10–15 seconds and repeat once.",
  },
  {
    id: "pmcs_lowback_prone",
    name: "Low back (prone)",
    group: "back_trunk",
    drill: "PMCS",
    figure: "Figure 17-5. PMCS1 Spine—low back prone",
    image: IMG("pmcs_lowback_prone"),
    hold: "Slow, pain-free range",
    reps: "10 repetitions",
    description:
      "Lie face down and press through your hands to lift the chest into a gentle extension, going only as far as is comfortable. Lower and repeat ten times. This is the extend position from Extend and Flex, used here as a mobility check for the low back.",
  },
  {
    id: "pmcs_lowback_standing",
    name: "Low back (standing)",
    group: "back_trunk",
    drill: "PMCS",
    figure: "Figure 17-6. PMCS1 Spine—low back standing",
    image: IMG("pmcs_lowback_standing"),
    hold: "Slow, pain-free range",
    reps: "10 repetitions",
    description:
      "Stand with your feet apart and hands on your low back. Gently extend through the spine, then return to standing. Repeat ten times. Stop if you feel pain.",
  },
  {
    id: "rd2_rear_lunge",
    name: "Rear Lunge stretch",
    group: "hips",
    drill: "Recovery Drill",
    figure: "Figure 16-2. RD2 Rear Lunge",
    image: IMG("rd2_rear_lunge"),
    hold: "20–30 seconds each side",
    reps: "1–2 holds",
    description:
      "Stand with your hands on your hips. Step one foot far back, lowering until you feel a stretch in the front of the rear hip and thigh. Keep the trunk upright and your gaze forward. Hold 20–30 seconds, then switch legs.",
  },
  {
    id: "rd5_single_leg_over",
    name: "Single-Leg Over",
    group: "hips",
    drill: "Recovery Drill",
    figure: "Figure 16-5. RD5 Single-Leg Over",
    image: IMG("rd5_single_leg_over"),
    hold: "20–30 seconds each side",
    reps: "1–2 holds",
    description:
      "Lie on your back with one knee pulled across the body toward the opposite side. Keep both shoulders and the opposite arm on the ground. You should feel the stretch through the hip and outer trunk. Hold 20–30 seconds, then switch sides.",
  },
  {
    id: "pmcs_hip",
    name: "Hip lunge mobility",
    group: "hips",
    drill: "PMCS",
    figure: "Figure 17-10. PMCS4 Hip",
    image: IMG("pmcs_hip"),
    hold: "Slow, pain-free range",
    reps: "5 repetitions each side",
    description:
      "Start in a half-kneeling position. Move your trunk, hips, and front knee forward over the front foot into a deep lunge, keeping the rear knee on the ground and the trunk upright. You should feel a stretch in the front of the rear thigh and hip. Return and repeat five times on each side.",
  },
  {
    id: "pmcs_hip_supine",
    name: "Knee to chest",
    group: "hips",
    drill: "PMCS",
    figure: "Figure 17-11. PMCS4 Hip—supine",
    image: IMG("pmcs_hip_supine"),
    hold: "Slow, pain-free range",
    reps: "5 repetitions each side",
    description:
      "Lie on your back and gently draw one knee toward your chest, keeping the other leg relaxed on the floor. Return and repeat five times on each side. Use this if a standing or kneeling hip movement is uncomfortable.",
  },
  {
    id: "rd4_thigh_stretch",
    name: "Thigh Stretch",
    group: "thighs",
    drill: "Recovery Drill",
    figure: "Figure 16-4. RD4 Thigh Stretch",
    image: IMG("rd4_thigh_stretch"),
    hold: "20–30 seconds each side",
    reps: "1–2 holds",
    description:
      "Lie on one side. Bend the top knee and hold the ankle, gently drawing the heel toward the same-side hip until you feel a stretch in the front of the thigh. Keep the hips stacked and the bottom leg relaxed. Hold 20–30 seconds, then switch sides.",
  },
  {
    id: "pd7_forward_lunge",
    name: "Forward Lunge",
    group: "thighs",
    drill: "Preparation Drill",
    figure: "Figure 3-10. PD7 Forward Lunge",
    image: IMG("pd7_forward_lunge"),
    hold: "Slow cadence",
    reps: "5–10 repetitions",
    description:
      "Stand with your feet apart and hands on your hips. Step forward and bend the hips and knees into a lunge, keeping the back straight and your eyes forward. Do not let the feet drift together. Return and step forward with the other leg.",
  },
  {
    id: "rd6_groin_stretch",
    name: "Groin Stretch",
    group: "thighs",
    drill: "Recovery Drill",
    figure: "Figure 16-6. RD6 Groin Stretch",
    image: IMG("rd6_groin_stretch"),
    hold: "20–30 seconds each side",
    reps: "1–2 holds",
    description:
      "Stand with a wide stance, hands on your hips. Bend one knee into a side lunge while the other leg stays long. Keep the trunk and head facing forward. Ease deeper until you feel the stretch along the inner thigh of the straight leg. Hold 20–30 seconds, then switch sides.",
  },
  {
    id: "rd7_calf_stretch",
    name: "Calf Stretch",
    group: "lower_legs",
    drill: "Recovery Drill",
    figure: "Figure 16-7. RD7 Calf Stretch",
    image: IMG("rd7_calf_stretch"),
    hold: "20–30 seconds each side",
    reps: "1–2 holds",
    description:
      "Stand facing forward in a staggered stance, hands on your hips or a support. Keep the rear foot pointed forward and the rear heel down. Lean forward until you feel a stretch in the rear calf. A slight bend in the rear knee shifts the stretch lower. Hold 20–30 seconds, then switch legs.",
  },
  {
    id: "rd8_hamstring_stretch",
    name: "Hamstring Stretch",
    group: "lower_legs",
    drill: "Recovery Drill",
    figure: "Figure 16-8. RD8 Hamstring Stretch",
    image: IMG("rd8_hamstring_stretch"),
    hold: "20–30 seconds",
    reps: "1–2 holds, then a slightly deeper reach",
    description:
      "Sit with both legs extended and reach toward your feet, ankles, or lower legs until you feel a stretch in the back of the thighs. Keep the knees straight without locking them. Hold 20–30 seconds. Relax, then reach slightly farther for a second hold.",
  },
  {
    id: "rd8_hamstring_single_leg",
    name: "Hamstring Stretch (single leg)",
    group: "lower_legs",
    drill: "Recovery Drill (modified)",
    figure: "Figure 16-18. RD MOD8 Hamstring (modified)—single leg",
    image: IMG("rd8_hamstring_single_leg"),
    hold: "20–30 seconds each side",
    reps: "1–2 holds",
    description:
      "Sit with one leg extended and the other knee bent. Reach toward the extended foot until you feel a stretch in the back of that thigh. Keep the extended knee straight without locking it. Hold 20–30 seconds, then switch legs.",
  },
  {
    id: "pmcs_ankle",
    name: "Ankle mobility",
    group: "lower_legs",
    drill: "PMCS",
    figure: "Figure 17-7. PMCS2 Ankle",
    image: IMG("pmcs_ankle"),
    hold: "Slow, pain-free range",
    reps: "5 repetitions each side",
    description:
      "Start in a half-kneeling position. Move your trunk, hips, and knee forward over the front foot as far as is comfortable, keeping the heel down if you can. Return and repeat five times on each side.",
  },
  {
    id: "pmcs_ankle_kneeling",
    name: "Ankle (kneeling)",
    group: "lower_legs",
    drill: "PMCS",
    figure: "Figure 17-8. PMCS2 Ankle—kneeling",
    image: IMG("pmcs_ankle_kneeling"),
    hold: "Slow, pain-free range",
    reps: "5 repetitions",
    description:
      "Kneel and sit your buttocks back toward your heels, then rise slightly and repeat. Use this if the half-kneeling ankle movement is uncomfortable. Move only in a pain-free range, five times or more if it helps.",
  },
  {
    id: "pmcs_knee",
    name: "Knee extension",
    group: "lower_legs",
    drill: "PMCS",
    figure: "Figure 17-9. PMCS3 Knee",
    image: IMG("pmcs_knee"),
    hold: "Slow, pain-free range",
    reps: "5 repetitions each side",
    description:
      "Stand with one foot slightly ahead and both hands on the front of that thigh, just above the knee. Tighten the thigh and gently press the knee straight. Return and repeat five times on each side. If this is uncomfortable, use the lying knee-to-chest movement instead.",
  },
];

export function groupById(id) {
  return GROUPS.find((g) => g.id === id) || null;
}

export function stretchesInGroup(groupId) {
  return STRETCHES.filter((s) => s.group === groupId);
}

export function stretchById(id) {
  return STRETCHES.find((s) => s.id === id) || null;
}

/** Mulberry32 — deterministic 0..1 generator for tests and a stable workout seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick two stretches from each muscle group (or all, if a group has fewer than two).
 * Group order is preserved so a workout flows from neck down to the legs.
 */
export function pickRandomWorkout(seed = Date.now(), perGroup = 2) {
  const rng = mulberry32(seed >>> 0);
  const list = [];
  for (const g of GROUPS) {
    const pool = stretchesInGroup(g.id).slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    list.push(...pool.slice(0, Math.min(perGroup, pool.length)));
  }
  return list;
}

/** Swipe left (dx < 0) goes to the next card; swipe right goes to the previous. */
export function swipeDirection(dx, dy, threshold = 50) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? "next" : "prev";
}

export function stepIndex(index, dir, length) {
  if (!length) return 0;
  if (dir === "next") return Math.min(length - 1, index + 1);
  if (dir === "prev") return Math.max(0, index - 1);
  return index;
}
