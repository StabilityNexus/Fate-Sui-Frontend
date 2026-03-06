"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import logoWhite from "../../../public/logo-white.png";
import { useTheme } from "next-themes";
import { ModeToggle } from "../darkModeToggle";
import { ConnectButton } from "@suiet/wallet-kit";
import "@suiet/wallet-kit/style.css";
import navLinks from "@/constants/NavLinks";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const { resolvedTheme } = useTheme();
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (resolvedTheme) {
      setIsThemeReady(true);
    }
  }, [resolvedTheme]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu when viewport crosses the lg breakpoint (1024px)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsMobileMenuOpen(false);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  if (!isThemeReady) return null;

  return (
    <>
      <header className="justify-between p-2 sm:p-3 bg-black sticky top-0 z-50">
        <div className="mx-auto flex items-center justify-between relative px-3 sm:px-5 bg-black">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/">
              <div className="text-center">
                <Image
                  src={logoWhite}
                  alt="Fate Protocol"
                  width={40}
                  height={40}
                  className="sm:w-[50px] sm:h-[50px] p-2"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav
            className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2 space-x-6 xl:space-x-8 text-md text-center px-6 xl:px-8 py-2 rounded-full bg-opacity-[10%] bg-black"
            style={{ fontFamily: "var(--font-bebas-nueue)" }}
          >
            {navLinks.map(({ label, href }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={label}
                  href={href}
                  className={`hover:text-neutral-400 transition-all duration-200 ${isActive
                    ? "border-b-2 border-white pb-1 text-white"
                    : "text-neutral-300"
                    }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Wallet & Theme */}
          <div className="hidden lg:flex items-center space-x-4 flex-shrink-0 justify-end ml-auto wkit-desktop-wrapper">
            <ConnectButton />
            <ModeToggle />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden block p-2 rounded text-white hover:bg-neutral-800 transition-colors"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 h-[100dvh] w-[280px] sm:w-80 bg-black shadow-xl border-l border-neutral-800 flex flex-col overflow-y-auto">
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <span className="text-white font-medium">Menu</span>
              <div className="flex items-center space-x-2">
                <ModeToggle />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded text-white hover:bg-neutral-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 px-4 py-2 flex flex-col">
              <div className="space-y-2">
                {navLinks.map(({ label, href }) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={label}
                      href={href}
                      className={`block px-4 py-2 rounded text-md transition-all duration-200 ${isActive
                        ? "border-b-2 border-white pb-1 text-white bg-neutral-800"
                        : "text-neutral-300 hover:text-neutral-400 hover:bg-neutral-800"
                        }`}
                      style={{ fontFamily: "var(--font-bebas-nueue)" }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Mobile Wallet */}
            <div className="wkit-mobile-wrapper p-4 border-t border-neutral-800">
              <ConnectButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;