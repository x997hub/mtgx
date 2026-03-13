# MTGx — Presentation for Club Owners

---

## What is it

MTGx is a platform for coordinating MTG games. It helps players find games and clubs fill their tables. Works as a phone app (PWA), sign in with Google in one tap.

Address: **mtgx.app**

---

## What already works

### For players

**Sign up in a minute.** Link in WhatsApp → sign in with Google → city, formats, schedule → event feed. No passwords or forms.

**Profile.** Name, avatar (upload your own photo or auto-imported from Google), city, formats (Pauper / Commander / Standard / Draft), availability schedule (morning/day/evening by weekday), WhatsApp for contact, car access, interest in card trading.

**Event feed.** All upcoming games with filters by format and city. Each card shows: format, time, venue, how many signed up, spots remaining. Circular fill chart.

**Online and hybrid events.** Three modes: in-person, online, hybrid. Supported platforms: SpellTable, MTGO, MTG Arena, Discord, Zoom. Join link right on the event card.

**RSVP.** Three options: going / maybe / not going. Counter updates instantly for everyone. When full — automatic waitlist with queue position. Spot opens up — the first in queue gets a push and is automatically moved to attendees.

**"Looking for Game" (LFG).** "I'm free right now" button — choose a format and duration (1-5 hours). Signal visible to everyone in the city. When 3+ people tap — prompt to "Create a meetup?". Replaces the 45-minute WhatsApp thread "who's playing today?".

**Mood tags.** Each event shows: casual / competitive / deck testing / teaching. Players know what to expect.

**Proxy policy.** Events indicate: no proxies / partial / fully allowed. Eliminates common questions.

**Commander Brackets.** When signing up for a Commander event, players indicate deck power level (1-5). The organizer sees the distribution at the table before the game starts. Solves Commander's main problem — power level mismatch.

**Subscriptions.** Three types: to an organizer, to a club, to a format+city. One notification per event, no duplicates.

**Smart game matching.** Set up once: which formats, which event types (tournaments/meetups), schedule by day (morning/evening), search radius (my city/nearby/all), max notifications per day. You only get a push when a matching game appears.

**Invite system.** Organizers see recommended players (matching format, city, availability) and invite with one button. Players can invite each other directly. Flexible privacy settings: accept from everyone / only those you've played with / only from your clubs / nobody. "Do Not Disturb" mode with timer.

**QR Check-in.** Organizer shows QR on their phone, players scan — confirmation of actual attendance. This feeds the reliability rating.

**Reliability rating.** Automatic calculation: how many times signed up and actually showed up. Visible only to organizers. No penalties — just information for planning.

**WhatsApp sharing.** Button on any event — generates a message with title, format, date, venue, and link. One tap — into the chat.

**Feedback.** "Report a problem" button from any screen. Bug, suggestion, or question — goes straight to admin panel.

**Dark and light theme.** Toggle in settings.

### For organizers

**Two event types.** Tournament (full form: title, format, date, venue, min/max players, fee, description) and quick meetup (format, when, where — in 10 seconds, expires after 24 hours).

**Templates for recurring events.** Create a template "every Thursday Pauper" with weekday selection and end date. Clone with one button — all fields pre-filled, just change the date.

**Cancel event.** One button with confirmation — all signed up (going / maybe / waitlist) get a push about the cancellation.

**Messages to attendees.** Write to all RSVPs right from the app: "starting later", "need 1 more player", "location changed". Push + in-app message.

**Organizer reputation.** Stats: how many events hosted, cancellation rate, average attendance. Visible on profile — players see if it's worth going.

**Recommendations on creation.** After creating an event, the platform shows a list of matching players. Checkboxes, one button — invites sent.

### For clubs

**Club page.** Logo, description, photo gallery with full-size viewer. Name, address, working hours, capacity, supported formats. "Subscribe" button — players get notifications about all club events.

**Contacts.** Structured contacts with clickable links: website, phone, WhatsApp group, Facebook, Instagram. Everything in one place.

**"How to find us" section.** Interactive map with club marker. "Open in Google Maps" and "Open in Waze" buttons. Text directions, nearby landmarks. Separate entrance and area photos — so a new guest can find the door.

**Club map.** All clubs on an interactive map with markers. Automatically shows nearest by geolocation. Click a marker → go to the club page.

**Analytics.** Unique players per month, popular formats by day, peak days, retention (who came back). Data the club never had before.

**All events in one place.** Both tournaments and spontaneous meetups — visible on the club page. Clear what's happening and when.

### Admin panel

Separate section with navigation. Dashboard with three zones: today's alerts (inactive organizers, stale LFG signals), weekly metrics (new users, activation rate, events, RSVPs, LFG conversion, silent exits), 14-day trends. User role management (email + WhatsApp link), mood tag editing, bug report handling.

### Languages

English, Russian, and Hebrew. Toggle in settings, auto-detection on first sign in.

---

## What's planned

### Near-term

**Automatic recurring event generation.** Templates can already be created — automatic instance creation on schedule is in development.

**Attendance confirmation.** Push 24 hours and 3 hours before start: "are you still coming?". One button. Organizer sees who confirmed and who didn't. No penalties.

**Player recruitment.** 48 hours before an event with 1-2 spots left — automatic push to matching players.

**Quick messages.** Templates for organizers: "Event confirmed!", "2 spots left", "Location changed" — send with one tap.

**Sharing cards.** Event link in WhatsApp displays with a beautiful image (format, date, venue, fill rate). After the event — summary card "8 players, Pauper, Rotemz" for sharing.

**Play style profile.** Mini-survey: casual/competitive, speed, sociability. Helps find matching players.

### Mid-term

**Experience points (XP) and levels.** Players earn XP for attending events, organizing, inviting friends. Levels from Squire to Eternal. Badges on profile. Motivation through progress, not punishment.

**Achievements.** "First game", "5 events in a month", "Visited 3 clubs", "Organizer" — automatic profile badges.

**Referral system.** Invite a friend — XP for both. Built-in viral growth.

**Club calendar.** Weekly/monthly view: tournaments, meetups, free slots. Time reservation for tournaments — so spontaneous meetups don't overlap.

**Club rankings.** Public leaderboard by activity and attendance. Friendly competition.

### Long-term

**Leagues and seasons.** 2-4 week leagues with standings. Keeps players engaged — they come back to finish the season.

**Game utilities.** Life counter (Commander with commander damage tracking), first player randomizer. Player doesn't leave to another app.

**WhatsApp/Telegram bot.** Commands from chat: /events today, /lfg pauper. Growth without convincing people to install the app.

**Carpooling.** "Driving from Tel Aviv, have seats" / "Looking for a ride" on the event page.

**Club subscription (Pro).** Advanced analytics, priority listing, branded events, loyalty program (points for visits → prizes).

**RTL interface.** Full Right-to-Left support for Hebrew.

**Native app.** Phone icon, push without limitations.

---

## What this gives the club

**More players at events.** The platform finds matching people and notifies them automatically. The organizer doesn't need to manually call WhatsApp contacts.

**Fewer no-shows.** QR check-in, reliability rating, 24-hour confirmation — the organizer knows who's actually coming.

**Data.** Analytics: who attends, which formats are popular, which days peak. Used to be in the organizer's head, now — in numbers.

**New player acquisition.** Players find the club through the map, events, subscribe, and come. Every WhatsApp share — free advertising with a link to the club.

**Professional page.** Logo, gallery, contacts, map, directions — the club looks serious. A new player immediately understands what the place is and how to get there.

**Zero routine.** Event templates, cloning, quick messages — the organizer spends a minute instead of half an hour.

---

## For players — free forever

No penalties, restrictions, or paid features. Motivation through XP and achievements, not punishment. The more you play — the cooler your profile.

---

*MTGx — less messaging, more games.*
*mtgx.app*
