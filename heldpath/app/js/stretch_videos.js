/**
 * Curated, free YouTube stretch videos from physical therapists and
 * running coaches. Playback uses youtube-nocookie embeds plus an
 * "Open in YouTube" link. Videos stay on YouTube; Heldpath is not
 * affiliated with the creators.
 */

export const FOLLOW_ALONG_BLURB =
  "Watch a real person lead the stretch. These are free videos from physical therapists and running coaches, played from YouTube. They are general fitness guidance, not medical advice. Stop if you feel pain.";

export const FOLLOW_ALONG_SECTIONS = [
  { id: "pre_run", name: "Pre-run" },
  { id: "post_run", name: "Post-run" },
  { id: "neck_upper", name: "Neck & upper back" },
  { id: "shoulders_arms", name: "Shoulders & arms" },
  { id: "back_trunk", name: "Back & trunk" },
  { id: "hips", name: "Hips" },
  { id: "thighs", name: "Thighs" },
  { id: "lower_legs", name: "Lower legs" },
];

/** youtubeId values were checked live and embeddable via YouTube oEmbed. */
export const FOLLOW_ALONG_VIDEOS = [
  {
    id: "pre_run_experience",
    section: "pre_run",
    title: "7-minute follow-along running warm-up",
    creator: "The Run Experience",
    role: "running coaches",
    youtubeId: "Kdgv6DPAZBU",
    length: "7 min",
    stretchIds: ["pd1_bend_and_reach", "pd6_windmill", "pd7_forward_lunge"],
  },
  {
    id: "pre_run_scotty",
    section: "pre_run",
    title: "5-minute warm-up before running",
    creator: "Dr. Dwayne Scotty",
    role: "physical therapist",
    youtubeId: "5cKxUUVeVVI",
    length: "5 min",
    stretchIds: ["rd2_rear_lunge"],
  },
  {
    id: "post_run_ntr",
    section: "post_run",
    title: "5-minute post-run cool-down",
    creator: "None to Run",
    role: "running coaches",
    youtubeId: "5YY_a6e7Vf4",
    length: "5 min",
    stretchIds: [],
  },
  {
    id: "post_run_peto",
    section: "post_run",
    title: "Post-run stretch routine, follow along",
    creator: "Tom Peto",
    role: "running coach",
    youtubeId: "8pDO5Qm3-DQ",
    length: null,
    stretchIds: [],
  },
  {
    id: "post_run_doctorjo_legs",
    section: "post_run",
    title: "Stretches for tired legs after a run",
    creator: "Ask Doctor Jo",
    role: "physical therapist",
    youtubeId: "xlk07Tk7TOQ",
    length: null,
    stretchIds: [],
  },
  {
    id: "neck_follow",
    section: "neck_upper",
    title: "Follow-along neck stretching routine",
    creator: "Ask Doctor Jo",
    role: "physical therapist",
    youtubeId: "KHxMOuylDTc",
    length: null,
    stretchIds: ["pmcs_neck"],
  },
  {
    id: "upper_back",
    section: "neck_upper",
    title: "Upper back stretches and exercises",
    creator: "Ask Doctor Jo",
    role: "physical therapist",
    youtubeId: "4aR-v_5f-T4",
    length: null,
    stretchIds: ["pmcs_midback_seated", "pmcs_midback_standing", "pmcs_midback_prone"],
  },
  {
    id: "shoulder_realtime",
    section: "shoulders_arms",
    title: "5-minute real-time shoulder stretches",
    creator: "Ask Doctor Jo",
    role: "physical therapist",
    youtubeId: "6jHsraw2NIk",
    length: "5 min",
    stretchIds: ["pmcs_shoulder", "rd1_overhead_arm_pull", "pmcs_arm", "pmcs_elbow_wrist"],
  },
  {
    id: "lower_back",
    section: "back_trunk",
    title: "Lower back stretches for pain relief",
    creator: "Ask Doctor Jo",
    role: "physical therapist",
    youtubeId: "Xm8iSSdU3I0",
    length: null,
    stretchIds: [
      "pmcs_lowback_prone",
      "pmcs_lowback_standing",
      "rd3_extend_and_flex",
      "rd3_extend_and_flex_standing",
      "pd9_bent_leg_body_twist",
    ],
  },
  {
    id: "hip_flexors",
    section: "hips",
    title: "7 hip flexor stretches",
    creator: "Bob & Brad",
    role: "physical therapists",
    youtubeId: "B5eAei_ISG4",
    length: null,
    stretchIds: ["pmcs_hip", "pmcs_hip_supine", "rd5_single_leg_over", "rd6_groin_stretch"],
  },
  {
    id: "quads",
    section: "thighs",
    title: "Quadriceps stretches",
    creator: "Ask Doctor Jo",
    role: "physical therapist",
    youtubeId: "BhQimqvU1tM",
    length: null,
    stretchIds: ["rd4_thigh_stretch"],
  },
  {
    id: "hamstrings",
    section: "thighs",
    title: "Hamstring stretches and exercises",
    creator: "Ask Doctor Jo",
    role: "physical therapist",
    youtubeId: "x5gunCRsSPU",
    length: null,
    stretchIds: ["rd8_hamstring_stretch", "rd8_hamstring_single_leg"],
  },
  {
    id: "calves",
    section: "lower_legs",
    title: "Calf stretches and exercises",
    creator: "Ask Doctor Jo",
    role: "physical therapist",
    youtubeId: "XibsfBav_04",
    length: null,
    stretchIds: ["rd7_calf_stretch"],
  },
  {
    id: "achilles",
    section: "lower_legs",
    title: "Achilles tendon stretches",
    creator: "Ask Doctor Jo",
    role: "physical therapist",
    youtubeId: "vU_FVahd4HI",
    length: null,
    stretchIds: ["pmcs_ankle", "pmcs_ankle_kneeling"],
  },
  {
    id: "knee",
    section: "lower_legs",
    title: "Knee pain stretches and exercises",
    creator: "Ask Doctor Jo",
    role: "physical therapist",
    youtubeId: "Qv9XGskry4M",
    length: null,
    stretchIds: ["pmcs_knee"],
  },
];

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function isYouTubeId(id) {
  return YT_ID.test(String(id || ""));
}

export function youtubeEmbedUrl(id) {
  if (!isYouTubeId(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

export function youtubeWatchUrl(id) {
  if (!isYouTubeId(id)) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeThumbUrl(id) {
  if (!isYouTubeId(id)) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function videoById(id) {
  return FOLLOW_ALONG_VIDEOS.find((v) => v.id === id) || null;
}

export function videosInSection(sectionId) {
  return FOLLOW_ALONG_VIDEOS.filter((v) => v.section === sectionId);
}

export function sectionById(id) {
  return FOLLOW_ALONG_SECTIONS.find((s) => s.id === id) || null;
}

/** Best matching follow-along video for a stretch card, if one exists. */
export function videoForStretch(stretchId) {
  if (!stretchId) return null;
  return FOLLOW_ALONG_VIDEOS.find((v) => (v.stretchIds || []).includes(stretchId)) || null;
}

export function creatorLine(video) {
  if (!video) return "";
  return video.role ? `${video.creator}, ${video.role}` : video.creator;
}
