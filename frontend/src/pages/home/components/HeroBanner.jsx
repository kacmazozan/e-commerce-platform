import { Suspense, lazy, useState, useEffect } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

function HeroFallback() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: 'radial-gradient(circle at 60% 40%, #2e1065 0%, #0f0a24 55%, #020617 100%)',
      }}
      aria-hidden="true"
    />
  )
}

export default function HeroBanner() {
  const [shouldLoad3D, setShouldLoad3D] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e) => setShouldLoad3D(!e.matches)
    motionQuery.addEventListener('change', handler)
    return () => motionQuery.removeEventListener('change', handler)
  }, [])

  return (
    <section className="light:before:opacity-100 light:bg-white light:after:[background:none] relative isolate z-[1] flex h-svh items-center justify-center overflow-hidden bg-[#100d1e] px-6 pt-[72px] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-[2] before:h-40 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:opacity-0 after:pointer-events-none after:absolute after:inset-0 after:[background:radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.4)_100%),linear-gradient(to_bottom,transparent_55%,rgba(16,13,30,0.6)_78%,#100d1e_100%)]">
      {/* Spline 3D background */}
      <div
        className="light:[filter:invert(1)_hue-rotate(180deg)] pointer-events-none absolute -top-[20%] right-0 bottom-0 left-0 z-[-1] overflow-hidden"
        aria-hidden="true"
      >
        {shouldLoad3D ? (
          <Suspense fallback={<HeroFallback />}>
            <Spline
              scene="https://prod.spline.design/smuAGxLA0AM6n8JN/scene.splinecode"
              className="pointer-events-none! h-full! w-full!"
            />
          </Suspense>
        ) : (
          <HeroFallback />
        )}
      </div>

      {/* Hero text */}
      <div className="relative z-10 flex w-full max-w-[900px] flex-col items-center px-6 text-center">
        <p className="mb-4 text-[11px] font-bold tracking-[5px] text-purple-400 uppercase opacity-90">
          New Season
        </p>
        <h1 className="light:text-gray-900 light:[text-shadow:none] m-0 mb-4 text-[clamp(40px,10vw,72px)] leading-[1.05] font-extrabold tracking-[-2px] text-white [text-shadow:0_4px_40px_rgba(0,0,0,0.4)]">
          Discover Your Style
        </h1>
        <p className="light:text-gray-500 mb-9 max-w-[500px] tracking-[0.5px] text-white/55">
          Curated fashion for every occasion
        </p>
        <button
          type="button"
          className="cursor-pointer rounded-[6px] border-none bg-purple-400 px-8 py-[13px] text-[13px] font-bold tracking-[1.5px] text-white uppercase shadow-[0_0_32px_rgba(170,59,255,0.4)] transition-[opacity,box-shadow] hover:opacity-90 hover:shadow-[0_0_48px_rgba(170,59,255,0.6)]"
        >
          Shop Now
        </button>
      </div>
    </section>
  )
}
