/**
 * Recorded-style Florence street loop used by post-run summary / details
 * screenshot fixtures. The polyline follows the bundled OSM walk graph
 * around the Arno (not a geodesic shortcut).
 */
import { METERS_PER_MILE, pathLengthMeters, pointAlongPath } from "./util.js";

export const FLORENCE_STREET_LOOP = [
  { lat: 43.7672, lon: 11.2543 },
  { lat: 43.767162, lon: 11.254171 },
  { lat: 43.767011, lon: 11.254528 },
  { lat: 43.766666, lon: 11.255437 },
  { lat: 43.766042, lon: 11.257108 },
  { lat: 43.765612, lon: 11.25824 },
  { lat: 43.765595, lon: 11.258326 },
  { lat: 43.765616, lon: 11.258371 },
  { lat: 43.766807, lon: 11.258929 },
  { lat: 43.766829, lon: 11.258926 },
  { lat: 43.766844, lon: 11.258897 },
  { lat: 43.766935, lon: 11.258937 },
  { lat: 43.767146, lon: 11.25791 },
  { lat: 43.767203, lon: 11.257913 },
  { lat: 43.767309, lon: 11.257929 },
  { lat: 43.767288, lon: 11.258044 },
  { lat: 43.767412, lon: 11.258055 },
  { lat: 43.767387, lon: 11.258419 },
  { lat: 43.767358, lon: 11.258747 },
  { lat: 43.76729, lon: 11.259179 },
  { lat: 43.766912, lon: 11.259023 },
  { lat: 43.766935, lon: 11.258937 },
  { lat: 43.767146, lon: 11.25791 },
  { lat: 43.767203, lon: 11.257913 },
  { lat: 43.767235, lon: 11.257786 },
  { lat: 43.767191, lon: 11.257765 },
  { lat: 43.767228, lon: 11.257615 },
  { lat: 43.767251, lon: 11.25751 },
  { lat: 43.767536, lon: 11.257634 },
  { lat: 43.767553, lon: 11.257553 },
  { lat: 43.767609, lon: 11.257572 },
  { lat: 43.767617, lon: 11.25773 },
  { lat: 43.767652, lon: 11.258124 },
  { lat: 43.767635, lon: 11.258124 },
  { lat: 43.767619, lon: 11.258095 },
  { lat: 43.767439, lon: 11.258068 },
  { lat: 43.767414, lon: 11.258444 },
  { lat: 43.767369, lon: 11.258835 },
  { lat: 43.767309, lon: 11.259192 },
  { lat: 43.7676, lon: 11.259302 },
  { lat: 43.767642, lon: 11.259321 },
  { lat: 43.767685, lon: 11.259342 },
  { lat: 43.767714, lon: 11.259356 },
  { lat: 43.767904, lon: 11.25946 },
  { lat: 43.768016, lon: 11.25953 },
  { lat: 43.768115, lon: 11.259575 },
  { lat: 43.768051, lon: 11.25971 },
  { lat: 43.768442, lon: 11.260061 },
  { lat: 43.768051, lon: 11.25971 },
  { lat: 43.768115, lon: 11.259575 },
  { lat: 43.768016, lon: 11.25953 },
  { lat: 43.767904, lon: 11.25946 },
  { lat: 43.767714, lon: 11.259356 },
  { lat: 43.767685, lon: 11.259342 },
  { lat: 43.767642, lon: 11.259321 },
  { lat: 43.767615, lon: 11.259425 },
  { lat: 43.767642, lon: 11.259321 },
  { lat: 43.7676, lon: 11.259302 },
  { lat: 43.767309, lon: 11.259192 },
  { lat: 43.767369, lon: 11.258835 },
  { lat: 43.767414, lon: 11.258444 },
  { lat: 43.767439, lon: 11.258068 },
  { lat: 43.767619, lon: 11.258095 },
  { lat: 43.767635, lon: 11.258124 },
  { lat: 43.767652, lon: 11.258124 },
  { lat: 43.767617, lon: 11.25773 },
  { lat: 43.767609, lon: 11.257572 },
  { lat: 43.767613, lon: 11.257398 },
  { lat: 43.767807, lon: 11.256185 },
  { lat: 43.767859, lon: 11.256185 },
  { lat: 43.767881, lon: 11.25622 },
  { lat: 43.768024, lon: 11.256335 },
  { lat: 43.768351, lon: 11.256617 },
  { lat: 43.768644, lon: 11.256896 },
  { lat: 43.76856, lon: 11.257127 },
  { lat: 43.768413, lon: 11.257448 },
  { lat: 43.768152, lon: 11.25799 },
  { lat: 43.768105, lon: 11.258098 },
  { lat: 43.76807, lon: 11.258157 },
  { lat: 43.768078, lon: 11.258248 },
  { lat: 43.768072, lon: 11.258487 },
  { lat: 43.768053, lon: 11.258562 },
  { lat: 43.767983, lon: 11.258733 },
  { lat: 43.767877, lon: 11.258937 },
  { lat: 43.767671, lon: 11.259415 },
  { lat: 43.767625, lon: 11.259549 },
  { lat: 43.767288, lon: 11.260619 },
  { lat: 43.767146, lon: 11.261158 },
  { lat: 43.76827, lon: 11.261716 },
  { lat: 43.768415, lon: 11.261815 },
  { lat: 43.768977, lon: 11.26222 },
  { lat: 43.768926, lon: 11.262432 },
  { lat: 43.76881, lon: 11.262872 },
  { lat: 43.768704, lon: 11.263172 },
  { lat: 43.768512, lon: 11.263655 },
  { lat: 43.768156, lon: 11.264594 },
  { lat: 43.768055, lon: 11.264854 },
  { lat: 43.768028, lon: 11.264835 },
  { lat: 43.768148, lon: 11.264495 },
  { lat: 43.76844, lon: 11.263722 },
  { lat: 43.768491, lon: 11.263575 },
  { lat: 43.768537, lon: 11.26361 },
  { lat: 43.770143, lon: 11.264567 },
  { lat: 43.770255, lon: 11.264015 },
  { lat: 43.76979, lon: 11.263749 },
  { lat: 43.770003, lon: 11.262783 },
  { lat: 43.770158, lon: 11.262083 },
  { lat: 43.770251, lon: 11.261601 },
  { lat: 43.770716, lon: 11.261965 },
  { lat: 43.770768, lon: 11.261657 },
  { lat: 43.770887, lon: 11.261037 },
  { lat: 43.770658, lon: 11.260823 },
  { lat: 43.77042, lon: 11.26063 },
  { lat: 43.770426, lon: 11.2606 },
  { lat: 43.770449, lon: 11.260257 },
  { lat: 43.770482, lon: 11.259948 },
  { lat: 43.770486, lon: 11.259911 },
  { lat: 43.770507, lon: 11.259761 },
  { lat: 43.770581, lon: 11.258733 },
  { lat: 43.770582, lon: 11.258698 },
  { lat: 43.770641, lon: 11.257894 },
  { lat: 43.770889, lon: 11.257915 },
  { lat: 43.770892, lon: 11.25787 },
  { lat: 43.770786, lon: 11.257851 },
  { lat: 43.770509, lon: 11.257778 },
  { lat: 43.770391, lon: 11.257765 },
  { lat: 43.770311, lon: 11.257725 },
  { lat: 43.770083, lon: 11.257454 },
  { lat: 43.770077, lon: 11.25744 },
  { lat: 43.770061, lon: 11.257416 },
  { lat: 43.769992, lon: 11.2574 },
  { lat: 43.769922, lon: 11.257406 },
  { lat: 43.769527, lon: 11.257475 },
  { lat: 43.769508, lon: 11.257612 },
  { lat: 43.769471, lon: 11.257604 },
  { lat: 43.769442, lon: 11.257623 },
  { lat: 43.769401, lon: 11.257671 },
  { lat: 43.769449, lon: 11.257529 },
  { lat: 43.769459, lon: 11.257478 },
  { lat: 43.769556, lon: 11.256561 },
  { lat: 43.769748, lon: 11.25592 },
  { lat: 43.769848, lon: 11.25544 },
  { lat: 43.769887, lon: 11.255295 },
  { lat: 43.769893, lon: 11.255203 },
  { lat: 43.769891, lon: 11.254404 },
  { lat: 43.769812, lon: 11.254402 },
  { lat: 43.769614, lon: 11.254377 },
  { lat: 43.769283, lon: 11.25409 },
  { lat: 43.76894, lon: 11.253822 },
  { lat: 43.768475, lon: 11.253473 },
  { lat: 43.768438, lon: 11.253455 },
  { lat: 43.768419, lon: 11.253444 },
  { lat: 43.767611, lon: 11.252849 },
  { lat: 43.767493, lon: 11.252789 },
  { lat: 43.767466, lon: 11.252835 },
  { lat: 43.767396, lon: 11.252779 },
  { lat: 43.767387, lon: 11.252811 },
  { lat: 43.767379, lon: 11.252886 },
  { lat: 43.767301, lon: 11.253141 },
  { lat: 43.76723, lon: 11.253417 },
  { lat: 43.76704, lon: 11.254093 },
  { lat: 43.767162, lon: 11.254171 },
  { lat: 43.7672, lon: 11.2543 }
];

/** Sector boundaries along the loop, in miles from the start (S1, S2). S3 ends at the finish. */
export const STREET_LOOP_SECTOR_ENDS_MI = [0.5, 2.2];

export function streetLoopPath() {
  return FLORENCE_STREET_LOOP.map((p) => ({ lat: p.lat, lon: p.lon }));
}

export function streetLoopMeters() {
  return pathLengthMeters(streetLoopPath());
}

export function streetLoopPins() {
  const path = streetLoopPath();
  const pins = [{ ...path[0], role: "start" }];
  for (const mi of STREET_LOOP_SECTOR_ENDS_MI) {
    const pt = pointAlongPath(path, mi * METERS_PER_MILE);
    pins.push({ lat: pt.lat, lon: pt.lon, role: "via" });
  }
  const end = path[path.length - 1];
  pins.push({ lat: end.lat, lon: end.lon, role: "end" });
  return pins;
}

/** Goal seconds so even-pace S1 is exactly 5:00.0. */
export function streetLoopGoalSec(totalMeters, s1Meters = 0.5 * METERS_PER_MILE) {
  const total = Number(totalMeters) || streetLoopMeters();
  const s1 = Number(s1Meters) || (0.5 * METERS_PER_MILE);
  return 300 * total / s1;
}

export function addLoopElevation(track, { peakM = 100 } = {}) {
  const n = (track || []).length;
  if (n < 2) return track || [];
  return track.map((p, i) => {
    const t = i / (n - 1);
    const climb = t <= 0.5 ? (t / 0.5) * peakM : ((1 - t) / 0.5) * peakM;
    return { ...p, ele: Math.round(climb * 10) / 10 };
  });
}
