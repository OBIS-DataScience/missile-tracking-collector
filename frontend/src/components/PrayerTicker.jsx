import React from 'react'

/**
 * A slow-scrolling scripture ticker at the bottom of the screen.
 * Calls viewers to pray for peace and rebukes the spirit of war,
 * death, and destruction in the name of Jesus Christ.
 *
 * The messages loop continuously using a CSS marquee animation,
 * separated by crosses (✝) as dividers.
 */

const MESSAGES = [
  '"Blessed are the peacemakers, for they shall be called children of God." — Matthew 5:9',
  'We rebuke the spirit of war, death, and destruction in the name of Jesus Christ.',
  '"The Lord will fight for you; you need only to be still." — Exodus 14:14',
  'Pray for the peace of all nations. Pray for every life caught in the crossfire.',
  '"He shall judge between the nations, and shall decide disputes for many peoples; and they shall beat their swords into plowshares." — Isaiah 2:4',
  'In the name of Jesus, we speak life over every nation and every people.',
  '"For God has not given us a spirit of fear, but of power and of love and of a sound mind." — 2 Timothy 1:7',
  'We stand against the principalities of darkness and declare peace over this earth in Jesus\' name.',
  '"If my people, who are called by my name, will humble themselves and pray and seek my face, then I will hear from heaven and will heal their land." — 2 Chronicles 7:14',
  'Pray without ceasing. The fervent prayer of the righteous avails much. — James 5:16',
  '"No weapon formed against you shall prosper." — Isaiah 54:17',
  'Lord, have mercy on our world. Let Your peace that surpasses all understanding guard our hearts.',
  '"The thief comes only to steal and kill and destroy; I have come that they may have life, and have it to the full." — John 10:10',
  'We bind every spirit of death and destruction and loose the peace of God over every nation in Jesus\' name.',
  '"He makes wars cease to the ends of the earth. He breaks the bow and shatters the spear." — Psalm 46:9',
  'Please pray for our world. Pray for the leaders. Pray for the innocent. Pray for peace.',
  '"For our struggle is not against flesh and blood, but against the rulers, against the authorities, against the powers of this dark world." — Ephesians 6:12',
  'In the mighty name of Jesus Christ, we declare peace, healing, and restoration over every nation.',
  '"The LORD is close to the brokenhearted and saves those who are crushed in spirit." — Psalm 34:18',
  '"And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus." — Philippians 4:7',
]

// Build the ticker text with cross dividers
const DIVIDER = '  ✝  '
const TICKER_TEXT = MESSAGES.join(DIVIDER)

export default function PrayerTicker() {
  return (
    <div className="w-full h-7 md:h-9 overflow-hidden flex-shrink-0 relative"
         style={{ background: 'linear-gradient(90deg, #0B0F1A 0%, #0e1225 15%, #111832 50%, #0e1225 85%, #0B0F1A 100%)' }}>
      {/* Top border — soft cyan/white glow line matching the UI */}
      <div className="absolute top-0 left-0 right-0 h-px"
           style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(148,163,184,0.2) 30%, rgba(148,163,184,0.35) 50%, rgba(148,163,184,0.2) 70%, transparent 95%)' }} />

      {/* Left label */}
      <div className="absolute left-0 top-0 h-full w-24 z-10 flex items-center justify-center gap-1.5"
           style={{ background: 'linear-gradient(90deg, #0B0F1A, transparent)' }}>
        <span className="text-white/30 text-xs">✝</span>
        <span className="text-[9px] font-semibold tracking-[0.2em] text-white/25 uppercase">Pray</span>
      </div>

      {/* Right fade */}
      <div className="absolute right-0 top-0 h-full w-24 z-10 flex items-center justify-center gap-1.5"
           style={{ background: 'linear-gradient(270deg, #0B0F1A, transparent)' }}>
        <span className="text-[9px] font-semibold tracking-[0.2em] text-white/25 uppercase">Pray</span>
        <span className="text-white/30 text-xs">✝</span>
      </div>

      {/* Scrolling text */}
      <div className="ticker-scroll flex items-center h-full whitespace-nowrap">
        <span className="inline-block px-28 text-[11px] tracking-wider font-light text-slate-300/40">
          {TICKER_TEXT}{DIVIDER}{TICKER_TEXT}
        </span>
      </div>
    </div>
  )
}
