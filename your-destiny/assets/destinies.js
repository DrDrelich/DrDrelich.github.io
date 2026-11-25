/* Your Destiny: three destinies per drawn pair, one per envelope
   (1 Omen, 2 Paradox, 3 Instruction). DESTINIES[left][right] uses the
   reel order in slot.js: left FEAR, ABSURDITY, PRESTIGE, ISOLATION, SPEED;
   right AIR, WATER, EARTH, EMPTINESS, SPACE. Source: mobile-surprise-destinies.md */
window.DESTINIES = [
  [ // FEAR
    ["Courage is breath, let go.", "Dread is mostly weather.", "Name the storm, then walk in."],   // AIR
    ["Sink a little. Then swim.", "The deep end is just deeper.", "Get wet before you're ready."],   // WATER
    ["Trembling is how roots settle.", "Ground holds those who shake.", "Plant your feet. Stay."],   // EARTH
    ["Empty hands can't drop anything.", "Fear lives where nothing is.", "Look straight into the blank."],   // EMPTINESS
    ["The dark is just room to grow.", "The void is only distance.", "Step past the edge of the map."]   // SPACE
  ],
  [ // ABSURDITY
    ["Sense is heavy. Go light.", "Even clouds have no plan.", "Let a silly idea fly."],   // AIR
    ["Wet socks are a philosophy.", "The tide takes no meetings.", "Laugh before the wave does."],   // WATER
    ["Serious people still fall down.", "Gravity is a running joke.", "Trip gracefully."],   // EARTH
    ["A blank page is a punchline.", "Nothing means it. Enjoy that.", "Fill the silence with nonsense."],   // EMPTINESS
    ["Infinity has no dress code.", "Stars don't know they're stars.", "Wave at the universe anyway."]   // SPACE
  ],
  [ // PRESTIGE
    ["Crowns weigh nothing. Heads do.", "Applause is just moving air.", "Trade a title for a breath."],   // AIR
    ["Pedestals sink in high tide.", "Fame is a name on a wave.", "Make waves, not monuments."],   // WATER
    ["Build low. It lasts longer.", "Every crown is borrowed soil.", "Kneel once. See further."],   // EARTH
    ["A big name fills no room.", "The trophy shelf echoes.", "Want less. Hold more."],   // EMPTINESS
    ["Fame is light from a dead star.", "No star knows your rank.", "Look up. Shrink happily."]   // SPACE
  ],
  [ // ISOLATION
    ["Alone, the air is all yours.", "A lone kite flies highest.", "Breathe your own air today."],   // AIR
    ["Swim out far. Come back wiser.", "Every island touches the sea.", "Send one message in a bottle."],   // WATER
    ["Caves keep the best echoes.", "Seeds grow alone in the dark.", "Dig in, quietly."],   // EARTH
    ["Clear the room. Keep yourself.", "The empty room is listening.", "Be alone on purpose."],   // EMPTINESS
    ["Lonely stars still shine.", "Distance is how orbits hold.", "Reach out across the gap."]   // SPACE
  ],
  [ // SPEED
    ["Fast talk is mostly air.", "Wind never waits to be sure.", "Decide before the breeze turns."],   // AIR
    ["Still water gets there too.", "Rush the river, miss the view.", "Swim with the current today."],   // WATER
    ["Run, but leave footprints.", "Mountains won the slow race.", "Walk somewhere you'd drive."],   // EARTH
    ["Hurry is a hole in the day.", "Running fills no hollow.", "Stop. Sit in the pause."],   // EMPTINESS
    ["Race the light. Lose kindly.", "Light is fast and still late.", "Slow down to go far."]   // SPACE
  ]
];
