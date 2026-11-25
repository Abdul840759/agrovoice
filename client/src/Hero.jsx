// Green header band with a soft field illustration. Used on every main screen.
export default function Hero({ children, tall = false }) {
  return (
    <section className={`hero${tall ? ' tall' : ''}`}>
      <svg className="hero-art" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <g id="sprout" fill="#fff">
            <path d="M0 0V-14" stroke="#fff" strokeWidth="1.6" fill="none" />
            <path d="M0 -9c-8 -1 -10 -7 -9 -10 7 0 10 4 9 10z" />
            <path d="M0 -12c8 -1 10 -7 9 -10 -7 0 -10 4 -9 10z" />
          </g>
        </defs>
        <circle cx="338" cy="58" r="46" fill="#fff" opacity=".06" />
        <circle cx="338" cy="58" r="28" fill="#fff" opacity=".12" />
        <path d="M0 150C70 118 140 128 210 140S340 124 400 136V200H0Z" fill="#fff" opacity=".08" />
        <path d="M0 172C80 150 160 160 240 168S350 156 400 164V200H0Z" fill="#fff" opacity=".12" />
        <g opacity=".32">
          <use href="#sprout" x="30" y="184" />
          <use href="#sprout" x="78" y="178" />
          <use href="#sprout" x="126" y="182" />
          <use href="#sprout" x="174" y="186" />
          <use href="#sprout" x="222" y="180" />
          <use href="#sprout" x="270" y="184" />
          <use href="#sprout" x="318" y="178" />
          <use href="#sprout" x="366" y="183" />
        </g>
      </svg>
      <div className="hero-body">{children}</div>
    </section>
  )
}
