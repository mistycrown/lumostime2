/**
 * @file journalPdfCoverArt.ts
 * @input Vector artwork supplied in lumos_time_cover.html
 * @output Orientation-specific mountain and abstract cover geometry
 * @updated 2026-10-23: Preserves supplied SVG geometry without external images or hard-coded artwork colors.
 */
export const JOURNAL_COVER_ART = {
  "minimal": {
    "portrait": {
      "viewBox": [
        1000,
        800
      ],
      "paths": [
        {
          "d": "M0 280 C160 230 260 340 420 300 S750 270 1000 315 L1000 800 L0 800Z",
          "stroke": false
        },
        {
          "d": "M0 410 C185 350 300 460 505 405 S810 370 1000 430 L1000 800 L0 800Z",
          "stroke": false
        },
        {
          "d": "M0 530 C220 465 340 580 525 495 S775 510 1000 550 L1000 800 L0 800Z",
          "stroke": false
        },
        {
          "d": "M0 560 C240 535 330 645 545 592 S775 533 1000 610 L1000 800 L0 800Z",
          "stroke": false
        },
        {
          "d": "M0 635 C220 580 400 650 555 611 S810 630 1000 582 L1000 800 L0 800Z",
          "stroke": false
        }
      ],
      "circles": [
        {
          "cx": 760.0,
          "cy": 230.0,
          "r": 76.0
        }
      ]
    },
    "landscape": {
      "viewBox": [
        1200,
        650
      ],
      "paths": [
        {
          "d": "M0 270 C165 190 250 300 400 260 S690 196 825 244 S1080 260 1200 195 L1200 650 L0 650Z",
          "stroke": false
        },
        {
          "d": "M0 390 C200 310 330 432 490 360 S790 320 990 390 S1140 380 1200 342 L1200 650 L0 650Z",
          "stroke": false
        },
        {
          "d": "M0 440 C240 405 280 490 505 436 S810 435 990 465 S1120 460 1200 435 L1200 650 L0 650Z",
          "stroke": false
        },
        {
          "d": "M0 477 C180 455 300 528 490 495 S790 460 970 510 S1160 505 1200 490 L1200 650 L0 650Z",
          "stroke": false
        },
        {
          "d": "M0 540 C220 494 360 555 540 515 S920 570 1200 505 L1200 650 L0 650Z",
          "stroke": false
        }
      ],
      "circles": [
        {
          "cx": 935.0,
          "cy": 195.0,
          "r": 65.0
        }
      ]
    }
  },
  "abstract": {
    "portrait": {
      "viewBox": [
        1000,
        1400
      ],
      "paths": [
        {
          "d": "M0 0 H1000 V160 C785 135 750 240 595 216 C410 185 300 100 0 145Z",
          "stroke": false
        },
        {
          "d": "M890 0 H1000 V670 C905 590 794 550 822 400 S1002 172 890 0Z",
          "stroke": false
        },
        {
          "d": "M0 1000 C160 875 370 820 555 926 S880 1090 1000 940 V1400 H0Z",
          "stroke": false
        },
        {
          "d": "M0 1220 C190 1120 345 1210 490 1140 C730 1030 850 1190 1000 1100 V1400 H0Z",
          "stroke": false
        },
        {
          "d": "M0 1330 C330 1200 510 1310 1000 1130 V1400 H0Z",
          "stroke": false
        },
        {
          "d": "M-30 1100 C270 1030 370 1160 595 815 S805 500 940 258",
          "stroke": true
        },
        {
          "d": "M929 258 l-10 -13 m10 13 l13 -11",
          "stroke": true
        }
      ],
      "circles": [
        {
          "cx": 930.0,
          "cy": 258.0,
          "r": 7.0
        }
      ]
    },
    "landscape": {
      "viewBox": [
        1400,
        1000
      ],
      "paths": [
        {
          "d": "M0 0 H1400 V185 C1200 145 1130 290 870 190 C540 40 360 215 0 110Z",
          "stroke": false
        },
        {
          "d": "M1045 0 H1400 V1000 H1200 C1280 770 1130 700 1160 500 S1340 170 1045 0Z",
          "stroke": false
        },
        {
          "d": "M860 1000 C970 850 1125 860 1400 690 V1000Z",
          "stroke": false
        },
        {
          "d": "M0 870 C360 745 500 935 790 795 S1135 695 1400 860 V1000 H0Z",
          "stroke": false
        },
        {
          "d": "M0 962 C365 860 540 980 780 900 S1200 890 1400 825 V1000 H0Z",
          "stroke": false
        },
        {
          "d": "M615 1075 C785 720 960 810 1090 502 S1295 145 1370 95",
          "stroke": true
        },
        {
          "d": "M1359 95 l11 -15 l9 15",
          "stroke": true
        }
      ],
      "circles": [
        {
          "cx": 1370.0,
          "cy": 95.0,
          "r": 8.0
        }
      ]
    }
  }
} as const;
