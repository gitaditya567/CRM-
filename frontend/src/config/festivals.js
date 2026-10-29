// 🪔 Indian festivals → automatic festive theme (banner on top of every page, for every role)
//
// Each entry:  start / end  = days the festival is "on" (inclusive, YYYY-MM-DD, India time)
//              main          = the main day (countdown target), defaults to start
//              lead          = days before `start` to show "coming soon" with a countdown (0 = none)
//              days          = optional greeting per day inside a multi-day festival
//              theme         = key of FESTIVAL_THEMES below
//
// Lunar festivals change date every year — check each year's entries against the official
// holiday list and add the next year before it starts.

export const FESTIVALS = [
    // ---------- 2026 ----------
    { key: "karwa-chauth-2026", name: "Karwa Chauth", start: "2026-10-29", theme: "karwa", greeting: "Karwa Chauth ki hardik shubhkamnayein — chaand jaldi nikle!" },
    {
        key: "diwali-2026", name: "Diwali", start: "2026-11-06", end: "2026-11-11", main: "2026-11-08", lead: 14, theme: "diwali",
        greeting: "Shubh Deepavali — aapke ghar roshni, khushiyaan aur samriddhi aaye!",
        days: {
            "2026-11-06": "Shubh Dhanteras — sukh, samriddhi aur arogya ki shubhkamnayein!",
            "2026-11-07": "Chhoti Diwali ki shubhkamnayein!",
            "2026-11-08": "Shubh Deepavali — aapke ghar roshni, khushiyaan aur samriddhi aaye!",
            "2026-11-09": "Govardhan Puja ki hardik shubhkamnayein!",
            "2026-11-10": "Bhai Dooj ki hardik shubhkamnayein!",
            "2026-11-11": "Bhai Dooj ki hardik shubhkamnayein!",
        }
    },
    { key: "chhath-2026", name: "Chhath Puja", start: "2026-11-15", end: "2026-11-16", lead: 3, theme: "diwali", greeting: "Chhath Puja ki hardik shubhkamnayein — Chhathi Maiya sabki manokamna poori karein!" },
    { key: "gurpurab-2026", name: "Guru Nanak Jayanti", start: "2026-11-24", lead: 3, theme: "festive", greeting: "Guru Nanak Jayanti ki lakh lakh vadhaiyan!" },
    { key: "christmas-2026", name: "Christmas", start: "2026-12-24", end: "2026-12-25", main: "2026-12-25", lead: 7, theme: "christmas", greeting: "Merry Christmas — joy, peace and warm wishes from Team TeamInspire!" },
    { key: "new-year-2027", name: "New Year", start: "2026-12-31", end: "2027-01-01", main: "2027-01-01", lead: 5, theme: "newyear", greeting: "Happy New Year 2027 — naya saal, nayi umang, nayi safalta!" },

    // ---------- 2027 (fixed dates) ----------
    { key: "lohri-2027", name: "Lohri", start: "2027-01-13", theme: "festive", greeting: "Lohri di lakh lakh vadhaiyan!" },
    { key: "sankranti-2027", name: "Makar Sankranti", start: "2027-01-14", lead: 2, theme: "festive", greeting: "Makar Sankranti, Pongal aur Uttarayan ki shubhkamnayein — patang oonchi udti rahe!" },
    { key: "republic-2027", name: "Republic Day", start: "2027-01-26", lead: 3, theme: "national", greeting: "Gantantra Diwas ki hardik shubhkamnayein — Jai Hind!" },
    { key: "baisakhi-2027", name: "Baisakhi", start: "2027-04-14", lead: 2, theme: "festive", greeting: "Baisakhi di lakh lakh vadhaiyan!" },
    { key: "independence-2027", name: "Independence Day", start: "2027-08-15", lead: 3, theme: "national", greeting: "Swatantrata Diwas ki hardik shubhkamnayein — Jai Hind!" },
    { key: "gandhi-2027", name: "Gandhi Jayanti", start: "2027-10-02", theme: "national", greeting: "Gandhi Jayanti par Bapu ko shat shat naman." },
    { key: "christmas-2027", name: "Christmas", start: "2027-12-24", end: "2027-12-25", main: "2027-12-25", lead: 7, theme: "christmas", greeting: "Merry Christmas — joy, peace and warm wishes from Team TeamInspire!" },

    // ---------- 2027 (lunar — VERIFY these dates against the official 2027 holiday list) ----------
    { key: "holi-2027", name: "Holi", start: "2027-03-22", lead: 7, theme: "holi", greeting: "Holi ki rangon bhari shubhkamnayein — bura na mano, Holi hai!" },
    { key: "eid-ul-fitr-2027", name: "Eid ul-Fitr", start: "2027-03-10", lead: 2, theme: "eid", greeting: "Eid Mubarak — khushiyaan aur barkat aapke saath rahe!" },
    { key: "raksha-bandhan-2027", name: "Raksha Bandhan", start: "2027-08-17", lead: 5, theme: "festive", greeting: "Raksha Bandhan ki hardik shubhkamnayein!" },
    { key: "janmashtami-2027", name: "Janmashtami", start: "2027-08-25", lead: 3, theme: "festive", greeting: "Shri Krishna Janmashtami ki hardik shubhkamnayein — Jai Shri Krishna!" },
    { key: "ganesh-2027", name: "Ganesh Chaturthi", start: "2027-09-04", lead: 3, theme: "festive", greeting: "Ganesh Chaturthi ki shubhkamnayein — Ganpati Bappa Morya!" },
    { key: "dussehra-2027", name: "Dussehra", start: "2027-10-09", lead: 5, theme: "diwali", greeting: "Vijayadashami ki hardik shubhkamnayein — buraai par achchhai ki jeet!" },
    { key: "karwa-chauth-2027", name: "Karwa Chauth", start: "2027-10-18", theme: "karwa", greeting: "Karwa Chauth ki hardik shubhkamnayein — chaand jaldi nikle!" },
    { key: "diwali-2027", name: "Diwali", start: "2027-10-27", end: "2027-10-31", main: "2027-10-29", lead: 14, theme: "diwali", greeting: "Shubh Deepavali — aapke ghar roshni, khushiyaan aur samriddhi aaye!" },
];

// Colours + decorations per theme. Text stays white on every gradient (all are dark enough).
export const FESTIVAL_THEMES = {
    diwali: {
        bg: "from-amber-700 via-orange-600 to-rose-700",
        marquee: "from-amber-700 via-orange-600 to-rose-700",
        bulbs: ["#fde047", "#fb923c", "#f43f5e", "#facc15"],
        decor: ["🪔", "✨", "🎆", "🪔"],
    },
    karwa: {
        bg: "from-rose-800 via-red-700 to-pink-700",
        marquee: "from-rose-800 via-red-700 to-pink-700",
        bulbs: ["#fde68a", "#fbcfe8", "#fca5a5", "#fef3c7"],
        decor: ["🌙", "🪔", "✨", "🌙"],
    },
    holi: {
        bg: "from-fuchsia-700 via-violet-700 to-sky-700",
        marquee: "from-fuchsia-700 via-violet-700 to-sky-700",
        bulbs: ["#f472b6", "#facc15", "#4ade80", "#60a5fa"],
        decor: ["🎨", "💦", "🌈", "🎨"],
    },
    national: {
        bg: "from-orange-600 via-slate-700 to-green-700",
        marquee: "from-orange-600 via-slate-700 to-green-700",
        bulbs: ["#fb923c", "#ffffff", "#4ade80", "#ffffff"],
        decor: ["🇮🇳", "✨", "🇮🇳", "✨"],
    },
    christmas: {
        bg: "from-red-700 via-rose-700 to-emerald-800",
        marquee: "from-red-700 via-rose-700 to-emerald-800",
        bulbs: ["#f87171", "#4ade80", "#fde047", "#ffffff"],
        decor: ["🎄", "⭐", "❄️", "🎁"],
    },
    newyear: {
        bg: "from-indigo-800 via-violet-700 to-fuchsia-700",
        marquee: "from-indigo-800 via-violet-700 to-fuchsia-700",
        bulbs: ["#fde047", "#c4b5fd", "#f0abfc", "#ffffff"],
        decor: ["🎉", "✨", "🎆", "🥳"],
    },
    eid: {
        bg: "from-emerald-800 via-teal-700 to-cyan-800",
        marquee: "from-emerald-800 via-teal-700 to-cyan-800",
        bulbs: ["#fde047", "#a7f3d0", "#ffffff", "#fde68a"],
        decor: ["🌙", "⭐", "✨", "🕌"],
    },
    festive: {
        bg: "from-orange-700 via-amber-600 to-yellow-700",
        marquee: "from-orange-700 via-amber-600 to-yellow-700",
        bulbs: ["#fde047", "#fb923c", "#ffffff", "#fca5a5"],
        decor: ["🎊", "✨", "🌼", "🎊"],
    },
};

// ---------- date helpers (India time) ----------
const todayIST = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/**
 * What to celebrate today.
 * @returns {{ active: object|null, upcoming: { festival: object, days: number }|null, today: string }}
 *   active   — festival running today (with `greetingToday`), first match wins
 *   upcoming — nearest festival starting within its `lead` days (countdown to its main day)
 */
export const festivalForToday = (today = todayIST()) => {
    let active = null;
    let upcoming = null;
    for (const f of FESTIVALS) {
        const end = f.end || f.start;
        if (!active && today >= f.start && today <= end) {
            active = { ...f, greetingToday: f.days?.[today] || f.greeting };
            continue;
        }
        const main = f.main || f.start;
        const untilStart = dayDiff(today, f.start);
        if (untilStart > 0 && untilStart <= (f.lead || 0)) {
            const days = dayDiff(today, main);
            if (!upcoming || days < upcoming.days) upcoming = { festival: f, days };
        }
    }
    return { active, upcoming, today };
};
