# PENALTY PANIC 2

A self-contained, single-player arcade penalty game. The complete game runs offline with procedural Canvas art and Web Audio. No dependencies, build step, account or backend are required.

## Play

Use **Accounts** in the header or **Switch / Create Account** on the main menu to make up to 12 local player accounts. Choose a name and Boys or Girls, then select **Create & Play**. Each account has its own coins, XP, club, equipment, upgrades, settings, competitions and interrupted matches. The current account appears in the header and on the main menu. Your existing save becomes **Player 1** and can be renamed without losing progress.

Switching accounts saves the current match first; return to its account and choose **Resume Run** to continue. You can rename accounts and delete inactive accounts with confirmation. Settings export/import/reset applies only to the selected account. Accounts are saved in this browser, with no password, email, server login or automatic sync to other devices. To move progress, create an account in the other browser and import an exported save into it.

Choose **My Club → Play as → Girls / Boys**, then **Save Club & Kit**. The live squad preview shows your five players. Both teams use the selected player appearance and name pool in every mode, including existing competitions and resumed matches. Girls start with **Sophie Hart, Mia Bennett, Zoe Morgan, Ava Mercer and Ella Brooks**; boys keep the original squad below. Each selection keeps its squad names when switching back, and a custom shirt name remains on your striker. The choice is saved locally and does not change abilities, difficulty, collisions or rewards.

Matches now use **1 minute 45 seconds of active play**. Older interrupted matches resume with their remaining proportion of the shorter clock, keeping scores, player positions and the current phase. Deciding Champions League ties have two 17.5-second extra-time periods before penalties when needed. Aiming and save windows retain their existing durations.

**Max Vale** provides live match commentary for goals, saves, shots, passes, tackles, fouls and results. Captions appear above the pitch. Spoken lines use an available English voice installed on the device, with separate commentary volume, voice and caption toggles in Settings. Routine lines are throttled; major moments interrupt them, and pause, mute, hidden tabs or leaving the game cancel speech. No speech queue is replayed on reload. If a local voice is unavailable, captions still work. Implementation follows the browser [SpeechSynthesis API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) and checks [localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService) to avoid requiring a remote voice service.

Your saved starting five are **Jamie Hart, Leo Bennett, Kai Morgan, Alex Mercer and Theo Brooks**. An existing custom shirt name is kept for your striker. Each opposing club has its own five fictional names, consistent when facing that club again. Player names appear on the pitch, in celebrations and commentary, in the team sheets below the controls and on My Club. Names do not affect gameplay randomness. `commentary.test.cjs` tests roster persistence, escaped names, event identity, voice selection and interruption using a speech stub, settings, shortened fixtures and migration. Actual speaker output and browser/device layout remain unverified here.

Double-click **PLAY.cmd** on Windows. It checks the local server before opening the game.

An existing v1 server can keep serving the updated files at the same address, preserving the save origin. The launcher recognizes it. The hardened v2 server code takes effect on the next server start.

Or run `npm.cmd start` in PowerShell (`npm start` elsewhere), then open **http://localhost:4173**. Opening `index.html` directly also works; file and HTTP origins have separate saves. Node 18+ runs the server and unit tests. The optional browser test uses Node 22+ for its built-in WebSocket client.

## Controls

- **Five-a-side:** Quick Play, Career, Champions League and Premier League begin with one minute 45 seconds of playable football. Press **Kick Off**, Space or move to start. Move with **WASD / arrows**, **Q** passes, **E** switches player, **X** tackles and **Shift** sprints. Hold/release **Space** to open a **2.5-second first-person aiming window**. Pick the shot with a click/tap on the goal, WASD/arrows or the six corner buttons; change power with the slider. The ball fires automatically when the timer ends. Click or tap the pitch to choose an aim point; with match assists enabled, the first-person aim starts towards the corner away from the keeper. Manual targets always take priority. Touch movement, sprint and shooting can be held together. In the portrait view, attack upwards toward the gold goal. You can dribble around the goalkeeper and carry the ball over the goal line to score without shooting. Boards keep the ball in play outside the posts; this compact arcade format does not use throw-ins or offside.
- **Match clock:** 1 minute 45 seconds means 105 seconds of active play. First-person aiming, foul restarts, kickoff preparation, goal celebrations, pauses and hidden tabs do not consume playing time. A shot started before the whistle is allowed to settle. The clock, score, ball and player positions are saved. Full time opens a preparation screen; select **Start Penalty Shootout** or press Space/Enter to continue.
- **Penalty rules:** Quick Play and Career settle full-time ties with five initial kicks each, early clinching and paired sudden death. Premier League and Champions League league-phase games allow draws. A Champions League first leg also allows a draw; aggregate goals decide the return leg. Tied deciding ties play two 17.5-second extra-time halves, then penalties if still level. There is no away-goals rule. Existing eight-club cup saves retain their earlier rules.

- **Shoot:** click/tap the goal to lock your aim. Drag deliberately to move it; moving toward the Shoot button cannot change it. Hold Space or Shoot, then release. Arrow keys move the aim smoothly. Q/E changes curl and the visible selector together.
- **Shot style:** softer placed shots have a higher arc and forgiving power; driven shots are faster with a smaller control zone. Charge to **65% or more** for a fast, nearly straight shot that reaches the goal without dipping. Gravity stays active; the faster ball has less time to drop. The trajectory and projected landing marker use the same calculation as the ball. Overcharging can still send the shot off target.
- **Keeper:** A/D full left/right, Q/E short left/right, W high, S low. Combine height and direction in either order. Single keys dive on release. Z/C remain instant low-corner shortcuts. Arrow keys and the on-screen goal grid also work.
- **Alternative keeper preset:** choose direction, then press Space or Commit Dive. Select it in Settings.
- **Precise saves:** tap/click the exact point in the goal. The drawn hands and body are the collision areas, including standing blocks.
- **Dive motion:** low saves follow a downward dip; high saves reach up and flow straight into a landing. Jointed arms and legs follow the torso. There is no held mid-air pose. A timely commitment spreads the motion over the incoming flight; late dives still cannot move faster than the keeper's reach speed.
- **Player motion:** a 0.72-second approach uses jointed limbs with fixed lengths and alternating grounded steps. The support foot stays planted, the heel folds behind the knee, and the striking leg swings forward through contact without pausing at the ball. The hips advance, the shoulders turn, and the arms swing in depth with correct front/back layering. The striking foot lands after the follow-through; celebrations wait for it. Opponent run-ups fit their difficulty's existing read window. Animation follows simulation time, including pause and saved runs. Reduced motion removes idle swaying while preserving the kick. The portrait camera includes the full approach.
- **Escape:** pauses/resumes, including when a dropdown is focused. Settings and Help are available while paused.
- **Victory cutscene:** winning Quick Play or Career starts a 6.4-second celebration: the deciding ball finishes, the camera cuts to your club, teammates join and raise their arms, and confetti falls as the camera moves closer. Your club name, score, custom shirt and accessories carry through. **Skip Cutscene**, **Space**, **Enter** or **Esc** opens the results immediately. It also ends automatically. Settings or a hidden tab pauses it. Reduced motion shows a still celebration for two seconds, without camera movement or confetti.

## Easier matches and Clubhouse

Match assists start enabled, including for existing saves. Defenders run 20% slower, the player has more time on the ball after a reception, passing favours open forward teammates, close tackles are automatic, and sprinting lasts longer. Your keeper reacts faster while the opposing keeper has less time to read the shot. Turn assists off in Settings to restore the unassisted pace; Easy, Normal and Hard still have distinct opponents.

Both five-a-side goalkeepers now commit to physical dives, reach for the ball, land and recover. Saves check the moving body and glove positions. Dive progress is saved and freezes with the match.

Keepers carry a collected ball for 1.8 seconds before clearing, giving attackers time to close down. Press **X** or tap **Tackle** within reach to take possession; assisted close tackles work too. A successful tackle transfers the ball immediately and briefly stops the keeper reclaiming it. The carrying timer pauses with the match and survives reloads.

The 2.5-second shooting view now uses a perspective camera at the shooter's eyes, aimed between the posts. Goal size, the angle of the frame, pitch lines and visible defenders follow the player's actual location. Close shots use a wider field of view. Clicks and taps are projected back onto the goal plane, so the visible corner matches the physical shot; keyboard aiming and corner buttons keep working at every angle. The long-range shot map and flight preview remain available. Five new regression scenarios cover keeper tackles and follow-up goals, automatic clearances, pause/reload, camera geometry and desktop/portrait pointer aiming. Native Canvas recordings were reviewed; real-browser/device testing remains unverified.

Open **Clubhouse** from the main menu or locker room. Training Ground improves pass speed and control time; Recovery Suite reduces sprint drain and speeds recovery; Goalkeeper School adds dive distance. Each has three permanent tiers costing **90 / 150 / 210 coins**. Cards show the current and next effect; purchases apply to new five-a-side matches, persist after reload and never charge for an already purchased tier.

Regression coverage includes assist migration and switching, possession protection, automatic tackles, quick-tap finishing, diving saves and misses, continuous dive motion and restoration, facility purchases and duplicate protection, and the measured effect of all three facilities. Native static previews inspect both pitch orientations; real-browser layout, audio and touch hardware still need a browser pass.

## Fouls and goalkeeper distribution

Both five-a-side goalkeepers now kick a collected ball high and long upfield. The ball follows gravity, bounces and can be collected by either side.

Late, body-first challenges from behind or the side can cause fouls; clean ball contact stays a tackle. Inside the defending penalty area (including its lines), the attacking team gets a penalty. Outside, they get a direct free kick. A whistle and marked foul location lead to a restart. For a free kick, choose **Shoot Free Kick / Space** or **Pass to Teammate / Q**. Tap a teammate on the pitch first to choose the receiver, or let the game pick one. **Pass Instead / Q** also works during the aiming countdown and immediately returns to open play. Penalties use **Take Penalty / Space**. Shooting gives you 2.5 seconds to aim. Defenders wait outside the box for penalties. Opponent restarts run automatically with your goalkeeper defending. A goal adds to the 1 minute 45 second match score, not the end-of-match shootout. Play resumes after the goal, save, miss or rebound.

The aiming countdown, fouls, set pieces and kicked-ball physics are saved and pause with the game. The first-person view reuses the stadium and goal art with the foreground striker hidden. The camera returns to the pitch when the ball is struck. Regression tests cover desktop/touch aim handlers, the exact timer at three frame rates, high/low trajectories, pause/reload, clearances by both keepers, foul geometry and box boundaries, playable penalties, free kicks and opponent restarts. Browser layout and touch hardware still need a browser pass.

## Modes and progression

Quick Play uses one minute 45 seconds of five-a-side football. Only tied matches continue to five initial penalties per side, early clinching and paired sudden death. Pitch opponents move into space, press, pass and shoot. Goalkeepers move toward the predicted ball path and catch only within reach. Sprinting drains stamina, which recovers when released. Shots and passes travel physically, including interceptions, bounces, saves, misses and net crossings. Striker difficulty changes opposing pace, shot placement and shooting distance. The selected Rookie/Club/Elite keeper also affects the pitch goalkeeper's movement speed. Existing penalty AI retains its flight prediction and career tendencies.

The keeper challenge lasts ten shots and tracks saves, concessions, striker misses, streaks, medals and records by difficulty. Practice provides mixed shots, low corners, high saves, short dives, power training, adjustable speed, optional coverage markers and exact incoming-shot repeats. The skippable playable introduction teaches a goal, a low save and a short dive.

**Target Rush** is a 60-second shooting challenge. The timer starts on the first charge. A target is worth 60 points, its central bullseye 100, and a goal outside the target 10. Every third consecutive target hit increases the multiplier, up to x5. Targets relocate after each shot and shrink as you improve. Easy, Normal and Hard have distinct target sizes and separate saved records. The last shot released before the buzzer still counts. Pause and saved-run resume preserve the remaining time. Results include medals, combo statistics, coins and XP.

**Crossbar Circuit** gives you ten balls and a moving gold zone on the crossbar. Aim horizontally with the mouse, touch or left/right arrows. The target freezes when you release the shot. A bar hit scores 40 points; hitting the gold zone at 55–78% power scores 100 plus 25 for each additional consecutive gold hit, capped at a 100-point bonus. Gold zones get narrower through the circuit. Higher difficulties have smaller, faster zones. There is no goalkeeper. The ten-shot result includes medals, a saved score record, coins and XP. Pause and reload preserve the moving target's simulation time or its frozen position.

**Keeper Survival** starts with three lives. Only goals conceded cost a life; striker misses do not. Shots speed up every five attempts, with a maximum speed increase to retain a fair dive window. Play until the third concession or choose **Bank & Finish** between shots after making a save. Saves, streaks, waves and rewards appear in results. Records are saved separately for each difficulty. Both new modes are available immediately from the main menu and have six new objectives under the club board's **Arcade** filter.

Five career stages unlock sequentially, with first-win coin bonuses and three cosmetic gifts. XP levels unlock eight additional cosmetics and player titles. The locker room previews the same art used in the match, including animated celebrations and goal effects. Opponents use separate kits.

## Champions League, Premier League and trophies

The main menu has two separately saved competitions. Choose Easy, Normal or Hard and enter free with your club. Fixtures use 1 minute 45 second five-a-side football. League draws earn one point, wins three, losses zero. Match coins and XP are paid once; fixture records independently prevent duplicate rewards.

- **Premier League:** 20 original clubs, 38 home-and-away matchdays and all 380 fixtures. The table tracks played/won/drawn/lost, goals and points. Most points wins; the bottom three are shown as relegated. Win the season for **750 bonus coins / 300 XP** and a permanent title record.
- **Champions League:** 36 clubs; eight unique league opponents, four home/four away, one of each from every seeded pot. Top eight qualify directly for the round of 16, ranks 9?24 contest two-leg play-offs, 25?36 are eliminated. Play-offs, round of 16, quarters and semis have two legs. Aggregate scores decide the ties; the final is one neutral fixture. A level deciding tie plays both 17.5-second extra-time periods before penalties. Advance through a knockout tie for **80 bonus coins / 50 XP**, or win the final for **500 bonus coins / 300 XP**, a permanent title and the Champions Night kit.

Both competitions simulate other fixtures as each matchday completes. Eliminated clubs can see the eventual champion. The screens include standings, home/away fixtures, knockout results and in-game rules. Pause and resume preserve the current fixture, including aiming, celebrations, extra time and penalties. Only one unfinished match is stored at a time; starting another fixture replaces that unfinished match, while both campaigns' completed results stay saved. Restarting a campaign requires confirmation; the other competition and earned rewards are preserved.

**Arcade adaptations:** original clubs, five-a-side boards, no offside/throw-ins, fixed seeded knockout pairings, no national-association draw restrictions, and no domestic promotion/qualifying leagues. Premier League relegation is a season outcome, not a playable second division. Tables use points, goal difference and goals scored, then domestic head-to-head or Champions League away goals, wins, away wins and opponent-strength criteria. Initial seed resolves remaining equality instead of disciplinary/club-coefficient comparisons or a domestic tie-break playoff. Matchday home/away streak constraints are simplified.

Rules were checked against [UEFA's format explanation](https://www.uefa.com/news-media/news/0268-12157d69ce2d-9f011c70f6fa-1000--how-clubs-qualify-for-europe/), [2026/27 extra-time rules](https://documents.uefa.com/r/Regulations-of-the-UEFA-Champions-League-2026/27/Article-21-Knockout-system-extra-time-and-penalty-shoot-outs-Online), and [the Premier League's explanation](https://www.premierleague.com/en/news/58905).

Earlier eight-club cups remain playable through **Continue earlier cup** and retain their original rewards and trophy records. The Trophy Room also displays the two new competitions' titles. No accounts, downloads or real club assets are required.

## Shooting view, goal scenes and goalkeeper collection

The first-person aiming camera now renders actual players ahead of the taker, sorted by distance and wearing their match kits. Keepers retain their real position when they move out. A shared launch solution and fixed-step gravity/drag calculation drives both the dotted preview and the live shot. The goal-line ring predicts its arrival; defenders can intercept and the keeper can still save. Shots from 25 metres or more show an overhead shot map with the expected endpoint and first bounce, where applicable. A warning identifies a player in the predicted path; it is a frozen-position prediction, not a guaranteed outcome after defenders move.

Every scorer on either team gets a **2.5-second celebration cutscene** wearing their kit and number. Each of the ten players has a stable signature routine: captain salute, fist pumps, aeroplane, knee slide, heart, keeper roar, archer, overhead applause, heel-toe dance or sky point. Their arm joints have bounded lengths and move smoothly between poses. Equipped celebration cosmetics add a flourish after the signature. Match time pauses, reduced motion holds a still pose, and **Space / Enter / Skip celebration** returns to the match. Own goals celebrate the benefiting team with an own-goal caption. Penalty feedback also shows the scoring player celebrating; its Next button continues as before. End-of-match trophy/victory scenes remain skippable.

Both keepers come off the goal line to gather reachable loose balls inside their own penalty area, including wider parts of the box. They must reach the ball and cannot catch it by hand outside the area or above their reach. After gathering, they kick upfield. Fast incoming shots retain the timed dive behaviour.

## My Club and shirt designer

Open **My Club & Kit Designer** on the main menu, or **Design your kit** in the locker room. Set your team name (24 characters), scoreboard initials (4), shirt name (12), number (0–99) and one of three crest shapes. Your identity appears in the match HUD, stadium signage, profile and results. The foreground player wears your shirt name and number; the goalkeeper wears 1.

Create separate home, away and goalkeeper shirts with two colours, five patterns (plain, stripes, hoops, sash and halves), and six free presets. The front/back preview shares the match shirt renderer. Select Home or Away to choose your outfield strip; the keeper uses its own design. Editing colours or choosing a preset enables custom kits. **Save Club & Kit** stores the design; **Play a Match** saves and starts a shootout. Unsaved edits are labelled. Customisation costs no coins.

Equipping a Player kit or Keeper kit from the locker room switches to the purchased locker outfit. Your custom designs remain saved; enable **Wear my custom kits** in My Club to return to them. A new run captures your club identity, so renaming the club later does not change that run or its recorded result. Existing saves receive default club fields without losing purchases or coins.

The locker room also includes **15 wearable accessories** across Headband, Wrist tape, Undersleeves, Sock tape and Armband. Every category has a free wearable option and a free removal option; additional styles cost 70–150 coins. Headbands, wraps, sock tape and captain’s armbands appear on both your striker and goalkeeper. Undersleeves are worn under the striker’s short-sleeved shirt. The preview uses the match drawing, and equipment, purchases and removals survive reloading. **Save & Choose Accessories** in My Club preserves your kit draft before opening the accessory shop. Existing equipment IDs and balances are preserved when older saves gain the new categories.

The club board has **30 permanent challenges** across Finishing, Goalkeeping, Shootouts, Target Rush, Career and Arcade, with Club, Elite and Legend tiers. The original targets are now 30 goals, 25 saves, 20 completed shootouts, 10 wins, 3,000 Target Rush points, and all five career stages. Challenges include perfect shootout wins, clean sheets, comebacks after a paired round, sudden-death wins, five/ten consecutive victories, Hard striker + Elite keeper wins, 12/20-target combos, 5,000 points on Hard, eight consecutive Hard saves, and a perfect ten-save Hard challenge. Arcade adds accumulated bar hits, eight gold hits, a five-hit gold combo, 1,200 Crossbar points on Hard, ten Survival saves and twenty Survival saves on Hard. Rewards range from 120–500 coins and 80–325 XP.

Use **Challenges** on the main menu to jump to the board. Filter by mode or completed challenges; each unfinished card launches its mode with any required difficulty settings. Career cards respect stage unlocks. Skill counters update only when a run finishes. A shootout loss resets the current winning streak; other modes leave it unchanged. Best streaks persist. Earlier saved totals, records and career progress count, while newly introduced skill counters start with this update. Existing earned challenge rewards remain complete even when their targets have increased. Rewards are automatic, appear in the result breakdown, and cannot be paid twice. Practice, tutorial and unfinished runs do not count.

## Coins and save behaviour

Rewards: 20 coins per completed run, 8 per goal, 12 per save, 60 per shootout win, 25 per new achievement. Keeper challenge streaks add 15 coins per three consecutive saves (based on the best streak). Career first-win bonuses range from 100 to 180. Practice and the introduction award no currency.

1 minute 45 second matches add 8 coins and 12 XP per normal-time goal, plus 50 XP for completing the pitch phase. These rewards are committed with the final result, not at full time if penalties remain. Results distinguish normal-time and penalty goals and show both scores. Automated pitch-keeper saves do not generate player save rewards. Career stages and Champions League fixtures advance only when the complete match is decided.

Target Rush uses 20 completion coins, 2 coins per goal and 6 extra coins per target hit. Its score record and run count are separate from shootout wins and goalkeeper records. Rewards are committed once at the buzzer or when the final released ball arrives.

Crossbar Circuit awards 20 completion coins, 4 per crossbar hit and 8 extra per gold hit. XP is 35 for completion, 8 per bar hit and 12 extra per gold hit. It does not count bar hits as missed shootout penalties in your profile. Keeper Survival awards 20 completion coins, 12 per save and the same best-streak bonuses as the ten-shot keeper challenge. Both modes have separate records and run counters; neither changes shootout win streaks. Records and all rewards are committed once, at completion or when a Survival run is banked.

The deciding kick commits the result and rewards immediately; result buttons never award again. The last result is saved. Interrupted runs are checkpointed and can be resumed from the menu. Export/import is available in Settings with confirmation before replacing progress. Storage failures show a session-only status. Reset requires confirmation.

Victory rewards are stored before the cutscene begins. Skipping, watching it to the end or refreshing cannot claim a second reward. Reloading opens the normal menu with the saved Last Result; the cutscene does not replay. Losses and arcade drill completions retain their normal results flow.

Existing version-1 coins, purchases, equipment, upgrades, settings, achievements and career migrate to version 2 under the original localStorage key `penalty-panic-v1`. Unknown or malformed saves are preserved for export instead of being overwritten. Saves are local and editable, not a secure online economy.

## Architecture

| File | Responsibility |
| --- | --- |
| `catalog.js` | Cosmetics, opponents, difficulties and upgrade definitions |
| `tournament.js` | Seeded club draws, league fixtures and standings, knockout bracket, tournament validation and bonuses |
| `progression.js` | Save migration/validation, shootout rules, transactions and rewards |
| `storage.js` | Honest storage status, export/import and reset |
| `accounts.js` | Local account registry, separate save keys, migration, switching, validation and storage failure handling |
| `account-ui.js`, `accounts.css` | Account picker, creation, renaming, deletion confirmation and current account indicator |
| `simulation.js` | Fixed 120 Hz simulation, ballistic gravity, AI prediction, shared keeper poses and contact |
| `field.js` | Five-a-side movement, passing, shooting, tackling, teammate/opponent AI, ball collisions, match clock and validation |
| `field-view.js` | Cached full-pitch rendering, articulated running players, lighting and portrait camera rotation |
| `field-ui.js`, `field.css` | Live match HUD, touch controls, full-time preparation and score breakdowns |
| `player-motion.js` | Striker skeleton, grounded footfalls, joint lengths, depth projection and continuous swing timing |
| `renderer.js` | Uniform camera scaling, stadium, characters, flight, rebounds and previews |
| `input.js` | Pointer ownership, locked aim, smooth keyboard input and keeper presets |
| `audio.js` | Gesture-unlocked audio and cached crowd noise |
| `screens.js` | Menus, match HUD, controls, shop, career and results |
| `club-ui.js` | Club editor, kit controls, identity badges and challenge progress |
| `arcade-ui.js` | Arcade mode cards, HUDs, result summaries and saved record displays |
| `league-ui.js`, `league.css` | Legacy cup board, illustrated trophy room and shared tournament presentation |
| `competitions.js` | Seeded draws, schedules, standings, aggregate ties, results and save validation |
| `competition-ui.js`, `competition.css` | Champions League/Premier League screens, rules, fixtures and honours |
| `app.js` | Lifecycle, accessible dialogs, immediate result persistence and navigation |
| `server.cjs`, `launch.cjs` | Local server and readiness-checked Windows launcher |

The pre-review version is archived in `.backups/before-full-review.zip`. Runtime code does not use it.

## Verification

Run `npm.cmd test` and `npm.cmd run check` (use `npm` on other shells).

The simulation and DOM regression tests cover gravity endpoints and acceleration, strong shots with no downward dip, continuous dive poses and rotated body contact, standing blocks, full/short/high/low dives, early/late timing, 30/60/144 fps consistency, posts and misses, full sudden-death completion, immediate/deduplicated rewards, challenge accounting, practice repeats, transactions, migrations, malformed saves, resume, aim locking, pause/restart, keyboard/pointer handlers, settings focus and server error recovery.

Club regressions also cover free customisation through the real click/input handlers, validation, safe user text, saved home/away designs, shirt number zero, reload/resume, preserved historical team names, switching back to purchased kits, rendering all five patterns and one-time challenge payments. Native static render previews verify the custom shirts and their appearance on the pitch; these are not browser screenshots. The optional browser test includes desktop/mobile editor screenshots, mobile overflow and saved identity checks.

Expanded challenge checks cover difficulty requirements, clean-sheet and perfect-kick conditions, paired-round comebacks, sudden death, streak resets and reloads, final-career-opponent requirements, preserved earlier completions, filtering without losing an unsaved kit, and launch buttons applying the required AI settings.

`test-dom.cjs` is a small event/state harness; it does **not** validate CSS layout, native focus trapping, actual sound output or touch hardware.

`arcade.test.cjs` covers target movement and freezing, gold power requirements, scoring and misses, complete circuits, Survival lives and banking, faster waves, Hard objectives, records, save migration, malformed state, duplicate reward protection, menu actions, pause/resume, results and rematches. Native render previews also cover the crossbar marker and the longer shorts in the kick poses.

`victory.test.cjs` covers actual deciding saves, persistence before celebration, duplicate completion events, immediate button and keyboard skipping, held keys, automatic completion, rematches, pause/settings/visibility, reloads, reduced-motion preferences, career unlocks, safe club text, both camera sizes and rendering without state mutation. Native Canvas previews check the celebration poses and rounded clothing; browser playback remains unverified in this environment.

`league.test.cjs` covers full knockout cups, elimination in every round, tied-only AI fixtures, bonuses, bracket validation, duplicate payments, save migration, active-fixture restoration and the production UI. The earlier five-fixture format retains compatibility tests. `field.test.cjs` also completes knockout cups through normal-time wins and checks immediate elimination, tied-only endings and saved-match rule changes. Real-browser layout, audio and touch hardware remain unverified in this environment.

`field.test.cjs` uses the normal production app entry points and covers all three competitive modes, the complete 105-second clock, 30/60/144 fps consistency, keyboard movement and sprint, passing and receiving, switching, timed tackles, goals/saves/misses/board rebounds, AI play and difficulty, combined scores and sudden death, tied-only endings, pause/visibility/reload, simultaneous touch inputs and portrait mapping, full-time-to-penalty transition, results/rewards, Champions League advancement and malformed state. Earlier shootout UI tests explicitly use `penaltyHarness` to retain focused coverage of the penalty phase; the production app defaults to 1 minute 45 second matches. Native pitch previews are not browser screenshots.

`npm.cmd run test:browser` runs actual mouse, keyboard, touch-emulation, responsive screenshot, purchase and reload checks through a local Chromium debugging endpoint. It expects the test server at `http://localhost:4174` and an isolated Chromium profile with remote debugging at `http://localhost:9224`. Override the endpoint with `BROWSER_DEBUG`. Never point this test at a personal browser profile.

In the implementation environment, Chromium starts but its renderer hangs even on `about:blank`; browser QA therefore remains unverified. Actual-device visual, native touch, audio and accessibility checks are still required. The automated browser test is included for a functioning browser environment.

## Design scope

Gravity controls the flight arc and rebounds. Post and crossbar rebounds reflect the incoming shot velocity; net impacts absorb most of its energy. Soft glove saves bring the ball into the hands, while body blocks and powerful saves deflect it. Ground bounces lose energy and rolling friction brings the ball to rest. The shadow stays on the projected pitch, and the ball changes scale as it rebounds toward or away from the camera.

The game uses an arcade 2D projection and checks contact at the goal plane; it is not a full 3D rigid-body simulation. The fixed-step simulation, shared drawing/collision poses and constrained upgrades keep results consistent and readable. Reduced motion disables decorative motion and confetti while retaining essential ball and dive animation.

The stadium has a curved roof, bowl-shaped stands, denser crowds, floodlight glow and perspective pitch markings. Players use curved heads, hair, shoulders and clothing, smooth shaded limbs, shaped hands and rounded boots. Kit patterns are clipped to the shirt silhouette, with curved collars, folds and soft ground shadows. The striker faces the goal and is larger in the foreground. The keeper's proportions use the same scale for the visible body and collision areas. Static stadium layers are cached; selected spectators animate independently. Native static render previews, including dive/kick poses and custom shirts, are available in the ignored `qa/` folder and supplement rather than replace real-browser verification.

Shirts now have rounder shoulders, a curved waist and hem, and soft chest shading. Limbs have gently tapered contours; the loose shorts retain their above-knee length with curved sides and hems. These changes use the existing joint poses and do not change reach, shot physics or collision areas.

Keeper arms have shorter upper-arm and forearm segments, a more compact ready stance, and a closer torso during extended dives. The shared keeper pose keeps drawn gloves and save contact aligned; the torso collision area is unchanged in size. Regression tests cover precise corner saves, early/late timing, dive continuity, striker contact and pause timing, accessory transactions and migration, and all accessory preview types.

`competitions.test.cjs` covers 20 additional scenarios: complete seasons/cups, qualification and elimination, both extra-time halves, aggregate ties and sudden death, duplicate/stale/corrupt saves, production menu/resume/reset handlers, shot preview/launch agreement, all ten scorers, pause/skip/reload celebrations and keeper collection. Canvas recordings were inspected at desktop and portrait sizes. These are code-level and native-render checks; real-browser layout, audio and physical touch-device tests remain unverified in this environment.

## Champions League difficulty progression

Champions League opponents improve with every fixture, starting from the chosen Easy, Normal or Hard difficulty. The next-fixture card shows opponent levels 1–8 during the league phase, 9–10 in the play-offs, 11–12 in the round of 16, 13–14 in the quarters, 15–16 in the semis and 17 in the final. Qualifying directly skips the play-off levels. Later opponents press faster, finish more accurately towards the corners and react earlier in goal, including during shootouts. The increases are bounded: final outfield pace is 14% above the starting pace, keeper movement is 10% faster, and keeper reach does not grow. Player movement, assists and the 1.45-second save window stay consistent. Levels are derived from the saved fixture, so existing campaigns gain the progression automatically. Premier League and other modes retain their difficulty settings.

Six additional competition regression tests check progression on all difficulties, measured opponent and keeper speeds, actual shot placement and scatter, keeper dive timing, shootout timing and the fixture-card/pause/reload flow.

## 1.45-second goalkeeper control

Opponent shots in five-a-side (including opponent set pieces) open a keeper view with exactly 1.45 seconds of reaction time. The blue marker shows the incoming ball target. Click/tap it or a dive button; keyboard controls are W high / S low with A/D full left/right or Q/E short left/right. Either chord order works. Release a direction alone for a middle dive; arrows commit immediately. One dive is allowed, and the animated gloves/body must intersect the physical ball at the keeper plane. Wrong direction, wrong height or late dives can concede. Outfield players can still block the flight.

The pitch clock and outfield players pause during this view. Gravity/drag advance the actual ball along its flight, presented over 1.45 seconds; a half-second feedback animation returns to open play. Pause and reload preserve the remaining time and the committed dive. A final shot is resolved before full-time results. Successful player saves earn 12 coins and 16 XP once, on completing the match. Competitive shootout penalties now have 1.45-second flights too; specialist challenge, survival and practice timings are preserved.

`save-window.test.cjs` adds 14 regression scenarios covering distinct celebrations and continuous joints, actual AI shots, exact timing at 30/60/144 fps, correct/incorrect/late saves, both keyboard chord orders, touch/canvas input, pause/reload, defender blocks, opponent penalties, final shots, rewards and malformed snapshots. Browser/device checks remain unavailable; native Canvas recordings and production-handler tests cover the new scenes and controls.
