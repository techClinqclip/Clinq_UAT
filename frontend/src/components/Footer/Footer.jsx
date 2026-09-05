import { Link } from "react-router-dom";
import {
  FaLinkedin,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const footerLinks = {
  Product: [
    { name: "Features", path: "/features" },
    { name: "Pricing", path: "/pricing" },
    { name: "FAQ", path: "/faq" },
  ],

  Company: [
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ],

  Resources: [
    { name: "Blog", path: "/blog" },
    { name: "Help Center", path: "/help" },
  ],

  Legal: [
    { name: "Privacy", path: "/privacy" },
    { name: "Terms", path: "/terms" },
  ],
};

const socials = [
  {
    icon: FaXTwitter,
    href: "#",
  },
  {
    icon: FaLinkedin,
    href: "#",
  },
  {
    icon: FaInstagram,
    href: "#",
  },
  {
    icon: FaYoutube,
    href: "#",
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#07070B]">
      <div className="mx-auto max-w-[1440px] px-6 py-16 md:px-10 md:py-24">

        {/* Top */}
        <div className="grid gap-14 lg:grid-cols-12">

          {/* Brand */}
          <div className="text-center lg:col-span-4 lg:text-left">

            <Link
              to="/"
              className="text-4xl md:text-5xl font-bold tracking-tight text-white"
            >
              Clinq<span className="text-violet-500">.</span>
            </Link>

            <p className="mx-auto mt-6 max-w-md text-base md:text-lg leading-8 text-zinc-400 lg:mx-0">
            Empowering creators, clippers, and brands to scale with viral short-form content.
            </p>

            {/* Socials */}
            <div className="mt-8 flex justify-center gap-4 lg:justify-start">
              {socials.map((item, index) => {
                const Icon = item.icon;

                return (
                  <a
                    key={index}
                    href={item.href}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-all duration-300 hover:border-violet-500 hover:bg-violet-500/10 hover:text-white"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-2 md:grid-cols-4 lg:col-span-8">

            {/* Product */}
            <div>
              <h3 className="mb-5 text-base font-semibold text-white">
                Product
              </h3>

              <div className="space-y-4">
                {footerLinks.Product.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="block text-sm text-zinc-400 transition hover:text-violet-400"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Company */}
            <div>
              <h3 className="mb-5 text-base font-semibold text-white">
                Company
              </h3>

              <div className="space-y-4">
                {footerLinks.Company.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="block text-sm text-zinc-400 transition hover:text-violet-400"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <h3 className="mb-5 text-base font-semibold text-white">
                Resources
              </h3>

              <div className="space-y-4">
                {footerLinks.Resources.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="block text-sm text-zinc-400 transition hover:text-violet-400"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="mb-5 text-base font-semibold text-white">
                Legal
              </h3>

              <div className="space-y-4">
                {footerLinks.Legal.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="block text-sm text-zinc-400 transition hover:text-violet-400"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Divider */}
        <div className="my-12 md:my-16 h-px bg-white/10" />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">

          <p className="text-sm text-zinc-500">
            © 2026 Clinq. All rights reserved.
          </p>

          <p className="text-sm text-zinc-500">
            Helping creators, clippers & brands grow together.
          </p>

        </div>

      </div>
    </footer>
  );
}