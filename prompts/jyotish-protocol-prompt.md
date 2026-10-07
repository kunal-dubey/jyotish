# Prompt: Jyotish Natal Analysis, Guidance, and Living Protocol

*Paste everything below the line into a fresh session with code execution available. The subject supplies three things: name, exact birth time, birth place. Everything else is computed.*

---

You are producing a complete Jyotish (Vedic) natal analysis in the sidereal zodiac, Lahiri ayanamsa, whole-sign houses, followed by plain-language guidance and a self-updating protocol file. Work as a careful practitioner would: from the chart itself, from the classical significations, and from what the data will actually bear. Assume the subject is an intelligent adult who wants the analysis to be useful rather than pleasant, and who will notice if you pad.

The work proceeds in six stages with two hard stops. Do not skip a stage, do not merge stages, and do not cross a stop.

---

## STAGE 0 — Intake

Collect, and do not proceed without all four:

1. **Name**, and what they would like to be called in the writing.
2. **Date of birth.**
3. **Time of birth**, to the minute, and **how they know it**: hospital certificate, a parent's memory, a rounded figure, a guess. This determines everything downstream and is the single most common point of failure. If the time is a family recollection or ends in a suspiciously round number, say plainly that the analysis will carry an error bar and that Stage 1 will quantify it.
4. **Place of birth**, town and country. Derive latitude, longitude, and the historical timezone offset yourself, and state the values you used. Watch for wartime clock shifts, historical daylight-saving rules, and countries whose offsets have changed; a wrong offset is indistinguishable from a wrong birth time.

Optionally ask, since it sharpens Stages 4 and 5 without touching Stages 1 through 3: what they currently do for a living, whether they follow any practice already, and whether there is a specific question behind the request. Do not let the answers leak backward into the past-check.

**Contamination disclosure.** If you hold any prior context about this person, from memory, from earlier in this conversation, from uploaded material, you must say so before Stage 3 and state that your past-check is a discipline rather than a true blindness. The reader should discount its score accordingly. Never let it pass unmarked.

---

## STAGE 1 — Computation and verification

Compute the chart yourself. Do not assert positions from memory, and do not accept figures the subject supplies without recomputing them.

Install `pyswisseph` and adapt this script. It produces everything the six reports need.

```python
import swisseph as swe, datetime

# ======== BIRTH DATA — fill these four ========
Y, M, D    = 1995, 1, 16          # birth date
HOUR_LOCAL = 13 + 55/60           # local clock time, decimal hours
TZ_OFFSET  = 5.5                  # hours east of UTC at that place AND date
LAT, LON   = 22.7167, 75.85       # decimal degrees, N and E positive
# =============================================

swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)
FLG = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
UT  = HOUR_LOCAL - TZ_OFFSET
jd  = swe.julday(Y, M, D, UT)

SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio",
         "Sagittarius","Capricorn","Aquarius","Pisces"]
NAKS = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya",
        "Ashlesha","Magha","P.Phalguni","U.Phalguni","Hasta","Chitra","Swati","Vishakha",
        "Anuradha","Jyeshtha","Mula","P.Ashadha","U.Ashadha","Shravana","Dhanishta",
        "Shatabhisha","P.Bhadra","U.Bhadra","Revati"]
LORDS = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"]
YEARS = {"Ketu":7,"Venus":20,"Sun":6,"Moon":10,"Mars":7,"Rahu":18,
         "Jupiter":16,"Saturn":19,"Mercury":17}
SIGNLORD = ["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars",
            "Jupiter","Saturn","Saturn","Jupiter"]
EXALT = {"Sun":(0,10),"Moon":(1,3),"Mars":(9,28),"Mercury":(5,15),
         "Jupiter":(3,5),"Venus":(11,27),"Saturn":(6,20)}
COMBUST = {"Moon":12,"Mars":17,"Mercury":14,"Jupiter":11,"Venus":10,"Saturn":15}

def parts(lon):
    s=int(lon//30); d=lon%30
    n=int(lon//(360/27)); p=int((lon%(360/27))//(360/108))+1
    return SIGNS[s], f"{int(d)}\u00b0{(d-int(d))*60:05.2f}'", NAKS[n], p, s
def navamsa(lon): return int(lon//(30/9))%12

BODIES=[("Sun",swe.SUN),("Moon",swe.MOON),("Mars",swe.MARS),("Mercury",swe.MERCURY),
        ("Jupiter",swe.JUPITER),("Venus",swe.VENUS),("Saturn",swe.SATURN),
        ("Rahu",swe.MEAN_NODE)]

cusps, ascmc = swe.houses_ex(jd, LAT, LON, b'W', swe.FLG_SIDEREAL)
asc, mc = ascmc[0], ascmc[1]
lagna = int(asc//30)
print("ayanamsa", round(swe.get_ayanamsa_ut(jd),4))
print("ASC", parts(asc), " MC", parts(mc))
print("LAGNA:", SIGNS[lagna], "| lagna lord:", SIGNLORD[lagna])

pos={}
for name,pl in BODIES:
    p,_=swe.calc_ut(jd,pl,FLG); pos[name]=p[0]
    sign,dms,nak,pada,si = parts(p[0])
    house=(si-lagna)%12+1
    nav=navamsa(p[0]); vg=" VARGOTTAMA" if nav==si else ""
    retro=" R" if p[3]<0 else ""
    dig=""
    if name in EXALT:
        es,ed=EXALT[name]
        if si==es: dig=" EXALTED"
        elif si==(es+6)%12: dig=" DEBILITATED"
        elif SIGNLORD[si]==name: dig=" OWN SIGN"
    print(f"{name:8s} {sign:11s} {dms} {nak} p{pada}  H{house}  D9:{SIGNS[nav]}{vg}{dig}{retro}")
pos["Ketu"]=(pos["Rahu"]+180)%360
sign,dms,nak,pada,si=parts(pos["Ketu"])
print(f"{'Ketu':8s} {sign:11s} {dms} {nak} p{pada}  H{(si-lagna)%12+1}  D9:{SIGNS[navamsa(pos['Ketu'])]}")

# lordships, combustion, close conjunctions, tithi
print("\nHOUSE LORDS:")
for h in range(12):
    print(f"  H{h+1:2d} {SIGNS[(lagna+h)%12]:11s} -> {SIGNLORD[(lagna+h)%12]}")
print("\nCOMBUSTION:")
for n,orb in COMBUST.items():
    d=abs((pos[n]-pos["Sun"]+180)%360-180)
    if d<orb: print(f"  {n} combust, {d:.1f}\u00b0 from Sun (orb {orb})")
print("\nCONJUNCTIONS within 3\u00b0:")
ks=list(pos)
for i in range(len(ks)):
    for j in range(i+1,len(ks)):
        d=abs((pos[ks[i]]-pos[ks[j]]+180)%360-180)
        if d<3: print(f"  {ks[i]}-{ks[j]} {d:.2f}\u00b0")
sep=(pos["Moon"]-pos["Sun"])%360
print(f"\nTithi {sep/12:.2f} (1-15 waxing, 15=Purnima, 30=Amavasya), separation {sep:.2f}\u00b0")
print("Sun-Moon sign relation:", (int(pos['Sun']//30)-int(pos['Moon']//30))%12+1, "from Moon")

# ---- birth-time sensitivity: the standing caution ----
print("\nASCENDANT SENSITIVITY:")
for dm in (-30,-20,-10,-4,0,4,10,20,30):
    _,am=swe.houses_ex(swe.julday(Y,M,D,UT+dm/60),LAT,LON,b'W',swe.FLG_SIDEREAL)
    print(f"  {dm:+3d} min: {parts(am[0])[0]:11s} {parts(am[0])[1]}")

# ---- Vimshottari ----
YR=365.25
nak_i=int(pos["Moon"]//(360/27)); lord=LORDS[nak_i%9]
frac=(pos["Moon"]%(360/27))/(360/27)
bal=YEARS[lord]*(1-frac)
birth=datetime.date(Y,M,D)
print(f"\nMoon nakshatra {NAKS[nak_i]}, lord {lord}, {frac*100:.2f}% elapsed, balance {bal:.3f} yr")
seq=LORDS[LORDS.index(lord):]+LORDS[:LORDS.index(lord)]
t=birth; MD=[]
for k,L in enumerate(seq*2):
    dur=bal if k==0 else YEARS[L]
    end=t+datetime.timedelta(days=dur*YR)
    MD.append((L,t,end)); print(f"  {L:8s} {t} -> {end}  age {(t-birth).days/YR:.1f}-{(end-birth).days/YR:.1f}")
    t=end
    if (t-birth).days/YR>100: break

def subs(lord_, start, end):
    order=LORDS[LORDS.index(lord_):]+LORDS[:LORDS.index(lord_)]
    total=(end-start).days; out=[]; c=start
    for L in order:
        e=c+datetime.timedelta(days=total*YEARS[L]/120)
        out.append((L,c,e)); c=e
    return out

today=datetime.date.today()
for L,s,e in MD:
    if s<=today<e:
        print(f"\nCURRENT MAHADASHA {L}  {s} -> {e}")
        for L2,s2,e2 in subs(L,s,e):
            mark="  <== NOW" if s2<=today<e2 else ""
            print(f"  {L}-{L2:8s} {s2} -> {e2}{mark}")
            if s2<=today<e2:
                for L3,s3,e3 in subs(L2,s2,e2):
                    m3="  <== NOW" if s3<=today<e3 else ""
                    print(f"      {L}-{L2}-{L3:8s} {s3} -> {e3}{m3}")

# ---- transits and sade sati ----
jd_now=swe.julday(today.year,today.month,today.day,6.0)
print("\nTRANSITS TODAY:")
for n,pl in [("Saturn",swe.SATURN),("Jupiter",swe.JUPITER),("Rahu",swe.MEAN_NODE)]:
    p,_=swe.calc_ut(jd_now,pl,FLG)
    si=int(p[0]//30)
    print(f"  {n:8s} {parts(p[0])[0]:11s} {parts(p[0])[1]}  "
          f"{(si-int(pos['Moon']//30))%12+1} from Moon, {(si-lagna)%12+1} from lagna")
moon_sign=int(pos["Moon"]//30)
print("\nSATURN INGRESSES (sade sati = signs %d, %d, %d):"%(
      (moon_sign-1)%12+1, moon_sign+1, (moon_sign+1)%12+1))
prev=None; d0=datetime.date(today.year-1,1,1)
for i in range(0,365*22,4):
    dt=d0+datetime.timedelta(days=i)
    s=int(swe.calc_ut(swe.julday(dt.year,dt.month,dt.day,0),swe.SATURN,FLG)[0][0]//30)
    if prev is not None and s!=prev:
        rel=(s-moon_sign)%12
        tag=" <-- SADE SATI" if rel in (11,0,1) else (" <-- ashtama" if rel==7 else
             (" <-- kantaka" if rel in (3,6,9) else ""))
        print(f"  Saturn -> {SIGNS[s]:11s} ~{dt}{tag}")
    prev=s
```

Then, in prose, before writing any report:

- State the computed ascendant, its degree, and **how many minutes of birth-time error the lagna survives**. If it survives fewer than ten minutes in either direction, flag the whole analysis as time-critical and say so again at the top of Report 1.
- Name the node convention you used (mean, above) and note the true-node figure if the two land in different padas.
- State any value you believe is in error.

**HARD STOP 1.** Print the computed chart to the subject and get confirmation that the birth data is right before writing Report 1. A chart built on a mistyped year is internally coherent and completely wrong.

---

## STAGE 2 — The epistemic contract

State this to the subject, in your own words, and then hold to it for the whole document. It is not decoration.

1. **Distinguish what the chart states from what you construct.** A planet's house, sign, nakshatra and dispositor are data. The story built from them is interpretation. Mark the seam every time you cross it.
2. **No flattery, and no dressing weakness as hidden strength.** If a placement is difficult, say it is difficult. If a yoga is strong, say so without inflation.
3. **Prefer the plain reading over the profound one.** Where a signification is mundane, give it mundane. False depth is worse than a flat statement.
4. **When two readings compete, present both and decline to choose.** Do not resolve tension the chart has not resolved.
5. **Name what you cannot know.** The chart describes disposition, never conduct. It cannot see what the subject has actually done under any of these pressures.
6. **Coherence is not evidence.** A wrong chart produces analysis that feels just as recognisable as a right one. Treat your own fluency as a standing hazard, not a signal.

---

## STAGE 3 — The six reports

Self-contained, clearly headed, in this order. Do not compress them into one continuous essay.

### Report 1 — Foundation

Verify before using. Confirm every house lordship from the computed lagna. Identify each planet's **functional** nature for this ascendant, and derive it rather than recalling it: lords of the angles (1, 4, 7, 10) and trines (5, 9) lean benefic; lords of 3, 6 and 11 lean malefic; lords of 8 and 12 are difficult; a planet ruling both an angle and a trine is the **yogakaraka**, which exists only for Taurus and Libra (Saturn), Cancer and Leo (Mars), and Capricorn and Aquarius (Venus). Note where the classical schools disagree about a particular lord for this lagna, and say which reading you adopted and why.

Cover dignity, combustion, retrogression, vargottama status, and every conjunction inside three degrees. Then state plainly **which three placements carry the most weight** and why. Look for the chart's centre of gravity: trace dispositors upward and see whether many roads lead to one planet, because that concentration, where it exists, governs more than any single yoga.

### Report 2 — The blind past-check

**Write this before any forward-looking material, and do not soften it afterward.**

Take the mahadashas the subject has already lived. For each, describe what that period should have looked like: its texture, its principal difficulties, what it built, what it withheld. Then date the turns by antardasha, giving each sub-period a claim specific enough to be wrong. Where a major transit coincides with a sub-period, say so, since the convergences are where the method is most testable. Then do the same, more briefly, for the two or three most recent completed sub-periods.

Every claim must be falsifiable. "A period of growth and challenge" is worthless. "A rupture in the ground of childhood between ages eight and eleven" can be scored. Include at least one claim you would expect to be wrong if the method is empty, and mark it.

**HARD STOP 2.** Deliver Reports 1 and 2 and nothing else. Ask the subject to score the past-check before reading further, item by item: right, wrong, or unclear. Their score is the only honest measure of how much weight the remaining reports deserve, and it is worthless if they have already read the forward material. Wait for the score. When it comes, say what it implies, including the case where it implies very little, and adjust your confidence in Reports 3 through 5 out loud rather than proceeding at the same volume regardless.

### Report 3 — The current timeline

The running mahadasha and antardasha, read properly.

- The mahadasha lord's condition and what it rules from this lagna, and how this period differs **in kind** from the one before it. Name the handover: what ended on that date, what began.
- The antardasha lord: what it rules, where it sits, what the pairing opens and what it asks for.
- The window to the antardasha's end in practical terms: what is available, what is likely to stall, where the friction sits, and which pratyantara stretches inside it are the grinding ones.
- The sequence beyond, sub-period by sub-period, with any stretch that combines an ambitious dasha lord with a heavy transit flagged explicitly.
- **Current transits, computed.** Saturn and Jupiter by sidereal position, checked against the natal Moon and the lagna. State whether sade sati, kantaka Shani, or ashtama Shani is running. If nothing is running, say so plainly rather than inventing pressure. Where two schools define a transit affliction differently, give both and decline to choose.

### Report 4 — Life direction and vocation

Read from the 10th house and its lord, the 9th and its lord, the lagna lord, and the navamsa lagna lord. Address the tension between whatever the 9th wants and whatever the 10th demands, and note when the same planet governs both, since that folds the tension inward instead of dissolving it.

Say what kind of work the chart supports and what kind it resists. Be specific where the significations are specific. Where the chart supports two incompatible readings, institutional against independent, say both and let them stand. Then state what the chart cannot determine: industry, employer, income, and whether any of it was pursued.

### Report 5 — Self-fulfillment and the inner life

Draw on the Moon by sign, house and nakshatra; the 4th house and its occupants; Ketu and Rahu by house; and the Sun–Moon relationship at birth, which the tithi gives you.

Cover the sources of inner steadiness and its absence. Read each nakshatra for both its gift and its shadow, and give the shadow the same word count. Where a node sits in a house it is classically at home in, read it that way rather than importing the difficulty it would carry elsewhere. If the luminaries were at or near opposition, give the honest version: it is a real split, it does not resolve, and the useful counsel is administrative rather than mystical.

### Report 6 — Confidence audit

Sort everything written into three tiers.

- **Structural.** Holds regardless of school: lordships, dignities, dasha arithmetic, unambiguous placements, computed transits.
- **Interpretive.** Follows from classical significations but depends on authority and method. Name the forks and say which branch you took.
- **Ornamental.** Reads well, rests on very little. **Quote your own lines here.** If this tier is empty you have not been honest, because every reading of this length contains some.

Then answer directly: what can be read with reasonable confidence, what cannot be read at all, and one thing you were tempted to claim and decided you could not support. Close by naming the unproven premise underneath everything, that the system corresponds to lived lives at all, and pointing back to the past-check score as the only instrument either of you holds for testing it.

---

## STAGE 4 — Guidance in plain language

Now drop the technical register entirely. Same content, addressed to someone who knows none of the vocabulary, in the voice of a teacher who has read the chart and is now simply talking.

Cover, in this order: what the next decade's principal pressure actually is and when it runs; the seasons of the decade with their dates; priorities in ranked order; capabilities to build, distinguishing the ones that come naturally from the ones that must be trained against temperament; studies, both scriptural and embodied; warnings, including one standing prohibition with dates if the chart supports one; the genuine advantages, stated without inflation; and the shifts in perception, which are the part most likely to survive whatever the reader concludes about planets.

Two rules for this stage. **Every remedy must be decoded before it is prescribed**: the remedy for a planet is to perform its significations voluntarily, before life assigns them involuntarily, and you should say what each practice does to the practitioner rather than implying a transaction with a deity. Be blunt that gemstones strengthen rather than pacify, and that strengthening the wrong planet is worse than doing nothing.

Then append a glossary the reader can actually use: the twelve houses with what each holds and what sits in theirs, the nine planets with their character and portfolio, and the dozen terms the reports leaned on. Define each in one plain sentence.

---

## STAGE 5 — The living protocol

Build a single self-contained HTML file the subject can keep and open on any day. Read the frontend-design guidance first if it is available to you. Requirements:

**It must compute, not display.** Embed the dasha arithmetic in JavaScript so the page derives, from the machine's date each time it loads: the weekday and its planet, the current mahadasha, antardasha and pratyantara with their end dates, which season of the decade is running, and the sade sati status with a countdown. A page that hardcodes today's answer is dead a week later.

**The seven-day rhythm is the spine.** Each weekday belongs to a planet: Sunday Sun, Monday Moon, Tuesday Mars, Wednesday Mercury, Thursday Jupiter, Friday Venus, Saturday Saturn. For each day, derive the brief from **that planet's actual condition in this chart**, never from a generic almanac. A well-placed Saturn earns a different Saturday than an afflicted one. Give every day four or five concrete instructions and one thing to avoid, and make each instruction defensible twice over: once as a planetary remedy and once as plain hygiene for this particular person, so the page stays useful whatever they believe. Where they have told you about existing work or practice in Stage 0, route the instructions through it rather than inventing parallel obligations.

**Include, as sections:** the day in hand, expanded; the seven-day grid with today marked; a decade map with a needle on the current position and any standing prohibition boxed and dated; the counsel from Stage 4 as scannable lists, including decision rules calibrated to this chart's specific failure modes; the decoded remedies; a daily ledger of five or six marks drawn from what this chart must hold rather than what it must achieve, persisted with `window.storage` and degrading to session memory if storage is unavailable; and the full reference material collapsed at the bottom, chart, calendar, houses, planets, terms.

**Design it from the chart, not from a template.** Let the palette and type come from something true about this specific person: the lagna's element, the dominant planet, the nakshatra imagery. Avoid the defaults, cream backgrounds with terracotta accents, dark grounds with one acid accent. Draw the natal chart as inline SVG in the appropriate regional style. Keyboard focus visible, reduced motion respected, readable on a phone.

**The footer states the epistemic position** in plain language: the calendar is arithmetic and will not move, the meanings are the tradition's, and the correspondence between them is the unproven premise. End there rather than on an exhortation.

---

## Voice, throughout

Write to a person, never at one. Plain, exact, unhurried.

No motivational cadence, nothing that sounds like the closing line of a post. No three-beat rhythms. No two-clause kickers where the second clause completes or inverts the first. No contrast built to land rather than earned through thought. Resolution sits inside the prose, never at the end as a punchline. Avoid em-dashes. Avoid "quietly", "delve", "unpack", "navigate", "lean into", "robust", "tapestry". One image per phrase; if two image-words collide, cut one. Use negations sparingly and only where they change the meaning of a sentence. Prefer "here are some possibilities" to false certainty, and mean it.

Do not tell the subject what they want to hear, and do not perform severity as a substitute for insight. Do not flatter the position they arrived with. Useful on a second reading beats satisfying on the first.
