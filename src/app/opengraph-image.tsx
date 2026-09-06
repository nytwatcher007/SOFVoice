import { ImageResponse } from 'next/og'

export const alt = 'SoF Voice — Accountability & Suggestions Portal'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * The link preview shown when someone shares the portal in a WhatsApp or Slack
 * group — which is exactly how students will actually receive it.
 *
 * Typographic on purpose. CLAUDE.md forbids producing a substitute SoF logo,
 * and rendering the real wordmark SVG through satori is fragile, so this uses
 * the verified brand colours and type rather than inventing a mark.
 *
 * It also says nothing that isn't already public: the portal exists and it is
 * for SoF students and faculty. No submission content is ever reachable without
 * the access code, so an unfurled preview leaks nothing.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: '#180b05',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            letterSpacing: 6,
            color: '#ffb917',
            fontWeight: 700,
          }}
        >
          THE SCHOOL OF FUTURE, KOCHI · STUDENT COUNCIL
        </div>

        <div style={{ display: 'flex', marginTop: 28, fontSize: 132, fontWeight: 800 }}>
          <span style={{ color: '#f9f4eb' }}>SoF&nbsp;</span>
          <span style={{ color: '#ff600b' }}>Voice</span>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 38,
            color: '#f9f4eb',
            opacity: 0.8,
          }}
        >
          Demand accountability. Suggest improvements. Anonymously.
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 48,
            paddingTop: 32,
            borderTop: '3px solid #ff600b',
            fontSize: 26,
            color: '#f9f4eb',
            opacity: 0.55,
          }}
        >
          Closed circuit — students and faculty only
        </div>
      </div>
    ),
    size
  )
}
