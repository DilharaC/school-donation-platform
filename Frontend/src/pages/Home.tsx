// Home.tsx (FULL UPDATED) — SchoolRegisterModal linked correctly
import React from "react";
import { Link } from "react-router-dom";
import heroImage from "../uploads/images/school-children-dressed-uniform-have-fun-play-schoolyard.jpg";
import axios from "axios";
import SchoolRegisterModal from "../components/SchoolRegisterModal";

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

  const API_BASE = "http://localhost:8000/api";

  const [form, setForm] = React.useState({
    name: "",
    email: "",
    message: "",
  });

  const [sending, setSending] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [openSchoolRegister, setOpenSchoolRegister] = React.useState(false);

  React.useEffect(() => {
    if (!successMsg) return;

    const timer = setTimeout(() => {
      setSuccessMsg("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMsg]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await axios.post(`${API_BASE}/contact-messages`, form);

      if (res.data?.success) {
        setSuccessMsg("Your message has been sent successfully.");
        setForm({ name: "", email: "", message: "" });
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        setErrorMsg(error.response.data.message);
      } else if (error.response?.data?.errors) {
        const firstError = Object.values(error.response.data.errors)[0];
        setErrorMsg(Array.isArray(firstError) ? firstError[0] : "Validation error.");
      } else {
        setErrorMsg("Failed to send message. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  const impact = [
    {
      icon: "bx bx-award",
      stat: "100+",
      title: "Students Supported",
      desc: "Students received scholarships last year.",
    },
    {
      icon: "bx bx-building-house",
      stat: "5",
      title: "Schools Renovated",
      desc: "Learning environments improved with your help.",
    },
    {
      icon: "bx bx-laptop",
      stat: "200+",
      title: "Digital Devices Donated",
      desc: "Students equipped with computers and tablets.",
    },
  ];

  const shellPad = "px-6 sm:px-12 lg:px-20 xl:px-32";

  return (
    <>
      <div className="bg-white">
        {/* HERO */}
        <section className="relative flex min-h-[75vh] w-full items-center overflow-hidden">
          <div
            className="absolute inset-0 scale-[1.03] bg-cover bg-center will-change-transform"
            style={{ backgroundImage: `url(${heroImage})` }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-900/30 to-slate-950/15" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-950/25 to-slate-950/45" />
          <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,rgba(2,6,23,0.35)_0%,rgba(2,6,23,0.15)_40%,rgba(2,6,23,0.0)_70%)]" />

          <div className={`relative w-full ${shellPad} py-12 sm:py-16 lg:py-20`}>
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold text-white backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Transparent donations • Verified schools
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white drop-shadow sm:text-5xl">
                Help Under-Resourced Schools
              </h1>

              <p className="mt-4 text-base leading-relaxed text-white/90 sm:text-lg">
                Connecting donors directly with schools in Sri Lanka for transparent, accountable support.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={() => setOpenSchoolRegister(true)}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-500 px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-rose-600"
                >
                  Register Your School
                </button>

                <Link
                  to="/projects"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-6 text-sm font-extrabold text-white transition backdrop-blur hover:bg-white/10"
                >
                  Explore Projects
                </Link>
              </div>

              <div className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-3">
                {[
                  { label: "Verified Schools", value: "120+" },
                  { label: "Donors", value: "2,400+" },
                  { label: "Projects Funded", value: "310+" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white shadow-lg shadow-black/20 backdrop-blur-md transition hover:bg-white/15"
                  >
                    <div className="text-xl font-extrabold">{s.value}</div>
                    <div className="mt-1 text-[11px] text-white/90">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs font-extrabold text-white/80">
                Scroll to learn more <i className="bx bx-down-arrow-alt text-lg" />
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT */}
       <section id="about" className={`mx-auto max-w-screen-2xl ${shellPad} py-14 sm:py-18`}>
          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Every Child, Every Classroom
              </h2>

              <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">
                We bridge the gap between donors and schools to create brighter, more equal opportunities for learning —
                with transparency, accountability, and real-world proof.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {["Verified schools", "Receipts & evidence", "Progress updates", "Fair distribution"].map((x) => (
                  <span
                    key={x}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {x}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/projects"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-500 px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-rose-600"
                >
                  Explore projects
                </Link>
                <Link
                  to="/projects"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 px-6 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50"
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

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {[
                    { title: "Verified schools", desc: "Profiles reviewed before listing.", icon: "bx bx-badge-check" },
                    { title: "Evidence uploads", desc: "Receipts & photos after delivery.", icon: "bx bx-receipt" },
                    { title: "Progress updates", desc: "Milestones posted for every request.", icon: "bx bx-timer" },
                  ].map((b) => (
                    <div key={b.title} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-100 text-rose-700">
                        <i className={`${b.icon} text-xl`} />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">{b.title}</div>
                        <div className="mt-1 text-xs text-slate-600">{b.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-y border-slate-200 bg-white">
          <div className={`mx-auto max-w-screen-2xl ${shellPad} py-16 sm:py-20`}>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">How It Works</h2>
              <p className="mt-3 text-slate-600">Simple steps. Clear outcomes. Real change.</p>
            </div>

            <Stepper howItWorks={howItWorks} />
          </div>
        </section>

        {/* DONATE CTA */}
        <section className="w-full bg-gradient-to-br from-[#0B1B3A] via-[#0E2148] to-[#0B1B3A] py-16 sm:py-20">
          <div className={`mx-auto max-w-screen-2xl ${shellPad}`}>
            <div className="grid items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-white backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Verified projects • Transparent reporting
                </div>

                <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Make a Donation
                </h2>

                <p className="mt-4 max-w-2xl leading-relaxed text-white/80">
                  Your support makes a real difference. Choose a project or donate to general funds with clear allocation.
                </p>
              </div>

              <div className="flex gap-3 lg:col-span-4 lg:justify-end">
                <Link
                  to="/projects"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 text-sm font-extrabold text-white transition backdrop-blur hover:bg-white/20"
                >
                  View Projects
                </Link>

                <Link
                  to="/projects"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-rose-500 px-6 text-sm font-extrabold text-white shadow-lg transition hover:bg-rose-600"
                >
                  Donate Now
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* IMPACT */}
        <section className="relative border-y border-slate-200 bg-white">
          <div className={`mx-auto max-w-screen-2xl ${shellPad} py-16 sm:py-20`}>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Impact & Success Stories
              </h2>
              <p className="mt-3 text-slate-600">Real change powered by generous donors like you.</p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {impact.map((item) => (
                <div
                  key={item.title}
                  className="group relative rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-100/50 blur-2xl opacity-0 transition group-hover:opacity-100" />

                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                    <i className={`${item.icon} text-2xl`} />
                  </div>

                  <div className="mt-6 bg-gradient-to-b from-rose-500 to-rose-700 bg-clip-text text-4xl font-extrabold text-transparent">
                    {item.stat}
                  </div>

                  <div className="mt-2 text-lg font-extrabold text-slate-900">{item.title}</div>

                  <div className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
      <section id="contact" className="relative border-t border-slate-200 bg-white">
          <div className={`mx-auto max-w-screen-2xl ${shellPad} py-16 sm:py-20`}>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Contact Us</h2>
              <p className="mt-3 text-slate-600">Have a question or want to partner? Send us a message.</p>
            </div>

            <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="h-full rounded-3xl border border-slate-700 bg-gradient-to-br from-[#0B1B3A] via-[#0E2148] to-[#0B1B3A] p-7 text-white shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-extrabold">Quick contact</div>
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
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                      >
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-white">
                          <i className={`${x.icon} text-lg`} />
                        </div>
                        <div className="text-sm font-semibold">{x.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-extrabold">For schools</div>
                    <div className="mt-1 text-sm text-slate-300">
                      If you’re a school, include your{" "}
                      <span className="font-bold text-white">registration number</span> for faster verification.
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <form
                  onSubmit={handleContactSubmit}
                  className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-extrabold text-slate-900">Send a message</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Tell us what you need — we’ll get back soon.
                      </div>
                    </div>

                    <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700 sm:inline-flex">
                      <i className="bx bx-shield-quarter text-base" />
                      Secure form
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-extrabold text-slate-700">Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Your Name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700">Email</label>
                      <input
                        type="email"
                        required
                        placeholder="Your Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-xs font-extrabold text-slate-700">Message</label>

                    {successMsg && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {successMsg}
                      </div>
                    )}

                    {errorMsg && (
                      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {errorMsg}
                      </div>
                    )}

                    <textarea
                      rows={6}
                      required
                      placeholder="Your Message"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300"
                    />
                    <div className="mt-2 text-xs text-slate-500">Don’t include passwords or sensitive info.</div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="submit"
                      disabled={sending}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-500 px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                    >
                      {sending ? "Sending..." : "Send Message"}
                    </button>

                    <div className="text-xs text-slate-500">By sending, you agree to be contacted back.</div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        <div className="h-6" />
      </div>

      <SchoolRegisterModal
        open={openSchoolRegister}
        onClose={() => setOpenSchoolRegister(false)}
      />
    </>
  );
};

export default Home;

function Stepper({ howItWorks }: { howItWorks: any[] }) {
  const [active, setActive] = React.useState(0);

  return (
    <div className="mx-auto mt-10 max-w-6xl">
      <div className="flex flex-col justify-center gap-2 sm:flex-row sm:gap-3">
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
                  i === active ? "text-rose-500" : "text-slate-300",
                ].join(" ")}
              >
                {i + 1}
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900">{s.title}</div>
                <div className="text-xs text-slate-500">Step {i + 1}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="relative mt-6 overflow-hidden rounded-[28px]">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-white" />

        <div className="relative rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="grid items-center lg:grid-cols-12">
            <div className="p-10 lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">
                Step {active + 1}
              </div>

              <h3 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900">
                {howItWorks[active].title}
              </h3>

              <p className="mt-3 max-w-md leading-relaxed text-slate-600">
                {howItWorks[active].desc}
              </p>

              <div className="mt-8 flex gap-3">
                <Link
                  to="/projects"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-500 px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-rose-600"
                >
                  Explore projects
                </Link>

                <Link
                  to="/support-school"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-100 px-6 text-sm font-extrabold text-slate-900 transition hover:bg-slate-200"
                >
                  Donate now
                </Link>
              </div>
            </div>

            <div className="relative h-[320px] lg:col-span-6 lg:h-[380px]">
              <img
                key={active}
                src={howItWorks[active].img}
                alt={howItWorks[active].title}
                className="absolute right-0 top-0 h-full w-auto max-w-none object-contain transition duration-700 ease-out"
              />

              <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-slate-200/40 blur-3xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}