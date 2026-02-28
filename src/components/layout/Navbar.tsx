"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import logoWhite from "../../../public/logo-white.png";
import { useTheme } from "next-themes";
import { ModeToggle } from "../darkModeToggle";
import { ConnectButton, useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import navLinks from "@/constants/NavLinks";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const { resolvedTheme } = useTheme();
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const account = useCurrentAccount();
  const { data: balanceData, isLoading: isBalanceLoading } = useSuiClientQuery(
    "getBalance",
    { owner: account?.address ?? "", coinType: "0x2::sui::SUI" },
    { enabled: !!account?.address }
  );

  const formatSuiBalance = (mist?: string) => {
    if (!mist) return "0.000";
    const amount = BigInt(mist);
    const whole = amount / 1_000_000_000n;
    const fraction = amount % 1_000_000_000n;
    const fractionStr = fraction.toString().padStart(9, "0").slice(0, 3);
    return `${whole.toString()}.${fractionStr}`;
  };

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
            className="hidden min-[900px]:flex absolute left-1/2 transform -translate-x-1/2 space-x-6 xl:space-x-8 text-md text-center px-6 xl:px-8 py-2 rounded-full bg-opacity-[10%] bg-black"
            style={{ fontFamily: "var(--font-bebas-nueue)" }}
          >
            {navLinks.map(({ label, href }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={label}
                  href={href}
                  className={`hover:text-neutral-400 transition-all duration-200 ${
                    isActive
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
          <div className="hidden min-[970px]:flex items-center space-x-3 min-[900px]:space-x-4 flex-shrink-0 min-w-[200px] justify-end">
            {account?.address && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-700">
                <span className="text-sm font-medium text-black dark:text-white">
                  {isBalanceLoading
                    ? "..."
                    : `${formatSuiBalance(balanceData?.totalBalance)} SUI`}
                </span>
              </div>
            )}
            <ConnectButton />
            <ModeToggle />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="max-[980px]:block hidden p-2 rounded text-white hover:bg-neutral-800 transition-colors"
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
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-64 bg-black shadow-xl">
            <div className="flex flex-col h-full">
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between p-4">
                <span className="text-white font-medium">Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded text-white hover:bg-neutral-800"
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
                          isActive
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

              {/* Mobile Wallet & Theme */}
              <div className="p-3 space-y-3">
                {account?.address && (
                  <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-neutral-700 bg-white dark:bg-neutral-900">
                    <span className="text-sm font-medium text-black dark:text-white">
                      {isBalanceLoading
                        ? "Loading..."
                        : `${formatSuiBalance(balanceData?.totalBalance)} SUI`}
                    </span>
                  </div>
                )}
                <ConnectButton />
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