"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { APP_STORE_URL, WEB_APP_URL } from "./config";
import { AppleLogo } from "./apple-logo";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "Everything", href: "#bento" },
  { label: "For Trainers", href: "#trainers" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-white/8 bg-bg/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Ares Fitness" width={34} height={34} className="h-8 w-auto" />
          <span className="font-display text-lg font-extrabold tracking-tight text-white">
            ARES <span className="text-accent">FITNESS</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-text-2 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href={WEB_APP_URL}
            className="text-sm font-semibold text-text-2 transition-colors hover:text-white"
          >
            Log in
          </Link>
          <a
            href={APP_STORE_URL}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            <AppleLogo className="h-4 w-4" /> Get the app
          </a>
        </div>

        <button
          onClick={() => setMenu((m) => !m)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle text-white md:hidden"
          aria-label="Menu"
        >
          {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menu && (
        <div className="border-t border-white/8 bg-bg/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenu(false)}
                className="rounded-xl px-3 py-3 text-base font-semibold text-white hover:bg-surface"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link
                href={WEB_APP_URL}
                onClick={() => setMenu(false)}
                className="rounded-xl border border-border-subtle px-3 py-3 text-center text-base font-semibold text-white"
              >
                Log in
              </Link>
              <a
                href={APP_STORE_URL}
                onClick={() => setMenu(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-3 text-base font-bold text-white"
              >
                <AppleLogo className="h-5 w-5" /> Get the app
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
