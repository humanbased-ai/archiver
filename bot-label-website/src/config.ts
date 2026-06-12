export const GIFT_CDN_PATH = 'https://static.codatta.io/gif-lable/';

const originalGIFTS: Record<
  string,
  { episode_id: string; instruction: string }
> = {
  des0: {
    episode_id: 'dlr_edan_shared_control_converted_externally_to_rlds_ep000000',
    instruction: 'Move the robot arm to grasp the object',
  },
  des1: {
    episode_id: 'dlr_edan_shared_control_converted_externally_to_rlds_ep000001',
    instruction: 'Pick up the red cube and place it in the blue bin',
  },
  des2: {
    episode_id: 'dlr_edan_shared_control_converted_externally_to_rlds_ep000002',
    instruction: 'Rotate the robot arm to align with the target',
  },
  des3: {
    episode_id: 'dlr_edan_shared_control_converted_externally_to_rlds_ep000003',
    instruction: 'Move the gripper to the green sphere',
  },
  des4: {
    episode_id: 'dlr_edan_shared_control_converted_externally_to_rlds_ep000004',
    instruction: 'Lift the object and move it to the designated area',
  },
  des5: {
    episode_id: 'dlr_edan_shared_control_converted_externally_to_rlds_ep000005',
    instruction: "Adjust the robot arm's position to reach the target",
  },
  des6: {
    episode_id: 'dlr_edan_shared_control_converted_externally_to_rlds_ep000006',
    instruction: 'Use the gripper to pick up the cylindrical object',
  },
  des7: {
    episode_id: 'dlr_edan_shared_control_converted_externally_to_rlds_ep000007',
    instruction: 'Move the robot arm to the starting position',
  },
  des8: {
    episode_id: 'dlr_edan_shared_control_converted_externally_to_rlds_ep000008',
    instruction: 'Grasp the object and rotate it 90 degrees',
  },
  des9: {
    episode_id: 'dlr_edan_shared_control_converted_externally_to_rlds_ep000009',
    instruction: 'Navigate the robot arm through the obstacle course',
  },
  dsg0: {
    episode_id: 'dlr_sara_grid_clamp_converted_externally_to_rlds_ep000000',
    instruction: 'Use the gripper to pick up the small gear',
  },
  dsg1: {
    episode_id: 'dlr_sara_grid_clamp_converted_externally_to_rlds_ep000001',
    instruction: 'Place the gear on the designated peg',
  },
  dsg2: {
    episode_id: 'dlr_sara_grid_clamp_converted_externally_to_rlds_ep000002',
    instruction: 'Align the gear with the matching slot',
  },
  dsg3: {
    episode_id: 'dlr_sara_grid_clamp_converted_externally_to_rlds_ep000003',
    instruction: 'Rotate the gear to fit into the mechanism',
  },
  dsg4: {
    episode_id: 'dlr_sara_grid_clamp_converted_externally_to_rlds_ep000004',
    instruction: 'Move the robot arm to the gear storage area',
  },
  dsg5: {
    episode_id: 'dlr_sara_grid_clamp_converted_externally_to_rlds_ep000005',
    instruction: 'Carefully lower the gear onto the assembly',
  },
  dsg6: {
    episode_id: 'dlr_sara_grid_clamp_converted_externally_to_rlds_ep000006',
    instruction: 'Pick up the large gear from the tray',
  },
  dsg7: {
    episode_id: 'dlr_sara_grid_clamp_converted_externally_to_rlds_ep000007',
    instruction: "Adjust the gripper's orientation for precise placement",
  },
  dsg8: {
    episode_id: 'dlr_sara_grid_clamp_converted_externally_to_rlds_ep000008',
    instruction: 'Stack the gears in ascending size order',
  },
  dsg9: {
    episode_id: 'dlr_sara_grid_clamp_converted_externally_to_rlds_ep000009',
    instruction: 'Remove the faulty gear from the assembly',
  },
  dsp0: {
    episode_id: 'dlr_sara_pour_converted_externally_to_rlds_ep000000',
    instruction: 'Pour the contents of the beaker into the flask',
  },
  dsp1: {
    episode_id: 'dlr_sara_pour_converted_externally_to_rlds_ep000001',
    instruction: 'Tilt the container to start pouring the liquid',
  },
  dsp2: {
    episode_id: 'dlr_sara_pour_converted_externally_to_rlds_ep000002',
    instruction: 'Carefully pour the powder into the mixing bowl',
  },
  dsp3: {
    episode_id: 'dlr_sara_pour_converted_externally_to_rlds_ep000003',
    instruction:
      'Transfer the liquid from the large container to the smaller one',
  },
  dsp4: {
    episode_id: 'dlr_sara_pour_converted_externally_to_rlds_ep000004',
    instruction: 'Pour the specified amount of solution into the test tube',
  },
  dsp5: {
    episode_id: 'dlr_sara_pour_converted_externally_to_rlds_ep000005',
    instruction: 'Gently tilt the vial to pour its contents',
  },
  dsp6: {
    episode_id: 'dlr_sara_pour_converted_externally_to_rlds_ep000006',
    instruction: 'Pour the granules into the funnel',
  },
  dsp7: {
    episode_id: 'dlr_sara_pour_converted_externally_to_rlds_ep000007',
    instruction: 'Carefully pour the hot liquid into the mold',
  },
  dsp8: {
    episode_id: 'dlr_sara_pour_converted_externally_to_rlds_ep000008',
    instruction: 'Transfer the colored liquid to the graduated cylinder',
  },
  dsp9: {
    episode_id: 'dlr_sara_pour_converted_externally_to_rlds_ep000009',
    instruction: 'Pour the water from the pitcher into the plant pot',
  },
  kn0: {
    episode_id: 'kaist_nonprehensile_converted_externally_to_rlds_ep000000',
    instruction: 'Push the block across the table without grasping it',
  },
  kn1: {
    episode_id: 'kaist_nonprehensile_converted_externally_to_rlds_ep000001',
    instruction: 'Use the robot arm to slide the object to the target area',
  },
  kn2: {
    episode_id: 'kaist_nonprehensile_converted_externally_to_rlds_ep000002',
    instruction: 'Nudge the cylinder to roll it towards the goal',
  },
  kn3: {
    episode_id: 'kaist_nonprehensile_converted_externally_to_rlds_ep000003',
    instruction: 'Tilt the platform to make the ball roll into the hole',
  },
  kn4: {
    episode_id: 'kaist_nonprehensile_converted_externally_to_rlds_ep000004',
    instruction: 'Use the flat surface of the arm to sweep the objects',
  },
  kn5: {
    episode_id: 'kaist_nonprehensile_converted_externally_to_rlds_ep000005',
    instruction: 'Gently push the fragile item to the edge of the table',
  },
  kn6: {
    episode_id: 'kaist_nonprehensile_converted_externally_to_rlds_ep000006',
    instruction: "Use the robot's appendage to flip the card over",
  },
  kn7: {
    episode_id: 'kaist_nonprehensile_converted_externally_to_rlds_ep000007',
    instruction: 'Slide the puck across the smooth surface to the target',
  },
  kn8: {
    episode_id: 'kaist_nonprehensile_converted_externally_to_rlds_ep000008',
    instruction: 'Use the arm to create a ramp for the ball to roll down',
  },
  kn9: {
    episode_id: 'kaist_nonprehensile_converted_externally_to_rlds_ep000009',
    instruction: "Manipulate the object's orientation without lifting it",
  },
};

export const GIFTS: Record<
  string,
  { episode_id: string; instruction: string; gif: string }
> = Object.fromEntries(
  Object.entries(originalGIFTS).map(([key, value]) => [
    key,
    {
      ...value,
      gif: `${GIFT_CDN_PATH}${value.episode_id}.gif`,
    },
  ])
);

export const CLOUDBASE_ID = import.meta.env.VITE_CLOUDBASE_ID;

export const KEYWORDS = [
  {
    type: 'Noun',
    keywords: [
      'board',
      'almonds',
      'cup',
      'bag',
      'hook',
      'box',
      'mug',
      'mark',
      'table',
      'hanger',
      'rod',
      'button',
      'door',
      'peg',
      'pot',
      'lid',
      'plate',
      'tool',
      'kitchen',
      'knife',
      'vegetable',
      'faucet',
      'bowl',
      'oven',
      'teapot',
      'stove',
      'carbinet',
      'spam',
      'fridge',
      'cloth',
      'bread',
      'grape',
      'towel',
    ],
  },
  {
    type: 'Verb',
    keywords: [
      'erase',
      'pour',
      'hang',
      'open',
      'reach',
      'press',
      'close',
      'insert',
      'turn',
      'stack',
      'take',
      'put',
      'use',
      'play',
      'lift',
      'place',
      'pick',
      'fold',
      'unfold',
    ],
  },
  {
    type: 'Prep',
    keywords: ['into', 'on', 'at', 'in', 'from', 'inside', 'to'],
  },
  {
    type: 'Adj',
    keywords: ['blue', 'red', 'white', 'green', 'canned', 'wrinkled'],
  },
];

export const ALL_KEYWORDS = KEYWORDS.flatMap((item) => item.keywords.sort());
