export const fleet = [
  {
    "id": "orbit",
    "name": "orbit",
    "desc": "tasks, direction and the agents' board",
    "url": "https://orbit.mauricekleine.com",
    "rail": true,
    "angle": 45,
    "mark": {
      "light": "orbit.svg",
      "dark": "orbit-dark.svg"
    }
  },
  {
    "id": "quanta",
    "name": "quanta",
    "desc": "learning chapters",
    "url": "https://quanta.mauricekleine.com",
    "rail": true,
    "angle": 90,
    "mark": {
      "light": "quanta.svg",
      "dark": "quanta-dark.svg"
    }
  },
  {
    "id": "trisys",
    "name": "trisys",
    "desc": "essays and decks",
    "url": "https://trisys.mauricekleine.com",
    "rail": true,
    "angle": 27,
    "mark": {
      "light": "trisys.svg",
      "dark": "trisys-dark.svg"
    }
  },
  {
    "id": "constellation",
    "name": "constellation",
    "desc": "a personal graph",
    "url": "https://constellation.mauricekleine.com",
    "rail": true,
    "angle": 63,
    "mark": {
      "light": "constellation.svg",
      "dark": "constellation-dark.svg"
    }
  },
  {
    "id": "artifacts",
    "name": "artifacts",
    "desc": "reports and documents",
    "url": "https://artifacts.mauricekleine.com",
    "rail": true,
    "angle": 135,
    "mark": {
      "light": "artifacts.svg",
      "dark": "artifacts-dark.svg"
    }
  },
  {
    "id": "telemetry",
    "name": "telemetry",
    "desc": "dashboards, logs and alerts",
    "url": "https://telemetry.mauricekleine.com",
    "rail": true,
    "angle": 153,
    "mark": {
      "light": "telemetry.svg",
      "dark": "telemetry-dark.svg"
    }
  },
  {
    "id": "soliton",
    "name": "soliton",
    "desc": "the server",
    "url": null,
    "rail": false,
    "angle": 117,
    "mark": {
      "light": "soliton.svg",
      "dark": "soliton-dark.svg"
    }
  }
] as const

export const home = {
  "id": "superthread",
  "name": "superthread",
  "url": "https://superthread.mauricekleine.com"
} as const

export type Ship = (typeof fleet)[number]
export type ShipId = Ship["id"]
// @mk/fleet 2.3.0
