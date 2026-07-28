/**
 * Curated mobility / prehab routines keyed to the injury areas a member can
 * pick (see INJURY_AREAS in lib/injury.ts). These are gentle, general-purpose
 * movement routines — not medical treatment. Each area maps to one routine.
 */

export interface TherapyMove {
  name: string;
  how: string;
  dose: string;
}

export interface TherapyRoutine {
  area: string; // matches an INJURY_AREAS value
  title: string;
  focus: string;
  minutes: number;
  moves: TherapyMove[];
}

export const THERAPY_ROUTINES: Record<string, TherapyRoutine> = {
  neck: {
    area: "neck",
    title: "Neck release & mobility",
    focus: "Ease tension and restore gentle range.",
    minutes: 6,
    moves: [
      { name: "Chin tucks", how: "Draw your chin straight back, making a 'double chin', without tilting.", dose: "2 × 10" },
      { name: "Slow neck rotations", how: "Turn your head side to side through a comfortable range.", dose: "1 × 8 each way" },
      { name: "Upper-trap stretch", how: "Gently tilt one ear toward the shoulder, hand resting on your head.", dose: "30s each side" },
      { name: "Levator scapulae stretch", how: "Look down toward your armpit, apply light overpressure.", dose: "30s each side" },
    ],
  },
  shoulder: {
    area: "shoulder",
    title: "Shoulder mobility & cuff",
    focus: "Loosen the joint and wake up the rotator cuff.",
    minutes: 8,
    moves: [
      { name: "Pendulum swings", how: "Hinge over, let the arm hang and circle it gently.", dose: "30s each direction" },
      { name: "Wall slides", how: "Forearms on the wall, slide up and down keeping contact.", dose: "2 × 10" },
      { name: "Band external rotation", how: "Elbow at your side, rotate the forearm out against a light band.", dose: "2 × 12 each" },
      { name: "Cross-body stretch", how: "Draw the arm across your chest with the other hand.", dose: "30s each side" },
    ],
  },
  "upper back": {
    area: "upper back",
    title: "Thoracic & upper-back reset",
    focus: "Restore rotation and open a stiff mid-back.",
    minutes: 7,
    moves: [
      { name: "Cat–camel", how: "On all fours, alternate rounding and arching the spine.", dose: "2 × 10" },
      { name: "Thread the needle", how: "Reach one arm under and across, rotating the mid-back.", dose: "1 × 8 each side" },
      { name: "Open books", how: "Side-lying, open the top arm to rotate the chest toward the floor behind.", dose: "1 × 8 each side" },
      { name: "Band pull-aparts", how: "Pull a light band apart at chest height, squeezing the shoulder blades.", dose: "2 × 15" },
    ],
  },
  "lower back": {
    area: "lower back",
    title: "Lower-back care",
    focus: "Decompress and build gentle core support.",
    minutes: 8,
    moves: [
      { name: "Pelvic tilts", how: "On your back, gently flatten and arch the lower back.", dose: "2 × 10" },
      { name: "Knee-to-chest", how: "Hug one knee, then both, to the chest.", dose: "30s each" },
      { name: "Bird dog", how: "On all fours, extend opposite arm and leg, stay flat.", dose: "2 × 8 each side" },
      { name: "Glute bridge", how: "On your back, drive hips up squeezing the glutes.", dose: "2 × 12" },
    ],
  },
  elbow: {
    area: "elbow",
    title: "Elbow & forearm care",
    focus: "Settle tendon irritation and load gently.",
    minutes: 6,
    moves: [
      { name: "Wrist extensor stretch", how: "Arm straight, gently pull the hand down and in.", dose: "30s each side" },
      { name: "Wrist flexor stretch", how: "Arm straight, gently pull the fingers back and up.", dose: "30s each side" },
      { name: "Eccentric wrist curls", how: "Lower a light weight slowly, reset with the other hand.", dose: "2 × 12 each" },
      { name: "Forearm supination/pronation", how: "Rotate a light weight palm-up to palm-down.", dose: "2 × 12 each" },
    ],
  },
  wrist: {
    area: "wrist",
    title: "Wrist mobility",
    focus: "Restore range and build tolerance to load.",
    minutes: 5,
    moves: [
      { name: "Wrist circles", how: "Make slow circles in both directions.", dose: "30s each way" },
      { name: "Prayer stretch", how: "Palms together, lower the hands to feel a gentle stretch.", dose: "30s" },
      { name: "Reverse prayer / back of hands", how: "Backs of the hands together, raise gently.", dose: "30s" },
      { name: "Tabletop weight shifts", how: "On all fours, rock gently over loaded wrists.", dose: "1 × 10" },
    ],
  },
  chest: {
    area: "chest",
    title: "Chest & front-shoulder opener",
    focus: "Release tight pecs and front-shoulder tissue.",
    minutes: 5,
    moves: [
      { name: "Doorway pec stretch", how: "Forearm on the frame, step through gently.", dose: "30s each side" },
      { name: "Floor angels", how: "On your back, slide the arms overhead keeping contact.", dose: "2 × 10" },
      { name: "Band pull-aparts", how: "Pull a light band apart at chest height.", dose: "2 × 15" },
    ],
  },
  hip: {
    area: "hip",
    title: "Hip mobility & control",
    focus: "Open the hips and switch on the glutes.",
    minutes: 8,
    moves: [
      { name: "90/90 rotations", how: "Seated, rotate both knees side to side.", dose: "1 × 8 each side" },
      { name: "Hip flexor stretch", how: "Half-kneel, tuck the pelvis and shift forward.", dose: "30s each side" },
      { name: "Clamshells", how: "Side-lying, open the top knee against light resistance.", dose: "2 × 15 each" },
      { name: "Glute bridge", how: "Drive the hips up squeezing the glutes.", dose: "2 × 12" },
    ],
  },
  hamstring: {
    area: "hamstring",
    title: "Hamstring care",
    focus: "Gently lengthen and load the hamstrings.",
    minutes: 6,
    moves: [
      { name: "Supine hamstring stretch", how: "On your back, hold behind the thigh and straighten the knee.", dose: "30s each side" },
      { name: "Hamstring sliders", how: "Heels on sliders, bridge and slowly extend the legs.", dose: "2 × 8" },
      { name: "Single-leg RDL (light)", how: "Hinge on one leg with a slow, controlled range.", dose: "2 × 8 each" },
    ],
  },
  knee: {
    area: "knee",
    title: "Knee-friendly strength",
    focus: "Load the knee gently and build quad/glute support.",
    minutes: 8,
    moves: [
      { name: "Straight-leg raises", how: "On your back, keep the knee locked and lift the leg.", dose: "2 × 12 each" },
      { name: "Wall sit (short range)", how: "Slide down a wall to a pain-free depth and hold.", dose: "3 × 20–30s" },
      { name: "Step-downs (low step)", how: "Slowly lower off a low step with control.", dose: "2 × 8 each" },
      { name: "Terminal knee extensions", how: "Band behind the knee, straighten against it.", dose: "2 × 15" },
    ],
  },
  calf: {
    area: "calf",
    title: "Calf & Achilles care",
    focus: "Restore ankle push-off and load the calf.",
    minutes: 5,
    moves: [
      { name: "Calf stretch (wall)", how: "Back leg straight, heel down, lean in.", dose: "30s each side" },
      { name: "Soleus stretch", how: "Same position, bend the back knee slightly.", dose: "30s each side" },
      { name: "Slow calf raises", how: "Rise onto the toes, lower slowly.", dose: "2 × 15" },
    ],
  },
  ankle: {
    area: "ankle",
    title: "Ankle mobility & stability",
    focus: "Restore range and steady the joint.",
    minutes: 6,
    moves: [
      { name: "Ankle alphabet", how: "Trace the alphabet with your toes.", dose: "1 each foot" },
      { name: "Knee-to-wall", how: "Drive the knee over the toes keeping the heel down.", dose: "2 × 10 each" },
      { name: "Single-leg balance", how: "Balance on one foot; progress to eyes closed.", dose: "3 × 20–30s each" },
      { name: "Slow calf raises", how: "Rise onto the toes, lower slowly.", dose: "2 × 15" },
    ],
  },
};

/** Routines for the member's flagged areas, in the order they picked them. */
export function routinesForAreas(areas: string[] | null | undefined): TherapyRoutine[] {
  if (!areas) return [];
  const seen = new Set<string>();
  const out: TherapyRoutine[] = [];
  for (const a of areas) {
    const r = THERAPY_ROUTINES[a];
    if (r && !seen.has(r.area)) {
      seen.add(r.area);
      out.push(r);
    }
  }
  return out;
}
