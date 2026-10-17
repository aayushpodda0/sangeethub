/**
 * Demo catalog. Everything here is FICTIONAL - invented artists, albums and titles - so the repo
 * ships no copyrighted names or music. Pure data (no Prisma runtime import) so it can be unit-tested.
 *
 * Audio: the demo previews are short royalty-free sample clips. `durationSeconds` is set to each
 * clip's real length so the list, player, party progress bar and listening stats all agree.
 * To use longer audio later, change `PREVIEW_CLIPS` and rerun `npm run db:seed` (the seed updates
 * catalog rows in place).
 */

export type LanguageName =
  | "HINDI" | "MARATHI" | "TAMIL" | "TELUGU" | "BENGALI" | "MALAYALAM" | "KANNADA" | "PUNJABI" | "ENGLISH";

export const PREVIEW_CLIPS = [
  { url: "https://samplelib.com/lib/preview/mp3/sample-3s.mp3", seconds: 3 },
  { url: "https://samplelib.com/lib/preview/mp3/sample-6s.mp3", seconds: 6 },
  { url: "https://samplelib.com/lib/preview/mp3/sample-9s.mp3", seconds: 9 },
] as const;

export const GENRES = [
  { name: "Indie Fusion", slug: "indie-fusion" },
  { name: "Acoustic Pop", slug: "acoustic-pop" },
  { name: "Electro Pop", slug: "electro-pop" },
  { name: "Lo-fi", slug: "lo-fi" },
  { name: "Folk Fusion", slug: "folk-fusion" },
  { name: "Hip-Hop", slug: "hip-hop" },
  { name: "Indie Rock", slug: "indie-rock" },
  { name: "Ambient", slug: "ambient" },
  { name: "Classical Fusion", slug: "classical-fusion" },
  { name: "Sufi", slug: "sufi" },
  { name: "Bhangra", slug: "bhangra" },
  { name: "Dance Pop", slug: "dance-pop" },
  { name: "Jazz", slug: "jazz" },
] as const;

export type ArtistSeed = {
  slug: string;
  name: string;
  bio: string;
  city: string;
  region: string;
  popularity: number;
  isIndependent: boolean;
  imageUrl: string;
};

export type TrackSeed = {
  title: string;
  slug: string;
  genre: string;
  language: LanguageName;
  moods: string[];
  activities: string[];
  tempo: number;
  popularity: number;
  artist: string;
  featuring: string[];
};

export type AlbumSeed = {
  slug: string;
  title: string;
  artist: string;
  language: LanguageName;
  releasedDaysAgo: number;
  popularity: number;
  description: string;
  artworkUrl: string;
  tracks: TrackSeed[];
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const artist = (
  slug: string, name: string, city: string, region: string, popularity: number, isIndependent: boolean,
  bio: string, imageName = `artist-${slug}`,
): ArtistSeed => ({ slug, name, bio, city, region, popularity, isIndependent, imageUrl: `/artwork/${imageName}.svg` });

type TrackOpts = { lang?: LanguageName; artist?: string; feat?: string[] };
const album = (
  slug: string, title: string, artistSlug: string, language: LanguageName, releasedDaysAgo: number,
  popularity: number, description: string,
  rows: [title: string, genre: string, moods: string, activities: string, tempo: number, popularity: number, opts?: TrackOpts][],
  artworkName = slug,
): AlbumSeed => ({
  slug, title, artist: artistSlug, language, releasedDaysAgo, popularity, description,
  artworkUrl: `/artwork/${artworkName}.svg`,
  tracks: rows.map(([t, genre, moods, activities, tempo, pop, opts]) => ({
    title: t,
    slug: slugify(t),
    genre,
    language: opts?.lang ?? language,
    moods: moods.split(" "),
    activities: activities.split(" "),
    tempo,
    popularity: pop,
    artist: opts?.artist ?? artistSlug,
    featuring: opts?.feat ?? [],
  })),
});

export const ARTISTS: ArtistSeed[] = [
  artist("nadiya-wave", "Nadiya Wave", "Pune", "Maharashtra", 72, true, "Independent ambient artist blending Indian classical and modern textures.", "artist-nadiya"),
  artist("arivu-axis", "Arivu Axis", "Chennai", "Tamil Nadu", 69, true, "Fictional multilingual songwriter from Chennai.", "artist-arivu"),
  artist("kabir-dhun", "Kabir Dhun", "Mumbai", "Maharashtra", 78, true, "Mumbai indie-fusion producer layering tabla loops over synth pads."),
  artist("saanjh-collective", "Saanjh Collective", "New Delhi", "Delhi", 70, true, "Lo-fi collective making evening-drive music about city dusk."),
  artist("sahyadri-strings", "Sahyadri Strings", "Kolhapur", "Maharashtra", 64, true, "Folk-fusion trio rebuilding Marathi lavani rhythms with acoustic strings."),
  artist("tarang-trio", "Tarang Trio", "Nashik", "Maharashtra", 58, true, "Jazz-leaning trio with Marathi lyrics and a late-night club sound."),
  artist("kaveri-beats", "Kaveri Beats", "Madurai", "Tamil Nadu", 73, false, "Percussion-driven dance-pop with temple-festival energy."),
  artist("godavari-groove", "Godavari Groove", "Vijayawada", "Andhra Pradesh", 76, true, "Hip-hop duo trading Telugu verses over south-coast funk."),
  artist("lahari-lane", "Lahari Lane", "Hyderabad", "Telangana", 61, true, "Soft acoustic singer-songwriter with a ghazal-influenced voice."),
  artist("padma-pulse", "Padma Pulse", "Kolkata", "West Bengal", 68, true, "Indie-rock band chasing river-city nostalgia in Bengali."),
  artist("baul-bloom", "Baul Bloom", "Shantiniketan", "West Bengal", 55, true, "Contemporary baul folk with electronic textures."),
  artist("kayal-kites", "Kayal Kites", "Kochi", "Kerala", 66, true, "Backwater-inspired ambient pop, produced in a houseboat studio."),
  artist("thira-tales", "Thira Tales", "Kozhikode", "Kerala", 52, true, "Story-driven acoustic songs about the Malabar coast."),
  artist("malnad-monsoon", "Malnad Monsoon", "Shivamogga", "Karnataka", 62, true, "Rain-soaked indie rock from the Western Ghats."),
  artist("hampi-harmony", "Hampi Harmony", "Ballari", "Karnataka", 57, false, "Classical-fusion ensemble pairing veena with live electronics."),
  artist("phulkari-funk", "Phulkari Funk", "Chandigarh", "Punjab", 80, false, "Modern bhangra with funk bass lines and brass."),
  artist("sarson-sound", "Sarson Sound", "Ludhiana", "Punjab", 63, true, "Mellow Punjabi folk and sufi-pop recorded in a farmhouse."),
  artist("goa-gold-hour", "Goa Gold Hour", "Panaji", "Goa", 71, true, "Sunset-chasing acoustic pop with surf-rock guitars."),
  artist("neon-chai", "Neon Chai", "Bengaluru", "Karnataka", 77, true, "Synth-pop duo making upbeat tracks for commutes and late nights."),
];

export const ALBUMS: AlbumSeed[] = [
  album("sunset-sessions-vol-1", "Sunset Sessions Vol. 1", "nadiya-wave", "HINDI", 270, 75,
    "Fictional demo album for SangeetHub development and testing.", [
      ["City Lights Raag", "indie-fusion", "RELAX CALM", "STUDY MEDITATION", 92, 74, { artist: "nadiya-wave" }],
      ["Morning Filter Coffee", "acoustic-pop", "HAPPY FOCUS", "CODING COMMUTE", 106, 66, { lang: "TAMIL", artist: "arivu-axis" }],
      ["Monsoon Metro", "electro-pop", "TRAVEL ENERGETIC", "COMMUTE RUNNING", 120, 81, { lang: "ENGLISH", artist: "nadiya-wave" }],
    ], "sunset-sessions"),
  album("tabla-tides", "Tabla Tides", "kabir-dhun", "HINDI", 21, 76, "Tabla loops, warm synths and the rhythm of the Mumbai local.", [
    ["Chalte Raho", "indie-fusion", "ENERGETIC TRAVEL", "COMMUTE RUNNING", 118, 79],
    ["Mumbai Local Dreams", "indie-fusion", "TRAVEL HAPPY", "COMMUTE", 104, 72],
    ["Neend Ka Rang", "ambient", "SLEEP CALM", "SLEEPING MEDITATION", 68, 58],
  ]),
  album("golden-hour-drive", "Golden Hour Drive", "saanjh-collective", "HINDI", 9, 71, "Lo-fi beats for the drive home as the city turns gold.", [
    ["Dilli Ki Shaam", "lo-fi", "RELAX CALM", "STUDY COMMUTE", 84, 74],
    ["Chai Aur Baarish", "lo-fi", "RELAX HAPPY", "STUDY CODING", 78, 69],
    ["Raat Ki Dhun", "lo-fi", "SAD CALM", "SLEEPING STUDY", 72, 61],
  ]),
  album("lavani-reborn", "Lavani Reborn", "sahyadri-strings", "MARATHI", 140, 66, "Traditional lavani rhythms, rebuilt on acoustic strings.", [
    ["Dholki Dhun", "folk-fusion", "PARTY HAPPY", "CELEBRATION", 132, 67],
    ["Ghat Ghat Vaat", "folk-fusion", "TRAVEL ENERGETIC", "COMMUTE RUNNING", 118, 63],
    ["Pavsachi Gaani", "acoustic-pop", "RELAX HAPPY", "YOGA STUDY", 90, 60],
  ]),
  album("late-night-nashik", "Late Night Nashik", "tarang-trio", "MARATHI", 60, 56, "Smoky jazz for after-midnight listening.", [
    ["Godavari Ghat", "jazz", "CALM SAD", "STUDY SLEEPING", 76, 55],
    ["Nashik Nights", "jazz", "RELAX CALM", "STUDY", 88, 57],
    ["Sutradhar", "jazz", "FOCUS CALM", "STUDY CODING", 96, 52],
  ]),
  album("temple-festival", "Temple Festival", "kaveri-beats", "TAMIL", 14, 74, "Big drums, brass and festival-night dance floors.", [
    ["Urumi Melam", "dance-pop", "PARTY ENERGETIC", "CELEBRATION GYM", 128, 78],
    ["Madurai Midnight", "electro-pop", "PARTY HAPPY", "CELEBRATION", 124, 75],
    ["Kaapi Kadhai", "acoustic-pop", "HAPPY RELAX", "COMMUTE", 96, 66],
  ]),
  album("marina-sketches", "Marina Sketches", "arivu-axis", "TAMIL", 35, 69, "Quick sketches of life along the Chennai seafront.", [
    ["Marina Kaatru", "acoustic-pop", "CALM RELAX", "YOGA STUDY", 82, 68],
    ["Signal Mazhai", "indie-fusion", "TRAVEL HAPPY", "COMMUTE CODING", 110, 64],
    ["Tea Stall Theory", "indie-fusion", "FOCUS HAPPY", "CODING STUDY", 100, 62],
  ]),
  album("south-coast-cypher", "South Coast Cypher", "godavari-groove", "TELUGU", 18, 77, "Telugu bars over coastal funk.", [
    ["Konaseema Flow", "hip-hop", "ENERGETIC PARTY", "GYM RUNNING", 140, 80, { feat: ["lahari-lane"] }],
    ["Bezawada Beats", "hip-hop", "ENERGETIC", "GYM", 146, 76],
    ["Palle Pilla", "folk-fusion", "HAPPY", "CELEBRATION COMMUTE", 112, 70],
  ]),
  album("hyderabad-hush", "Hyderabad Hush", "lahari-lane", "TELUGU", 50, 61, "Quiet songs for slow evenings in the old city.", [
    ["Charminar Chaaya", "acoustic-pop", "RELAX CALM", "STUDY MEDITATION", 80, 62],
    ["Ghazal Gulabi", "sufi", "SAD CALM", "SLEEPING", 70, 58],
    ["Biryani Break", "acoustic-pop", "HAPPY", "COMMUTE", 98, 55],
  ]),
  album("river-city-radio", "River City Radio", "padma-pulse", "BENGALI", 28, 69, "Indie rock for tram rides and rainy afternoons.", [
    ["Hooghly Haat", "indie-rock", "ENERGETIC TRAVEL", "COMMUTE RUNNING", 126, 70],
    ["Tram Line Tales", "indie-rock", "HAPPY TRAVEL", "COMMUTE", 114, 68],
    ["Brishti Bikel", "acoustic-pop", "SAD RELAX", "STUDY", 86, 66],
  ]),
  album("ektara-electric", "Ektara Electric", "baul-bloom", "BENGALI", 75, 54, "Baul folk, plugged in.", [
    ["Mati Mon", "folk-fusion", "CALM", "MEDITATION YOGA", 74, 54],
    ["Ektara Dub", "electro-pop", "TRAVEL ENERGETIC", "RUNNING", 118, 52],
    ["Poush Mela Pulse", "folk-fusion", "HAPPY PARTY", "CELEBRATION", 122, 56],
  ]),
  album("houseboat-sessions", "Houseboat Sessions", "kayal-kites", "MALAYALAM", 11, 67, "Recorded on the backwaters, mixed at sunrise.", [
    ["Kayal Kaatu", "ambient", "CALM SLEEP", "SLEEPING MEDITATION", 62, 67],
    ["Chenda Sunrise", "electro-pop", "HAPPY ENERGETIC", "RUNNING GYM", 122, 66],
    ["Thengu Thoppu", "acoustic-pop", "RELAX HAPPY", "YOGA STUDY", 88, 62],
  ]),
  album("malabar-letters", "Malabar Letters", "thira-tales", "MALAYALAM", 95, 52, "Songs written like postcards from the Malabar coast.", [
    ["Beypore Sandhya", "acoustic-pop", "SAD CALM", "STUDY", 78, 51],
    ["Pazhaya Postcard", "acoustic-pop", "RELAX", "COMMUTE", 84, 49],
    ["Kozhikode Kaapi", "folk-fusion", "HAPPY", "COMMUTE", 100, 53],
  ]),
  album("ghat-road-anthems", "Ghat Road Anthems", "malnad-monsoon", "KANNADA", 33, 63, "Guitars and thunder from the Western Ghats.", [
    ["Malenadu Male", "indie-rock", "ENERGETIC TRAVEL", "COMMUTE RUNNING", 128, 64],
    ["Jog Falls Jam", "indie-rock", "PARTY HAPPY", "CELEBRATION", 134, 60],
    ["Mist and Chai", "ambient", "CALM FOCUS", "STUDY CODING", 70, 59],
  ]),
  album("veena-voltage", "Veena Voltage", "hampi-harmony", "KANNADA", 120, 57, "Ancient instruments meet live electronics.", [
    ["Vijayanagara Voltage", "classical-fusion", "FOCUS CALM", "STUDY CODING", 90, 58],
    ["Tungabhadra Taal", "classical-fusion", "FOCUS", "STUDY MEDITATION", 84, 55],
    ["Stone Chariot", "classical-fusion", "ENERGETIC TRAVEL", "RUNNING", 116, 56],
  ]),
  album("brass-bhangra", "Brass Bhangra", "phulkari-funk", "PUNJABI", 7, 80, "Dhol, brass and a very funky bass line.", [
    ["Dhol Da Funk", "bhangra", "PARTY ENERGETIC", "GYM CELEBRATION", 130, 84, { feat: ["sarson-sound"] }],
    ["Sarson Sunrise", "bhangra", "HAPPY ENERGETIC", "RUNNING", 124, 79],
    ["Chandigarh Cruise", "dance-pop", "TRAVEL HAPPY", "COMMUTE", 112, 74],
  ]),
  album("farmhouse-tapes", "Farmhouse Tapes", "sarson-sound", "PUNJABI", 160, 63, "Recorded live on a farm, one take per song.", [
    ["Khet Di Shaam", "sufi", "CALM RELAX", "MEDITATION YOGA", 72, 64],
    ["Charkha Chill", "lo-fi", "RELAX", "STUDY CODING", 80, 60],
    ["Raavi Raatan", "sufi", "SAD CALM", "SLEEPING", 68, 58],
  ]),
  album("susegad-sunsets", "Susegad Sunsets", "goa-gold-hour", "ENGLISH", 5, 72, "Unhurried songs for the last hour of daylight.", [
    ["Anjuna Afterglow", "acoustic-pop", "RELAX HAPPY", "COMMUTE YOGA", 96, 73],
    ["Cashew Coast", "indie-rock", "HAPPY TRAVEL", "COMMUTE", 112, 70],
    ["Low Tide Lullaby", "ambient", "SLEEP CALM", "SLEEPING", 60, 62],
  ]),
  album("night-shift-synth", "Night Shift Synth", "neon-chai", "ENGLISH", 3, 77, "Synth-pop for commutes and late-night coding.", [
    ["Metro Moonlight", "electro-pop", "ENERGETIC TRAVEL", "COMMUTE RUNNING", 124, 79, { feat: ["kabir-dhun"] }],
    ["Chai Latte Lasers", "dance-pop", "PARTY HAPPY", "CELEBRATION GYM", 128, 76, { feat: ["goa-gold-hour"] }],
    ["Debug the Dark", "electro-pop", "FOCUS ENERGETIC", "CODING STUDY", 116, 72],
  ]),
];

export type PlaylistSeed = {
  slug: string;
  name: string;
  description: string;
  isCollaborative: boolean;
  coverUrl: string;
  /** Picks the top tracks (by popularity) that have any of these moods or activities. */
  matchMoods: string[];
  matchActivities: string[];
  limit: number;
};

export const PLAYLISTS: PlaylistSeed[] = [
  {
    slug: "focus-routes", name: "Focus Routes", isCollaborative: true, coverUrl: "/artwork/playlist-focus.svg",
    description: "A demo playlist focused on calm productivity sessions.",
    matchMoods: ["FOCUS"], matchActivities: ["STUDY", "CODING"], limit: 10,
  },
  {
    slug: "commute-mix", name: "Commute Mix", isCollaborative: false, coverUrl: "/artwork/playlist-commute-mix.svg",
    description: "Upbeat tracks across languages for the ride in.",
    matchMoods: ["TRAVEL"], matchActivities: ["COMMUTE"], limit: 10,
  },
  {
    slug: "regional-party-starters", name: "Regional Party Starters", isCollaborative: false,
    coverUrl: "/artwork/playlist-regional-party-starters.svg",
    description: "Dhol, brass and big choruses from every corner of India.",
    matchMoods: ["PARTY"], matchActivities: ["CELEBRATION"], limit: 10,
  },
];

export const ALL_TRACKS: (TrackSeed & { albumSlug: string })[] = ALBUMS.flatMap((a) =>
  a.tracks.map((t) => ({ ...t, albumSlug: a.slug })),
);
