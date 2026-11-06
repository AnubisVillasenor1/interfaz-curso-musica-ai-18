import { ImageResponse } from 'next/og'
import { COURSE_PRODUCT, priceLabel } from '@/lib/products'

/**
 * Imagen de compartir generada por el propio deploy.
 *
 * La portada del Open Graph apuntaba a un bucket de v0 que no controla este
 * proyecto; cuando caducaba, los enlaces enviados por WhatsApp o X salían sin
 * imagen. `ImageResponse` se renderiza en el borde con las fuentes que ya trae
 * Next, así que el recurso nace del mismo commit que el resto de la marca.
 */
export const alt = 'Play and Go by TAMV ONLINE — curso de música con inteligencia artificial'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'radial-gradient(circle at 22% 18%, #17435f 0%, #0c2438 45%, #04101a 100%)',
          color: '#edfaff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0b1f2e',
              border: '3px solid #75e9f2',
            }}
          >
            <div style={{ width: 0, height: 0, borderLeft: '18px solid #75e9f2', borderTop: '12px solid transparent', borderBottom: '12px solid transparent', marginLeft: 6 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>PLAY AND GO</div>
            <div style={{ fontSize: 17, letterSpacing: 5, color: '#9fb8c7' }}>by TAMV ONLINE</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 74, lineHeight: 1.05, fontWeight: 700, letterSpacing: -2 }}>
            Música con IA,
          </div>
          <div style={{ fontSize: 74, lineHeight: 1.05, fontWeight: 700, letterSpacing: -2, color: '#75e9f2' }}>
            de cero a dirigir
          </div>
          <div style={{ fontSize: 28, color: '#b9d6e4', maxWidth: 820 }}>
            5 módulos · 16 sesiones · estudio de producción · biblioteca de prompts
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
            {[18, 34, 26, 48, 30, 56, 22, 40, 32, 14].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: h,
                  borderRadius: 5,
                  background: 'linear-gradient(180deg, #73edf1 0%, #9a72e8 100%)',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 20, letterSpacing: 4, color: '#9fb8c7' }}>INSCRIPCIÓN</div>
            <div style={{ fontSize: 40, fontWeight: 700, color: '#ffcf72' }}>{priceLabel(COURSE_PRODUCT)}</div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
