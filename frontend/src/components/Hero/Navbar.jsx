import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { name: "Pricing", href: "/pricing" },
    { name: "Blog", href: "/blog" },
    { name: "About", href: "/about" },
  ];

  return (
    <>
      {/* Desktop Navbar */}
      <header className="fixed top-0 left-0 z-50 w-full px-4 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-6 py-4 backdrop-blur-xl">

          {/* Logo */}
          <Link
            to="/"
            className="text-3xl font-bold tracking-tight text-white"
          >
            Clinq<span className="text-violet-500">.</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-10 lg:flex">
            {navLinks.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden items-center gap-4 lg:flex">
            <Link
              to="/login"
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:border-violet-500"
            >
              Sign In
            </Link>

            <Link
              to="/signup"
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Get Started
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-xl border border-white/10 p-2 text-white lg:hidden"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* ================= MOBILE OVERLAY ================= */}

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] bg-[#07070B]/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex h-full flex-col px-8 py-8">

              {/* Top */}
              <div className="flex items-center justify-between">

                <Link
                  to="/"
                  className="text-3xl font-bold text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Clinq<span className="text-violet-500">.</span>
                </Link>

                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10"
                >
                  <X className="text-white" size={24} />
                </button>
              </div>

              {/* Navigation */}
              <div className="mt-20 flex flex-col">

                {navLinks.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="group flex items-center justify-between border-b border-white/5 py-6 text-3xl font-semibold text-white"
                  >
                    {item.name}

                    <ArrowRight
                      size={24}
                      className="transition-transform group-hover:translate-x-2"
                    />
                  </Link>
                ))}

              </div>

              {/* Bottom */}
              <div className="mt-auto">

                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-2xl border border-white/10 py-4 text-center text-lg font-medium text-white"
                >
                  Sign In
                </Link>

                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-violet-600 py-4 text-lg font-semibold text-white transition hover:bg-violet-500"
                >
                  Get Started
                  <ArrowRight size={18} />
                </Link>

                <div className="mt-12 border-t border-white/10 pt-6">

                  <p className="text-center text-sm text-zinc-500">
                    Built for creators, clippers & brands.
                  </p>

                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}