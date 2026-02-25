// Home.tsx (UPDATED) — full width hero, aligned with header padding, no black, consistent spacing
import React from "react";
import { Link } from "react-router-dom";
import heroImage from "../uploads/images/school-children-dressed-uniform-have-fun-play-schoolyard.jpg";

const Home: React.FC = () => {
const howItWorks = [
  {
    title: "Choose a School",
    desc: "Select a school and see its needs and funding requirements.",
    icon: "bx bx-search",
    img: "/images/how/chooseschool.jpg",
  },
  {
    title: "Donate",
    desc: "Securely contribute funds or supplies through our platform.",
    icon: "bx bx-donate-heart",
    img: "/images/how/donation.jpg",
  },
  {
    title: "Track Impact",
    desc: "Receive updates and proof of how your donation helps.",
    icon: "bx bx-check-shield",
    img: "/images/how/impact.jpg",
  },
];

const impact = [
  {
    icon: "bx bx-award",
    stat: "100+",
    title: "Students Supported",
    desc: "Students received scholarships last year."
  },
  {
    icon: "bx bx-building-house",
    stat: "5",
    title: "Schools Renovated",
    desc: "Learning environments improved with your help."
  },
  {
    icon: "bx bx-laptop",
    stat: "200+",
    title: "Digital Devices Donated",
    desc: "Students equipped with computers and tablets."
  }
];
  const posts = [
    { title: "Back to School Drive", desc: "Updates on our annual back-to-school campaign.", tag: "Campaign" },
    { title: "Volunteer Stories", desc: "Read inspiring experiences from our volunteers.", tag: "Community" },
  ];

  // Match Layout header padding (use the same values in Layout.tsx nav)
  const shellPad = "px-6 sm:px-12 lg:px-20 xl:px-32";

  return (
    <div className="bg-white">
      {/* HERO — full width background, content aligned to header padding */}
<section className="relative w-full overflow-hidden min-h-[75vh] flex items-center">
  {/* Background */}
 <div
  className="absolute inset-0 bg-center bg-cover scale-[1.03] will-change-transform"
  style={{ backgroundImage: `url(${heroImage})` }}
/>

  {/* Overlays (stronger readability + soft) */}
  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-900/30 to-slate-950/15" />
  <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-950/25 to-slate-950/45" />
  {/* Focus overlay behind text (makes title always readable) */}
  <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,rgba(2,6,23,0.35)_0%,rgba(2,6,23,0.15)_40%,rgba(2,6,23,0.0)_70%)]" />

  {/* Content */}
  <div className={`relative w-full ${shellPad} py-12 sm:py-16 lg:py-20`}>
    <div className="mx-auto max-w-3xl text-center">
      {/* Pill (fixed: was using button sizing classes) */}
      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-white border border-white/20 backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        Transparent donations • Verified schools
      </div>

      <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow">
        Help Under-Resourced Schools
      </h1>

      <p className="mt-4 text-base sm:text-lg text-white/90 leading-relaxed">
        Connecting donors directly with schools in Sri Lanka for transparent, accountable support.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/register-school"
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-extrabold text-sm text-white bg-rose-500 hover:bg-rose-600 transition shadow-sm"
        >
          Register Your School
        </Link>

        {/* Secondary CTA more “glass outline” */}
        <Link
          to="/projects"
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-extrabold text-sm text-white bg-white/5 hover:bg-white/10 border border-white/25 transition backdrop-blur"
        >
          Explore Projects
        </Link>
      </div>

      {/* Stats row (glassy + readable) */}
      <div className="mt-10 grid grid-cols-3 gap-3 max-w-lg mx-auto">
        {[
          { label: "Verified Schools", value: "120+" },
          { label: "Donors", value: "2,400+" },
          { label: "Projects Funded", value: "310+" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 text-white shadow-lg shadow-black/20 hover:bg-white/15 transition"
          >
            <div className="text-xl font-extrabold">{s.value}</div>
            <div className="text-[11px] text-white/90 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Optional scroll hint */}
      <div className="mt-8 text-white/80 text-xs font-extrabold flex items-center justify-center gap-2">
        Scroll to learn more <i className="bx bx-down-arrow-alt text-lg" />
      </div>
    </div>
  </div>
</section>

      {/* ABOUT */}
      <section className={`mx-auto max-w-screen-2xl ${shellPad} py-14 sm:py-18`}>
  <div className="grid lg:grid-cols-12 gap-8 items-start">
    <div className="lg:col-span-7">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
        Every Child, Every Classroom
      </h2>

      <p className="mt-4 text-slate-600 leading-relaxed max-w-2xl">
        We bridge the gap between donors and schools to create brighter, more equal opportunities for learning —
        with transparency, accountability, and real-world proof.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {["Verified schools", "Receipts & evidence", "Progress updates", "Fair distribution"].map((x) => (
          <span key={x} className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex gap-3 transition hover:shadow-md hover:-translate-y-0.5">
            {x}
          </span>
        ))}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          to="/projects"
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-extrabold text-sm text-white bg-rose-500 hover:bg-rose-600 transition shadow-sm"
        >
          Explore projects
        </Link>
        <Link
          to="/support-school"
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-extrabold text-sm text-slate-900 bg-slate-100 hover:bg-white border border-slate-300 hover:bg-slate-50 shadow-sm"
        >
          Donate now
        </Link>
      </div>
    </div>

    <div className="lg:col-span-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="font-extrabold text-slate-900">How we keep it transparent</div>
        <p className="mt-2 text-sm text-slate-600">
          Donors see where funds go, what was purchased, and proof uploaded by the school.
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
          {[
            { title: "Verified schools", desc: "Profiles reviewed before listing.", icon: "bx bx-badge-check" },
            { title: "Evidence uploads", desc: "Receipts & photos after delivery.", icon: "bx bx-receipt" },
            { title: "Progress updates", desc: "Milestones posted for every request.", icon: "bx bx-timer" },
          ].map((b) => (
            <div key={b.title} className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-100 text-rose-700 grid place-items-center">
                <i className={`${b.icon} text-xl`} />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">{b.title}</div>
                <div className="text-xs text-slate-600 mt-1">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
</section>
{/* HOW IT WORKS – Modern Stepper */}
<section className="bg-white border-y border-slate-200">
  <div className={`mx-auto max-w-screen-2xl ${shellPad} py-16 sm:py-20`}>
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">How It Works</h2>
      <p className="mt-3 text-slate-600">Simple steps. Clear outcomes. Real change.</p>
    </div>

    {/* Stepper */}
    <Stepper howItWorks={howItWorks} />
  </div>
</section>
{/* DONATE CTA – FULL WIDTH DARK */}
<section className="w-full bg-gradient-to-br from-[#0B1B3A] via-[#0E2148] to-[#0B1B3A] py-16 sm:py-20">
  <div className={`mx-auto max-w-screen-2xl ${shellPad}`}>
    <div className="grid lg:grid-cols-12 gap-8 items-center">

      {/* LEFT CONTENT */}
      <div className="lg:col-span-8">

        {/* badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 text-white px-3 py-1 text-xs font-extrabold backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Verified projects • Transparent reporting
        </div>

        <h2 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Make a Donation
        </h2>

        <p className="mt-4 text-white/80 leading-relaxed max-w-2xl">
          Your support makes a real difference. Choose a project or donate to general funds with clear allocation.
        </p>
      </div>

      {/* RIGHT BUTTONS */}
      <div className="lg:col-span-4 flex lg:justify-end gap-3">

        <Link
          to="/projects"
          className="inline-flex items-center justify-center h-12 px-6 rounded-xl font-extrabold text-sm text-white 
                     border border-white/20 bg-white/10 hover:bg-white/20 transition backdrop-blur"
        >
          View Projects
        </Link>

        <Link
          to="/support-school"
          className="inline-flex items-center justify-center h-12 px-6 rounded-xl font-extrabold text-sm text-white 
                     bg-rose-500 hover:bg-rose-600 transition shadow-lg"
        >
          Donate Now
        </Link>

      </div>

    </div>
  </div>
</section>

   {/* IMPACT – PREMIUM VERSION */}
<section className="relative bg-white border-y border-slate-200">
  <div className={`mx-auto max-w-screen-2xl ${shellPad} py-16 sm:py-20`}>

    {/* Heading */}
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
        Impact & Success Stories
      </h2>
      <p className="mt-3 text-slate-600">
        Real change powered by generous donors like you.
      </p>
    </div>

    {/* Cards */}
    <div className="mt-14 grid md:grid-cols-3 gap-8">
      {impact.map((item) => (
        <div
          key={item.title}
          className="group relative rounded-3xl border border-slate-200 bg-white p-8 shadow-sm
                     hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
          {/* Accent glow */}
          <div className="absolute -top-6 -right-6 h-24 w-24 bg-rose-100/50 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition" />

          {/* Icon */}
          <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center">
            <i className={`${item.icon} text-2xl`} />
          </div>

          {/* Big stat */}
          <div className="mt-6 text-4xl font-extrabold bg-gradient-to-b from-rose-500 to-rose-700 bg-clip-text text-transparent">
            {item.stat}
          </div>

          {/* Title */}
          <div className="mt-2 text-lg font-extrabold text-slate-900">
            {item.title}
          </div>

          {/* Description */}
          <div className="mt-2 text-sm text-slate-600 leading-relaxed">
            {item.desc}
          </div>
        </div>
      ))}
    </div>

  </div>
</section>

   

   {/* CONTACT – PREMIUM */}
<section className="relative border-t border-slate-200 bg-white">
  <div className={`mx-auto max-w-screen-2xl ${shellPad} py-16 sm:py-20`}>

    {/* Heading */}
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
        Contact Us
      </h2>
      <p className="mt-3 text-slate-600">
        Have a question or want to partner? Send us a message.
      </p>
    </div>

    <div className="mt-12 grid lg:grid-cols-12 gap-6 items-stretch">

      {/* LEFT: Quick contact (UPDATED) */}
      <div className="lg:col-span-5">
        <div className="h-full rounded-3xl border border-slate-700 
                        bg-gradient-to-br from-[#0B1B3A] via-[#0E2148] to-[#0B1B3A] 
                        p-7 shadow-lg text-white">

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-extrabold">
                Quick contact
              </div>
              <div className="mt-1 text-sm text-slate-300">
                We usually reply within <span className="font-bold text-white">24–48 hours</span>.
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-white">
              Fast response
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {[
              { icon: "bx bx-envelope", label: "support@schooldonate.lk" },
              { icon: "bx bx-phone", label: "+94 7X XXX XXXX" },
              { icon: "bx bx-map", label: "Colombo, Sri Lanka" },
            ].map((x) => (
              <div
                key={x.label}
                className="flex items-center gap-3 rounded-2xl 
                           bg-white/5 border border-white/10 
                           px-4 py-3 hover:bg-white/10 transition"
              >
                <div className="h-10 w-10 rounded-2xl bg-white/10 grid place-items-center text-white">
                  <i className={`${x.icon} text-lg`} />
                </div>
                <div className="text-sm font-semibold">
                  {x.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-extrabold">
              For schools
            </div>
            <div className="mt-1 text-sm text-slate-300">
              If you’re a school, include your <span className="font-bold text-white">registration number</span> for faster verification.
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT: Form (unchanged) */}
      <div className="lg:col-span-7">
        <form className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 shadow-sm">

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-extrabold text-slate-900">
                Send a message
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Tell us what you need — we’ll get back soon.
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">
              <i className="bx bx-shield-quarter text-base" />
              Secure form
            </div>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-extrabold text-slate-700">Name</label>
              <input
                type="text"
                required
                placeholder="Your Name"
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none
                           focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700">Email</label>
              <input
                type="email"
                required
                placeholder="Your Email"
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none
                           focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-extrabold text-slate-700">Message</label>
            <textarea
              rows={6}
              required
              placeholder="Your Message"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none
                         focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition"
            />
            <div className="mt-2 text-xs text-slate-500">
              Don’t include passwords or sensitive info.
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <button
              type="submit"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-extrabold text-sm text-white
                         bg-rose-500 hover:bg-rose-600 transition shadow-sm"
            >
              Send Message
            </button>

            <div className="text-xs text-slate-500">
              By sending, you agree to be contacted back.
            </div>
          </div>

        </form>
      </div>

    </div>
  </div>
</section>
      <div className="h-6" />
    </div>
  );
};

export default Home;

function Stepper({ howItWorks }: { howItWorks: any[] }) {
  const [active, setActive] = React.useState(0);

  return (
    <div className="mt-10 max-w-6xl mx-auto">

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
        {howItWorks.map((s, i) => (
          <button
            key={s.title}
            onClick={() => setActive(i)}
            className={[
              "rounded-2xl border px-4 py-3 text-left transition",
              i === active
                ? "border-slate-400 bg-slate-100"
                : "border-slate-200 bg-white hover:bg-slate-50",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <div
               className={[
  "text-3xl font-extrabold leading-none transition",
  i === active
    ? "text-rose-500"
    : "text-slate-300",
].join(" ")}
              >
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  {s.title}
                </div>
                <div className="text-xs text-slate-500">
                  Step {i + 1}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Active Panel */}
      <div className="mt-6 relative rounded-[28px] overflow-hidden">

        {/* Background gradient (neutral) */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-white" />

        <div className="relative border border-slate-200 rounded-[28px] shadow-sm bg-white">
          <div className="grid lg:grid-cols-12 items-center">

            {/* LEFT CONTENT */}
            <div className="lg:col-span-6 p-10">

              {/* Step badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-extrabold">
                Step {active + 1}
              </div>

              <h3 className="mt-4 text-3xl font-extrabold text-slate-900 leading-tight">
                {howItWorks[active].title}
              </h3>

              <p className="mt-3 text-slate-600 leading-relaxed max-w-md">
                {howItWorks[active].desc}
              </p>

              {/* CTA */}
            <div className="mt-8 flex gap-3">
  <a
    href="/projects"
    className="h-11 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-sm inline-flex items-center justify-center transition shadow-sm"
  >
    Explore projects
  </a>

  <a
    href="/support-school"
    className="h-11 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-sm inline-flex items-center justify-center transition"
  >
    Donate now
  </a>
</div>
            </div>

            {/* RIGHT IMAGE */}
            <div className="lg:col-span-6 relative h-[320px] lg:h-[380px]">

              <img
                key={active}
                src={howItWorks[active].img}
                alt={howItWorks[active].title}
                className="absolute right-0 top-0 h-full w-auto max-w-none object-contain transition duration-700 ease-out"
              />

              {/* soft neutral glow */}
              <div className="absolute right-10 bottom-10 h-40 w-40 bg-slate-200/40 blur-3xl rounded-full" />
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}