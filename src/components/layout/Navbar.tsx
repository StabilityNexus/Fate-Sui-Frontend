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

  if (!isThemeReady) return null;

  return (
    <>
      <header className={`justify-between p-2 sm:p-3 sticky top-0 z-50 shadow-lg ${
        resolvedTheme === "dark" 
          ? "bg-black border-b border-white/10 shadow-black/50" 
          : "bg-white border-b border-black/10 shadow-black/20"
      }`}>
        <div className="mx-auto flex items-center justify-between relative px-3 sm:px-5">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/">
              <div className="text-center">
                <Image
                  src={logoWhite}
                  alt="Fate Protocol"
                  width={40}
                  height={40}
                  className={`sm:w-[50px] sm:h-[50px] p-2 transition-all ${
                    resolvedTheme === "light" ? "invert" : ""
                  }`}
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav
            className={`hidden min-[900px]:flex absolute left-1/2 transform -translate-x-1/2 space-x-6 xl:space-x-8 text-md text-center px-6 xl:px-8 py-2 rounded-full shadow-xl ${
              resolvedTheme === "dark"
                ? "bg-black border border-white/20 shadow-black/30"
                : "bg-white border border-black/20 shadow-black/20"
            }`}
            style={{ fontFamily: "var(--font-bebas-nueue)" }}
          >
            {navLinks.map(({ label, href }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={label}
                  href={href}
                  className={`transition-all duration-200 ${
                    resolvedTheme === "dark"
                      ? isActive
                        ? "border-b-2 border-white pb-1 text-white"
                        : "text-neutral-300 hover:text-neutral-400"
                      : isActive
                      ? "border-b-2 border-black pb-1 text-black font-semibold"
                      : "text-neutral-700 hover:text-neutral-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Wallet & Theme */}
          <div className="hidden min-[970px]:flex items-center space-x-3 min-[900px]:space-x-4 flex-shrink-0 min-w-[200px] justify-end">
            <ConnectButton
              className={`font-medium rounded-full transition-colors text-sm ${
                resolvedTheme === "dark"
                  ? "bg-white text-black hover:bg-neutral-200"
                  : "bg-black text-white hover:bg-neutral-200"
              }`}
            >
              Connect Wallet
            </ConnectButton>
            <ModeToggle />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`max-[980px]:block hidden p-2 rounded transition-colors ${
              resolvedTheme === "dark"
                ? "text-white hover:bg-neutral-800"
                : "text-black hover:bg-neutral-200"
            }`}
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
        <div className="fixed inset-0 z-40 max-[699px]:block hidden">
          <div
            className={`fixed inset-0 backdrop-blur-sm ${
              resolvedTheme === "dark" ? "bg-black/90" : "bg-black/40"
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className={`fixed top-0 right-0 h-full w-64 shadow-2xl ${
            resolvedTheme === "dark"
              ? "bg-black border-l border-white/20"
              : "bg-white shadow-black/30 border-l border-black/20"
          }`}>
            <div className="flex flex-col h-full">
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between p-4">
                <span className={`font-medium ${
                  resolvedTheme === "dark" ? "text-white" : "text-black"
                }`}>Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`p-1 rounded ${
                    resolvedTheme === "dark"
                      ? "text-white hover:bg-neutral-800"
                      : "text-black hover:bg-neutral-200"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex-1 px-4 py-2">
                <div className="space-y-2">
                  {navLinks.map(({ label, href }) => {
                    const isActive = pathname === href;
                    return (
                      <Link
                        key={label}
                        href={href}
                        className={`block px-4 py-2 rounded text-md transition-all duration-200 ${
                          resolvedTheme === "dark"
                            ? isActive
                              ? "border-b-2 border-white pb-1 text-white bg-neutral-800"
                              : "text-neutral-300 hover:text-neutral-400 hover:bg-neutral-800"
                            : isActive
                            ? "border-b-2 border-black pb-1 text-black bg-neutral-200 font-semibold"
                            : "text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200"
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

              {/* Mobile Wallet & Theme */}
              <div className="p-3 space-y-2">
                <ConnectButton
                  className={`w-full font-medium rounded-full transition-colors text-sm py-2 ${
                    resolvedTheme === "dark"
                      ? "bg-white text-black hover:bg-neutral-200"
                      : "bg-black text-white hover:bg-neutral-200"
                  }`}
                >
                  Connect Wallet
                </ConnectButton>
                <div className="flex justify-center">
                  <ModeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;