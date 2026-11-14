# OUTPOST: Junior Astronaut Mission Trainer

**Play:** https://bulatbekdanial.github.io/outpost-trainer/
**Challenge:** NASA Space Apps Challenge 2026, *Build a Junior Astronaut Mission Trainer*
**Team:** ITM (International Tech Machines), Aktau, Kazakhstan

OUTPOST is a free browser game for students aged 10–17. Players act as mission planners for a 4-person outpost and keep the crew alive for 60 days at one of three real sites:

| Site | Difficulty | What breaks |
|---|---|---|
| Shackleton Crater rim, lunar south pole | Beginner | High radiation (1.37 mSv/day), occasional terrain shadows |
| Jezero Crater, Mars | Medium | Weak sunlight (43% of Earth's), night every sol, dust storms |
| Mare Tranquillitatis, lunar equator | Hard | The 14.8-day lunar night: no solar power at all |

## How it works

1. **Plan:** pack an 8,000 kg cargo lander with solar arrays, batteries, a fission unit, a water recycler, oxygen production (electrolysis, MOXIE-class or ice mining), a greenhouse, regolith shielding, a storm shelter and supplies. A live *engineering check* simulates 60 days and shows when oxygen, water or food would run out, how much power is missing and whether the habitat meets NASA's radiation design target.
2. **Operate:** every 5 days, choose the crew focus (Science EVA, Maintenance, Habitat care, Take shelter) and switch systems on or off. React to dust storms, solar particle events, sunsets, terrain shadows and recycler failures.
3. **Debrief:** get a grade (S–F) and personalised lessons that link each outcome to the real NASA data behind it.

A *mission code* seeds the random events, so a whole class can fly the same mission and compare plans.

## NASA data used

| Value in game | Source |
|---|---|
| O₂ 0.82 kg and food 1.8 kg per crew-day | NASA Life Support Baseline Values and Assumptions Document (BVAD), 2022 |
| Water ≈3.8 kg per crew-day; recycling 93% → 98% | NASA, ISS water recovery milestone (Brine Processor), 2023 |
| Mars surface dose 0.67 mSv/day; cruise 1.8 mSv/day | Curiosity RAD, Hassler et al. 2014 |
| Lunar radiation environment | LRO CRaTER; lunar surface 1.37 mSv/day from Chang'e-4 LND (Zhang et al. 2020) |
| 600 mSv career limit, 250 mSv per solar event, 0.8 mSv/day surface design target | NASA-STD-3001 / OCHMO technical brief |
| MOXIE oxygen production (122 g total, 12 g/h peak) | NASA/JPL, 2023 |
| Mars sunlight 586 W/m², sol length | NASA NSSDCA Mars Fact Sheet |
| Lunar day/night cycle 29.53 days | NASA NSSDCA Moon Fact Sheet |
| Dust storms stop solar power | NASA, end of the Opportunity mission (2018 storm) |
| Fission surface power, 10 kWe concept ≈4 t | NASA Fission Surface Power project |
| Water ice at the lunar south pole | NASA LCROSS |
| Growing food in space | NASA Veggie |

All links are listed in the in-game **Data Library**. Values marked *game estimate* (base load, regolith shielding factors, MOXIE-class plant scale, mass budget) are simplified for gameplay and are labelled as such in the game.

## Run locally

No build step and no dependencies. Open `index.html` in any modern browser, or serve the folder:

```
python3 -m http.server 8000
```

Structure: `js/data.js` holds all constants and sources, `js/sim.js` is a pure simulation engine (also runs in Node), and `js/ui.js` handles rendering.

## Use of Super Intelligence (SI)

The code in this repository (HTML, CSS, JavaScript) and the demo slides were written with assistance from an SI tool, **Claude (Anthropic)**. Team ITM chose the challenge, the game concept, the sites and mechanics, selected and checked the NASA data, and tested and balanced the game. SI was also used for research, debugging and editing English text. No SI-generated images, audio or video are used: all graphics are simple vector shapes drawn in code. No NASA logos, flags or mission insignia are used.

## License

MIT. This is an independent student project and is not affiliated with or endorsed by NASA.
